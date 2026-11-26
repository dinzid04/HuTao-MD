package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/polymorfa/hypermeow"
	"github.com/polymorfa/hypermeow/proto/waCompanionReg"
	"github.com/polymorfa/hypermeow/store"
	"github.com/polymorfa/hypermeow/store/sqlstore"
	"github.com/polymorfa/hypermeow/types"
	"github.com/polymorfa/hypermeow/types/events"
	waLog "github.com/polymorfa/hypermeow/util/log"
	meowcaller "github.com/purpshell/meowcaller"
	"github.com/purpshell/meowcaller/rtp"
	"github.com/rs/zerolog"
	"google.golang.org/protobuf/proto"

	_ "modernc.org/sqlite"
)

const (
	bridgeVersion          = "2.3.0"
	maxInitialGroupTargets = 8
)

var nonDigitsRe = regexp.MustCompile(`[^0-9]`)

type trackItem struct {
	Title       string
	Mode        string
	Quality     string
	RequestedBy string
	ChatJID     string
	AudioPath   string
	H264Path    string
	FPS         int
	AccessUnits [][]byte
	IDRIndices  []int
}

func cleanupTrackFiles(t *trackItem) {
	if t == nil {
		return
	}
	if t.H264Path != "" {
		_ = os.Remove(t.H264Path)
	}
	if t.AudioPath != "" {
		_ = os.Remove(t.AudioPath)
	}
}

type activeSession struct {
	mu                  sync.Mutex
	id                  string
	title               string
	mode                string
	callType            string
	screenShare         bool
	quality             string
	requestedBy         string
	chatJID             string
	linkURL             string
	target              string
	groupJID            string
	selfLID             string
	fps                 int
	loop                bool
	hadQueue            bool
	trackSeq            int
	trackGen            uint64
	lastRemoteConnected int
	startedAt           time.Time
	connectedAt         time.Time
	connected           bool
	call                *meowcaller.Call
	player              *meowcaller.Player
	current             *trackItem
	queue               []*trackItem
	videoStopCh         chan struct{}
	stopCh              chan struct{}
	stopOnce            sync.Once
	streamOnce          sync.Once
	forceIDR            int32
	cleanupOnce         sync.Once
}

func (s *activeSession) stop() {
	s.stopOnce.Do(func() {
		close(s.stopCh)
	})
	s.mu.Lock()
	if s.videoStopCh != nil {
		close(s.videoStopCh)
		s.videoStopCh = nil
	}
	p := s.player
	s.trackGen++
	s.mu.Unlock()
	if p != nil {
		p.Stop()
	}
}

func (s *activeSession) cleanupFiles() {
	s.cleanupOnce.Do(func() {
		s.mu.Lock()
		cur := s.current
		q := s.queue
		s.current = nil
		s.queue = nil
		s.mu.Unlock()

		cleanupTrackFiles(cur)
		for _, item := range q {
			cleanupTrackFiles(item)
		}
	})
}

func (s *activeSession) snapshot() map[string]any {
	s.mu.Lock()
	defer s.mu.Unlock()

	qSnap := make([]map[string]any, 0, len(s.queue))
	for i, item := range s.queue {
		qSnap = append(qSnap, map[string]any{
			"position":    i + 2,
			"title":       item.Title,
			"mode":        item.Mode,
			"quality":     item.Quality,
			"requestedBy": item.RequestedBy,
			"chatJid":     item.ChatJID,
		})
	}

	return map[string]any{
		"callId":      s.id,
		"title":       s.title,
		"mode":        s.mode,
		"callType":    s.callType,
		"screenShare": s.screenShare,
		"quality":     s.quality,
		"requestedBy": s.requestedBy,
		"chatJid":     s.chatJID,
		"linkUrl":     s.linkURL,
		"target":      s.target,
		"groupJid":    s.groupJID,
		"fps":         s.fps,
		"loop":        s.loop,
		"connected":   s.connected,
		"trackSeq":    s.trackSeq,
		"queueLength": len(s.queue),
		"queue":       qSnap,
		"elapsedSec":  int(time.Since(s.startedAt).Seconds()),
	}
}

type bridgeServer struct {
	mu           sync.Mutex
	callCreateMu sync.Mutex
	ctx          context.Context
	dbPath       string
	token        string
	logger       zerolog.Logger
	container    *sqlstore.Container
	wa           *whatsmeow.Client
	mc           *meowcaller.Client
	sessions     map[string]*activeSession
	pairing      bool
}

func newBridgeServer(ctx context.Context, dbPath, token string, logger zerolog.Logger) (*bridgeServer, error) {
	b := &bridgeServer{
		ctx:      ctx,
		dbPath:   dbPath,
		token:    token,
		logger:   logger,
		sessions: make(map[string]*activeSession),
	}
	if err := b.initWhatsAppClient(true); err != nil {
		return nil, err
	}
	return b, nil
}

func (b *bridgeServer) initWhatsAppClient(autoConnectIfLoggedIn bool) error {
	if err := os.MkdirAll(filepath.Dir(b.dbPath), 0o755); err != nil {
		return err
	}

	store.DeviceProps.Os = proto.String("Linux")
	store.DeviceProps.PlatformType = waCompanionReg.DeviceProps_CHROME.Enum()

	dsn := fmt.Sprintf("file:%s?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)", b.dbPath)
	container, err := sqlstore.New(b.ctx, "sqlite", dsn, waLog.Zerolog(b.logger.Level(zerolog.WarnLevel)).Sub("db"))
	if err != nil {
		return fmt.Errorf("open sqlite store: %w", err)
	}
	device, err := container.GetFirstDevice(b.ctx)
	if err != nil {
		return fmt.Errorf("get first device: %w", err)
	}

	wa := whatsmeow.NewClient(device, waLog.Zerolog(b.logger.Level(zerolog.WarnLevel)).Sub("wa"))
	mc := meowcaller.NewClient(wa, meowcaller.WithLogger(b.logger))

	wa.AddEventHandler(func(evt any) {
		switch e := evt.(type) {
		case *events.PairSuccess:
			b.logger.Info().Str("jid", e.ID.String()).Msg("caller device paired successfully")
			b.mu.Lock()
			b.pairing = false
			b.mu.Unlock()
		case *events.Connected:
			b.logger.Info().Msg("caller websocket connected")
			_ = wa.SendPresence(context.Background(), types.PresenceAvailable)
		case *events.LoggedOut:
			b.logger.Warn().Any("reason", e.Reason).Msg("caller device logged out")
		}
	})

	b.mu.Lock()
	b.container = container
	b.wa = wa
	b.mc = mc
	b.mu.Unlock()

	if autoConnectIfLoggedIn && wa.Store.ID != nil {
		if err := wa.Connect(); err != nil {
			b.logger.Warn().Err(err).Msg("initial connect failed (will retry on demand)")
		}
	}
	return nil
}

func (b *bridgeServer) ensureConnected() error {
	b.mu.Lock()
	wa := b.wa
	b.mu.Unlock()
	if wa == nil || wa.Store == nil || wa.Store.ID == nil {
		return errors.New("akun caller belum dipairing; jalankan .callpair <nomor> terlebih dahulu")
	}
	if !wa.IsConnected() {
		if err := wa.Connect(); err != nil {
			return fmt.Errorf("gagal menghubungkan akun caller: %w", err)
		}
		deadline := time.Now().Add(8 * time.Second)
		for time.Now().Before(deadline) {
			if wa.IsLoggedIn() {
				break
			}
			time.Sleep(250 * time.Millisecond)
		}
	}
	return nil
}

func (b *bridgeServer) activeSnapshots() []map[string]any {
	b.mu.Lock()
	defer b.mu.Unlock()
	out := make([]map[string]any, 0, len(b.sessions))
	for _, s := range b.sessions {
		out = append(out, s.snapshot())
	}
	return out
}

func (b *bridgeServer) findActiveSession(callID string) *activeSession {
	b.mu.Lock()
	defer b.mu.Unlock()
	if strings.TrimSpace(callID) != "" {
		return b.sessions[strings.TrimSpace(callID)]
	}
	for _, s := range b.sessions {
		return s
	}
	return nil
}

func (b *bridgeServer) removeSession(callID string) {
	b.mu.Lock()
	s, ok := b.sessions[callID]
	if ok {
		delete(b.sessions, callID)
	}
	b.mu.Unlock()
	if ok && s != nil {
		s.stop()
		s.cleanupFiles()
	}
}

func (b *bridgeServer) stopAllSessions() int {
	b.mu.Lock()
	list := make([]*activeSession, 0, len(b.sessions))
	for _, s := range b.sessions {
		list = append(list, s)
	}
	b.sessions = make(map[string]*activeSession)
	b.mu.Unlock()

	for _, s := range list {
		s.stop()
		if s.call != nil {
			if s.screenShare {
				_ = s.call.StopScreenShare()
			}
			_ = s.call.Hangup()
		}
		s.cleanupFiles()
	}
	return len(list)
}

func (b *bridgeServer) authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if b.token != "" {
			got := r.Header.Get("X-Call-Token")
			if got == "" {
				got = r.Header.Get("X-Shiki-Token")
			}
			if got != b.token {
				writeJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "unauthorized"})
				return
			}
		}
		next(w, r)
	}
}

func (b *bridgeServer) handleHealth(w http.ResponseWriter, _ *http.Request) {
	b.mu.Lock()
	wa := b.wa
	pairing := b.pairing
	b.mu.Unlock()

	jid := ""
	loggedIn := false
	connected := false
	if wa != nil && wa.Store != nil && wa.Store.ID != nil {
		jid = wa.Store.ID.String()
		loggedIn = true
		connected = wa.IsConnected()
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":          true,
		"ready":       true,
		"version":     bridgeVersion,
		"features":    []string{"link", "direct", "group", "queue", "skip", "screenshare", "invite"},
		"loggedIn":    loggedIn,
		"connected":   connected,
		"pairing":     pairing,
		"jid":         jid,
		"activeCalls": b.activeSnapshots(),
	})
}

func (b *bridgeServer) handlePair(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	var req struct {
		Phone string `json:"phone"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid json"})
		return
	}
	phone := normalizePhone(req.Phone)
	if len(phone) < 8 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "nomor WhatsApp tidak valid (contoh: 62812xxxx)"})
		return
	}

	b.stopAllSessions()

	b.mu.Lock()
	if b.wa != nil {
		b.wa.Disconnect()
	}
	b.mu.Unlock()

	_ = os.Remove(b.dbPath)
	_ = os.Remove(b.dbPath + "-wal")
	_ = os.Remove(b.dbPath + "-shm")

	if err := b.initWhatsAppClient(false); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": err.Error()})
		return
	}

	b.mu.Lock()
	wa := b.wa
	b.pairing = true
	b.mu.Unlock()

	qrChan, _ := wa.GetQRChannel(b.ctx)
	if err := wa.Connect(); err != nil {
		b.mu.Lock()
		b.pairing = false
		b.mu.Unlock()
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": fmt.Sprintf("connect gagal: %v", err)})
		return
	}

	if qrChan != nil {
		select {
		case <-qrChan:
		case <-time.After(2 * time.Second):
		}
		go func() {
			for range qrChan {
			}
		}()
	} else {
		time.Sleep(1500 * time.Millisecond)
	}

	pairCtx, cancel := context.WithTimeout(b.ctx, 25*time.Second)
	defer cancel()
	code, err := wa.PairPhone(pairCtx, phone, true, whatsmeow.PairClientChrome, "Chrome (Linux)")
	if err != nil {
		b.mu.Lock()
		b.pairing = false
		b.mu.Unlock()
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": fmt.Sprintf("gagal membuat pairing code: %v", err)})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":    true,
		"phone": phone,
		"code":  code,
	})
}

func (b *bridgeServer) handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	b.stopAllSessions()
	b.mu.Lock()
	wa := b.wa
	b.pairing = false
	b.mu.Unlock()

	if wa != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		_ = wa.Logout(ctx)
		cancel()
		wa.Disconnect()
	}
	_ = os.Remove(b.dbPath)
	_ = os.Remove(b.dbPath + "-wal")
	_ = os.Remove(b.dbPath + "-shm")
	_ = b.initWhatsAppClient(false)

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "message": "caller session cleared"})
}

func (b *bridgeServer) handleStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	var req struct {
		CallID string `json:"callId"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	if strings.TrimSpace(req.CallID) != "" {
		b.mu.Lock()
		s := b.sessions[req.CallID]
		delete(b.sessions, req.CallID)
		b.mu.Unlock()
		if s == nil {
			writeJSON(w, http.StatusOK, map[string]any{"ok": true, "stopped": 0})
			return
		}
		s.stop()
		if s.call != nil {
			if s.screenShare {
				_ = s.call.StopScreenShare()
			}
			_ = s.call.Hangup()
		}
		s.cleanupFiles()
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "stopped": 1})
		return
	}

	stopped := b.stopAllSessions()
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "stopped": stopped})
}

func (b *bridgeServer) handleInvite(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	var req struct {
		CallID  string   `json:"callId"`
		Targets []string `json:"targets"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid json"})
		return
	}
	sess := b.findActiveSession(req.CallID)
	if sess == nil || sess.call == nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "tidak ada panggilan aktif"})
		return
	}
	ctx, cancel := context.WithTimeout(b.ctx, 20*time.Second)
	defer cancel()

	invited := 0
	var errs []string
	for _, raw := range req.Targets {
		t := strings.TrimSpace(raw)
		if t == "" {
			continue
		}
		if !strings.Contains(t, "@") {
			d := normalizePhone(t)
			if len(d) < 8 {
				continue
			}
			t = "+" + d
		}
		if err := sess.call.AddParticipant(ctx, t); err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "already") {
				if rErr := sess.call.RingParticipant(ctx, t); rErr == nil {
					invited++
					continue
				}
			}
			errs = append(errs, fmt.Sprintf("%s: %v", t, err))
		} else {
			invited++
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"invited": invited,
		"errors":  errs,
	})
}

type groupTargetResolution struct {
	Targets        []string
	SenderIncluded bool
	CallerInGroup  bool
	GroupChecked   bool
}

func (b *bridgeServer) resolveGroupTargetsPrioritized(
	ctx context.Context,
	wa *whatsmeow.Client,
	groupJID string,
	priorityTarget string,
	priorityTargetLID string,
	rawTargets []string,
) groupTargetResolution {
	res := groupTargetResolution{}
	selfDigits := ""
	selfLID := ""
	if wa != nil && wa.Store != nil {
		if wa.Store.ID != nil {
			selfDigits = normalizePhone(wa.Store.ID.User)
		}
		if lid := wa.Store.GetLID(); !lid.IsEmpty() {
			selfLID = lid.User
		}
	}

	pnToLID := make(map[string]string)
	groupMemberLIDs := make([]string, 0, 32)
	if groupJID != "" && wa != nil {
		if parsedGroup, perr := types.ParseJID(groupJID); perr == nil && parsedGroup.Server == types.GroupServer {
			res.GroupChecked = true
			if info, gerr := wa.GetGroupInfo(ctx, parsedGroup); gerr == nil && info != nil {
				res.CallerInGroup = true
				for _, p := range info.Participants {
					lidUser := ""
					if !p.LID.IsEmpty() {
						lidUser = p.LID.User
					} else if p.JID.Server == "lid" && p.JID.User != "" {
						lidUser = p.JID.User
					}

					pn := ""
					if !p.PhoneNumber.IsEmpty() {
						pn = normalizePhone(p.PhoneNumber.User)
					} else if p.JID.Server == types.DefaultUserServer && p.JID.User != "" {
						pn = normalizePhone(p.JID.User)
					}

					if lidUser != "" && lidUser != selfLID {
						groupMemberLIDs = append(groupMemberLIDs, lidUser+"@lid")
						if pn != "" {
							pnToLID[pn] = lidUser
						}
					}
				}
			} else {
				b.logger.Warn().Err(gerr).Str("group_jid", groupJID).Msg("caller account GetGroupInfo failed (may not be in group)")
			}
		}
	}

	resolveSingleToLID := func(raw string, allowUsync bool) string {
		t := strings.TrimSpace(raw)
		if t == "" {
			return ""
		}
		if strings.Contains(t, "@lid") {
			u := strings.TrimSpace(strings.Split(strings.Split(t, "@")[0], ":")[0])
			if u != "" && u != selfLID {
				return u + "@lid"
			}
			return ""
		}
		d := normalizePhone(t)
		if len(d) < 8 || d == selfDigits {
			return ""
		}
		if mapped, ok := pnToLID[d]; ok && mapped != "" && mapped != selfLID {
			return mapped + "@lid"
		}
		if wa != nil && wa.Store != nil && wa.Store.LIDs != nil {
			if pnJID, err := types.ParseJID(d + "@s.whatsapp.net"); err == nil {
				if lid, err := wa.Store.LIDs.GetLIDForPN(ctx, pnJID); err == nil && !lid.IsEmpty() && lid.User != selfLID {
					return lid.User + "@lid"
				}
			}
		}
		if allowUsync && wa != nil {
			if pnJID, err := types.ParseJID(d + "@s.whatsapp.net"); err == nil {
				if infoMap, err := wa.GetUserInfo(ctx, []types.JID{pnJID}); err == nil {
					for _, ui := range infoMap {
						if !ui.LID.IsEmpty() && ui.LID.User != selfLID {
							return ui.LID.User + "@lid"
						}
					}
				}
			}
		}
		return ""
	}

	seenLID := make(map[string]struct{})
	resolvedLIDs := make([]string, 0, maxInitialGroupTargets)
	pendingPNs := make([]string, 0, maxInitialGroupTargets)

	addLID := func(lidStr string) bool {
		if lidStr == "" || len(resolvedLIDs) >= maxInitialGroupTargets {
			return false
		}
		u := strings.Split(strings.Split(lidStr, "@")[0], ":")[0]
		if u == "" || u == selfLID {
			return false
		}
		if _, ok := seenLID[u]; ok {
			return true
		}
		seenLID[u] = struct{}{}
		resolvedLIDs = append(resolvedLIDs, u+"@lid")
		return true
	}

	senderLID := ""
	if priorityTargetLID != "" {
		senderLID = resolveSingleToLID(priorityTargetLID, false)
	}
	if senderLID == "" && priorityTarget != "" {
		senderLID = resolveSingleToLID(priorityTarget, true)
	}
	if senderLID != "" {
		if addLID(senderLID) {
			res.SenderIncluded = true
		}
	} else if priorityTarget != "" {
		d := normalizePhone(priorityTarget)
		if d == selfDigits {
			res.SenderIncluded = true
		}
	}

	seenPN := make(map[string]struct{})
	for _, raw := range rawTargets {
		if len(resolvedLIDs) >= maxInitialGroupTargets {
			break
		}
		if lid := resolveSingleToLID(raw, false); lid != "" {
			addLID(lid)
			continue
		}
		d := normalizePhone(raw)
		if len(d) >= 8 && d != selfDigits {
			if _, ok := seenPN[d]; !ok && len(pendingPNs) < 6 {
				seenPN[d] = struct{}{}
				pendingPNs = append(pendingPNs, d)
			}
		}
	}

	desiredCount := 5
	if len(resolvedLIDs) > desiredCount {
		desiredCount = len(resolvedLIDs)
	}
	if desiredCount > maxInitialGroupTargets {
		desiredCount = maxInitialGroupTargets
	}
	for _, glid := range groupMemberLIDs {
		if len(resolvedLIDs) >= desiredCount {
			break
		}
		addLID(glid)
	}

	if len(resolvedLIDs) < 2 && len(pendingPNs) > 0 && wa != nil {
		batchJIDs := make([]types.JID, 0, len(pendingPNs))
		for _, d := range pendingPNs {
			if j, err := types.ParseJID(d + "@s.whatsapp.net"); err == nil {
				batchJIDs = append(batchJIDs, j)
			}
		}
		if len(batchJIDs) > 0 {
			if infoMap, err := wa.GetUserInfo(ctx, batchJIDs); err == nil {
				for _, ui := range infoMap {
					if !ui.LID.IsEmpty() {
						addLID(ui.LID.User + "@lid")
					}
				}
			}
		}
	}

	res.Targets = resolvedLIDs
	return res
}

func (b *bridgeServer) handlePlayCall(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	var req struct {
		Mode        string   `json:"mode"`
		CallType    string   `json:"callType"`
		ScreenShare *bool    `json:"screenShare"`
		Target      string   `json:"target"`
		TargetLID   string   `json:"targetLid"`
		GroupJID    string   `json:"groupJid"`
		Targets     []string `json:"targets"`
		Quality     string   `json:"quality"`
		RequestedBy string   `json:"requestedBy"`
		ChatJID     string   `json:"chatJid"`
		H264Path    string   `json:"h264Path"`
		AudioPath   string   `json:"audioPath"`
		Title       string   `json:"title"`
		FPS         int      `json:"fps"`
		Loop        bool     `json:"loop"`
		AutoEndSec  int      `json:"autoEndSec"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid json"})
		return
	}

	b.callCreateMu.Lock()
	defer b.callCreateMu.Unlock()

	if err := b.ensureConnected(); err != nil {
		writeJSON(w, http.StatusPreconditionFailed, map[string]any{"ok": false, "error": err.Error()})
		return
	}

	mode := strings.ToLower(strings.TrimSpace(req.Mode))
	if mode != "video" {
		mode = "audio"
	}
	callType := strings.ToLower(strings.TrimSpace(req.CallType))
	if callType != "direct" && callType != "group" {
		callType = "link"
	}
	isVideo := mode == "video"
	useScreenShare := isVideo
	if req.ScreenShare != nil {
		useScreenShare = isVideo && *req.ScreenShare
	}
	fps := req.FPS
	if fps <= 0 || fps > 60 {
		fps = 24
	}

	var aus [][]byte
	var idrIndices []int
	if isVideo {
		if req.H264Path == "" {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "h264Path wajib diisi untuk mode video"})
			return
		}
		var err error
		aus, idrIndices, err = loadAccessUnits(req.H264Path)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": fmt.Sprintf("gagal parse H.264: %v", err)})
			return
		}
	}
	if req.AudioPath == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "audioPath wajib diisi"})
		return
	}
	if _, err := os.Stat(req.AudioPath); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "file audio tidak ditemukan"})
		return
	}

	b.stopAllSessions()

	b.mu.Lock()
	mc := b.mc
	wa := b.wa
	b.mu.Unlock()

	selfLID := ""
	if wa != nil && wa.Store != nil {
		if lid := wa.Store.GetLID(); !lid.IsEmpty() {
			selfLID = lid.User
		}
	}

	callCtx, cancel := context.WithTimeout(b.ctx, 40*time.Second)
	defer cancel()

	var call *meowcaller.Call
	var linkURL string
	var groupTargetCount int
	var senderIncluded bool
	var fallbackLink bool
	var fallbackReason string
	var err error

	createLinkFallback := func(reason string) error {
		link, lerr := mc.CreateCallLink(callCtx, meowcaller.CallLinkOptions{Video: isVideo})
		if lerr != nil {
			return lerr
		}
		if isVideo {
			linkURL = fmt.Sprintf("https://call.whatsapp.com/video/%s", link.Token)
		} else {
			linkURL = fmt.Sprintf("https://call.whatsapp.com/voice/%s", link.Token)
		}
		c, jerr := mc.JoinCallLink(callCtx, link.Token, meowcaller.CallLinkOptions{Video: isVideo})
		if jerr != nil {
			return jerr
		}
		call = c
		callType = "link"
		fallbackLink = true
		fallbackReason = reason
		return nil
	}

	if callType == "link" {
		link, lerr := mc.CreateCallLink(callCtx, meowcaller.CallLinkOptions{Video: isVideo})
		if lerr != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": fmt.Sprintf("CreateCallLink gagal: %v", lerr)})
			return
		}
		if isVideo {
			linkURL = fmt.Sprintf("https://call.whatsapp.com/video/%s", link.Token)
		} else {
			linkURL = fmt.Sprintf("https://call.whatsapp.com/voice/%s", link.Token)
		}
		call, err = mc.JoinCallLink(callCtx, link.Token, meowcaller.CallLinkOptions{Video: isVideo})
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": fmt.Sprintf("JoinCallLink gagal: %v", err)})
			return
		}
	} else if callType == "group" {
		groupJID := strings.TrimSpace(req.GroupJID)
		if groupJID != "" && !strings.Contains(groupJID, "@") {
			groupJID += "@g.us"
		}

		resolved := b.resolveGroupTargetsPrioritized(callCtx, wa, groupJID, req.Target, req.TargetLID, req.Targets)
		senderIncluded = resolved.SenderIncluded

		if resolved.GroupChecked && !resolved.CallerInGroup {
			if fbErr := createLinkFallback("Akun caller belum tergabung di grup ini, dialihkan otomatis ke Room Call Link agar siapa saja di grup bisa klik Gabung secara opsional."); fbErr != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": fmt.Sprintf("GroupCall & fallback link gagal: %v", fbErr)})
				return
			}
		} else if len(resolved.Targets) >= 2 {
			groupTargetCount = len(resolved.Targets)
			call, err = mc.GroupCallWithOptions(callCtx, resolved.Targets, meowcaller.GroupCallOptions{
				GroupJID: groupJID,
				Video:    isVideo,
			})
		} else if groupJID != "" {
			call, err = mc.GroupCallByIDWithOptions(callCtx, groupJID, meowcaller.GroupCallOptions{
				GroupJID: groupJID,
				Video:    isVideo,
			})
		} else {
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"ok":    false,
				"error": "group call membutuhkan minimal 2 anggota lain di grup (atau tag minimal 2 nomor)",
			})
			return
		}

		if err != nil {
			lowErr := strings.ToLower(err.Error())
			if strings.Contains(lowErr, "at least two remote members") {
				if fbErr := createLinkFallback("Grup hanya memiliki < 2 anggota lain selain akun bot, dialihkan otomatis ke Room Call Link agar bisa langsung bergabung."); fbErr == nil {
					err = nil
				}
			} else if strings.Contains(lowErr, "429") || strings.Contains(lowErr, "rate-overlimit") || strings.Contains(lowErr, "rate limit") {
				if fbErr := createLinkFallback("WhatsApp membatasi rate-limit Group Call (429), dialihkan otomatis ke Room Call Link."); fbErr == nil {
					err = nil
				}
			}
		}
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": fmt.Sprintf("GroupCall gagal: %v", err)})
			return
		}

		if callType == "group" && call != nil {
			earlyEndCh := make(chan string, 1)
			call.OnEnd(func(reason string) {
				select {
				case earlyEndCh <- reason:
				default:
				}
			})
			select {
			case reason := <-earlyEndCh:
				b.logger.Warn().Str("reason", reason).Str("group_jid", groupJID).Msg("group call terminated immediately; falling back to call link")
				if fbErr := createLinkFallback(fmt.Sprintf("Panggilan grup ditolak server WhatsApp (%s), dialihkan otomatis ke Room Call Link agar siapa saja bisa klik Gabung.", reason)); fbErr != nil {
					writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": fmt.Sprintf("GroupCall dihentikan WhatsApp (%s) & fallback gagal: %v", reason, fbErr)})
					return
				}
			case <-time.After(2200 * time.Millisecond):
				if call.State() == meowcaller.CallPhaseEnded {
					if fbErr := createLinkFallback("Panggilan grup langsung berakhir dari server WhatsApp, dialihkan otomatis ke Room Call Link."); fbErr != nil {
						writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": fmt.Sprintf("GroupCall berakhir prematur: %v", fbErr)})
						return
					}
				}
			}
		}
	} else {
		target := normalizePhone(req.Target)
		if len(target) < 8 {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "nomor target tidak valid untuk direct call"})
			return
		}
		call, err = mc.CallWithOptions(callCtx, "+"+target, meowcaller.CallOptions{Video: isVideo})
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": fmt.Sprintf("CallWithOptions gagal: %v", err)})
			return
		}
	}

	firstTrack := &trackItem{
		Title:       req.Title,
		Mode:        mode,
		Quality:     req.Quality,
		RequestedBy: req.RequestedBy,
		ChatJID:     req.ChatJID,
		AudioPath:   req.AudioPath,
		H264Path:    req.H264Path,
		FPS:         fps,
		AccessUnits: aus,
		IDRIndices:  idrIndices,
	}

	sess := &activeSession{
		id:          call.ID(),
		title:       req.Title,
		mode:        mode,
		callType:    callType,
		screenShare: useScreenShare,
		quality:     req.Quality,
		requestedBy: req.RequestedBy,
		chatJID:     req.ChatJID,
		linkURL:     linkURL,
		target:      normalizePhone(req.Target),
		groupJID:    strings.TrimSpace(req.GroupJID),
		selfLID:     selfLID,
		fps:         fps,
		loop:        req.Loop,
		trackSeq:    1,
		startedAt:   time.Now(),
		call:        call,
		current:     firstTrack,
		queue:       make([]*trackItem, 0, 8),
		stopCh:      make(chan struct{}),
	}

	b.mu.Lock()
	b.sessions[sess.id] = sess
	b.mu.Unlock()

	b.wireSessionMedia(sess, req.AutoEndSec)

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":             true,
		"callId":         sess.id,
		"mode":           sess.mode,
		"callType":       sess.callType,
		"screenShare":    sess.screenShare,
		"quality":        sess.quality,
		"linkUrl":        sess.linkURL,
		"groupJid":       sess.groupJID,
		"targetCount":    groupTargetCount,
		"senderIncluded": senderIncluded,
		"fallbackLink":   fallbackLink,
		"fallbackReason": fallbackReason,
		"title":          sess.title,
		"frames":         len(aus),
		"fps":            sess.fps,
	})
}

func (b *bridgeServer) handleEnqueue(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	var req struct {
		CallID      string `json:"callId"`
		Mode        string `json:"mode"`
		Quality     string `json:"quality"`
		RequestedBy string `json:"requestedBy"`
		ChatJID     string `json:"chatJid"`
		H264Path    string `json:"h264Path"`
		AudioPath   string `json:"audioPath"`
		Title       string `json:"title"`
		FPS         int    `json:"fps"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid json"})
		return
	}
	if req.AudioPath == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "audioPath wajib diisi"})
		return
	}
	if _, err := os.Stat(req.AudioPath); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "file audio antrean tidak ditemukan"})
		return
	}

	sess := b.findActiveSession(req.CallID)
	if sess == nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"ok": false, "error": "no_active_call"})
		return
	}

	mode := strings.ToLower(strings.TrimSpace(req.Mode))
	if mode != "video" {
		mode = "audio"
	}
	fps := req.FPS
	if fps <= 0 || fps > 60 {
		fps = 24
	}

	var aus [][]byte
	var idrIndices []int
	if req.H264Path != "" {
		var err error
		aus, idrIndices, err = loadAccessUnits(req.H264Path)
		if err != nil {
			b.logger.Warn().Err(err).Msg("enqueue video H.264 parse failed, falling back to audio-only track")
			aus = nil
			idrIndices = nil
		}
	}

	item := &trackItem{
		Title:       req.Title,
		Mode:        mode,
		Quality:     req.Quality,
		RequestedBy: req.RequestedBy,
		ChatJID:     req.ChatJID,
		AudioPath:   req.AudioPath,
		H264Path:    req.H264Path,
		FPS:         fps,
		AccessUnits: aus,
		IDRIndices:  idrIndices,
	}

	sess.mu.Lock()
	sess.queue = append(sess.queue, item)
	sess.hadQueue = true
	pos := len(sess.queue) + 1
	qLen := len(sess.queue)
	nowPlaying := sess.title
	callID := sess.id
	callType := sess.callType
	linkURL := sess.linkURL
	sess.mu.Unlock()

	b.logger.Info().
		Str("call_id", callID).
		Str("title", item.Title).
		Int("position", pos).
		Msg("track added to active call queue")

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":          true,
		"queued":      true,
		"callId":      callID,
		"callType":    callType,
		"linkUrl":     linkURL,
		"position":    pos,
		"queueLength": qLen,
		"nowPlaying":  nowPlaying,
		"title":       item.Title,
	})
}

func (b *bridgeServer) handleSkip(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	var req struct {
		CallID string `json:"callId"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	sess := b.findActiveSession(req.CallID)
	if sess == nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "skipped": false, "ended": false, "message": "tidak ada panggilan aktif"})
		return
	}

	sess.mu.Lock()
	prevTitle := sess.title
	sess.trackGen++
	if len(sess.queue) == 0 {
		sess.mu.Unlock()
		b.removeSession(sess.id)
		if sess.call != nil {
			_ = sess.call.Hangup()
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":          true,
			"skipped":     true,
			"ended":       true,
			"prevTitle":   prevTitle,
			"queueLength": 0,
		})
		return
	}

	next := sess.queue[0]
	sess.queue = sess.queue[1:]
	rem := len(sess.queue)
	connected := sess.connected
	player := sess.player
	if !connected {
		old := sess.current
		sess.current = next
		sess.title = next.Title
		sess.quality = next.Quality
		sess.requestedBy = next.RequestedBy
		sess.chatJID = next.ChatJID
		sess.fps = next.FPS
		sess.trackSeq++
		sess.mu.Unlock()
		cleanupTrackFiles(old)
	} else {
		sess.mu.Unlock()
		if player != nil {
			player.Stop()
		}
		b.startTrack(sess, next, false)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":          true,
		"skipped":     true,
		"ended":       false,
		"prevTitle":   prevTitle,
		"nowPlaying":  next.Title,
		"requestedBy": next.RequestedBy,
		"quality":     next.Quality,
		"queueLength": rem,
	})
}

func (b *bridgeServer) handleClearQueue(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	var req struct {
		CallID string `json:"callId"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	sess := b.findActiveSession(req.CallID)
	if sess == nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "cleared": 0})
		return
	}

	sess.mu.Lock()
	oldQ := sess.queue
	sess.queue = make([]*trackItem, 0, 4)
	sess.mu.Unlock()

	for _, item := range oldQ {
		cleanupTrackFiles(item)
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "cleared": len(oldQ), "nowPlaying": sess.title})
}

func (b *bridgeServer) activateVideoPresentation(sess *activeSession) {
	if sess == nil || sess.call == nil || sess.mode != "video" {
		return
	}
	select {
	case <-sess.stopCh:
		return
	default:
	}

	if err := sess.call.SetVideoEnabled(true); err != nil {
		b.logger.Debug().Err(err).Str("call_id", sess.id).Msg("SetVideoEnabled info")
	}
	_ = sess.call.SetVideoOrientation(0)
	if sess.screenShare {
		if err := sess.call.StartScreenShare(nil); err != nil {
			b.logger.Debug().Err(err).Str("call_id", sess.id).Msg("StartScreenShare info")
		}
	}
	atomic.StoreInt32(&sess.forceIDR, 1)

	go func() {
		select {
		case <-sess.stopCh:
			return
		case <-time.After(900 * time.Millisecond):
			atomic.StoreInt32(&sess.forceIDR, 1)
		}
	}()
}

func (b *bridgeServer) startTrack(sess *activeSession, track *trackItem, isReplay bool) {
	if sess == nil || track == nil {
		return
	}
	select {
	case <-sess.stopCh:
		return
	default:
	}

	var prevTrack *trackItem
	var vidStop chan struct{}

	sess.mu.Lock()
	if !isReplay {
		if sess.videoStopCh != nil {
			close(sess.videoStopCh)
			sess.videoStopCh = nil
		}
		if sess.current != nil && sess.current != track {
			prevTrack = sess.current
		}
		sess.current = track
		sess.title = track.Title
		sess.quality = track.Quality
		sess.requestedBy = track.RequestedBy
		if track.ChatJID != "" {
			sess.chatJID = track.ChatJID
		}
		if track.FPS > 0 {
			sess.fps = track.FPS
		}
		if prevTrack != nil {
			sess.trackSeq++
		}
		if sess.mode == "video" && len(track.AccessUnits) > 0 {
			vidStop = make(chan struct{})
			sess.videoStopCh = vidStop
		}
	}
	sess.trackGen++
	gen := sess.trackGen
	player := sess.player
	isVideoCall := sess.mode == "video"
	audioPath := track.AudioPath
	aus := track.AccessUnits
	idrs := track.IDRIndices
	fps := track.FPS
	if fps <= 0 {
		fps = 24
	}
	sess.mu.Unlock()

	if prevTrack != nil {
		go func(old *trackItem) {
			time.Sleep(400 * time.Millisecond)
			cleanupTrackFiles(old)
		}(prevTrack)
	}

	if player == nil {
		return
	}

	src, err := openAudioSource(audioPath)
	if err != nil {
		b.logger.Warn().Err(err).Str("call_id", sess.id).Str("title", track.Title).Msg("failed to open audio source")
		b.handleTrackFinished(sess, gen)
		return
	}

	player.OnFinish(func() {
		b.handleTrackFinished(sess, gen)
	})
	player.Play(src)

	if !isReplay && isVideoCall && len(aus) > 0 && vidStop != nil {
		b.activateVideoPresentation(sess)
		go b.runVideoLoop(sess, aus, idrs, fps, vidStop)
	}
}

func (b *bridgeServer) handleTrackFinished(sess *activeSession, expectedGen uint64) {
	select {
	case <-sess.stopCh:
		return
	default:
	}

	sess.mu.Lock()
	if sess.trackGen != expectedGen {
		sess.mu.Unlock()
		return
	}
	if len(sess.queue) > 0 {
		next := sess.queue[0]
		sess.queue = sess.queue[1:]
		sess.mu.Unlock()
		b.logger.Info().Str("call_id", sess.id).Str("next_title", next.Title).Msg("advancing seamlessly to next queued track")
		b.startTrack(sess, next, false)
		return
	}

	shouldLoop := sess.loop && !sess.hadQueue
	cur := sess.current
	call := sess.call
	sess.mu.Unlock()

	if shouldLoop && cur != nil {
		b.startTrack(sess, cur, true)
		return
	}

	go func() {
		time.Sleep(1500 * time.Millisecond)
		if call != nil {
			_ = call.Hangup()
		}
		b.removeSession(sess.id)
	}()
}

func (b *bridgeServer) wireSessionMedia(sess *activeSession, autoEndSec int) {
	call := sess.call
	player := meowcaller.NewPlayer()
	call.Subscribe(player)

	sess.mu.Lock()
	sess.player = player
	sess.mu.Unlock()

	startMedia := func() {
		sess.streamOnce.Do(func() {
			sess.mu.Lock()
			sess.connected = true
			sess.connectedAt = time.Now()
			cur := sess.current
			sess.mu.Unlock()

			frames := 0
			if cur != nil {
				frames = len(cur.AccessUnits)
			}
			b.logger.Info().
				Str("call_id", sess.id).
				Str("mode", sess.mode).
				Str("type", sess.callType).
				Bool("screen_share", sess.screenShare).
				Int("frames", frames).
				Msg("starting live media stream into WhatsApp call")

			if cur != nil {
				go b.startTrack(sess, cur, false)
			}
		})
	}

	call.OnVideoKeyframeRequest(func() {
		atomic.StoreInt32(&sess.forceIDR, 1)
	})

	call.OnWaitingRoomState(func(wr meowcaller.WaitingRoomState) {
		if !wr.IsAdmin || len(wr.Users) == 0 {
			return
		}
		for _, u := range wr.Users {
			admCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			_ = call.AdmitParticipant(admCtx, u.JID.String())
			cancel()
		}
	})

	call.OnGroupState(func(gs meowcaller.GroupCallState) {
		remoteConnected := 0
		for _, p := range gs.Participants {
			if p.State == "connected" && (sess.selfLID == "" || p.JID.User != sess.selfLID) {
				remoteConnected++
			}
		}
		if remoteConnected >= 1 {
			sess.mu.Lock()
			prev := sess.lastRemoteConnected
			alreadyStarted := sess.connected
			if remoteConnected > prev {
				sess.lastRemoteConnected = remoteConnected
			}
			sess.mu.Unlock()

			if !alreadyStarted {
				startMedia()
			} else if remoteConnected > prev && sess.mode == "video" {
				go func() {
					select {
					case <-sess.stopCh:
						return
					case <-time.After(450 * time.Millisecond):
						b.activateVideoPresentation(sess)
					}
				}()
			}
		}
	})

	call.OnPeerAccept(func() {
		if sess.mode == "video" {
			go func() {
				select {
				case <-sess.stopCh:
					return
				case <-time.After(350 * time.Millisecond):
					b.activateVideoPresentation(sess)
				}
			}()
		}
		atomic.StoreInt32(&sess.forceIDR, 1)
	})

	call.OnReady(func() {
		if sess.callType == "direct" {
			startMedia()
			return
		}
		go func() {
			select {
			case <-sess.stopCh:
				return
			case <-time.After(1200 * time.Millisecond):
				if gs, ok := call.GroupState(); ok {
					for _, p := range gs.Participants {
						if p.State == "connected" && (sess.selfLID == "" || p.JID.User != sess.selfLID) {
							startMedia()
							return
						}
					}
				}
			}
		}()
	})

	call.OnEnd(func(reason string) {
		b.logger.Info().Str("call_id", sess.id).Str("reason", reason).Msg("call ended")
		b.removeSession(sess.id)
	})

	waitTimeout := 90 * time.Second
	if sess.callType == "link" {
		waitTimeout = 4 * time.Minute
	} else if sess.callType == "group" {
		waitTimeout = 3 * time.Minute
	}
	go func() {
		timer := time.NewTimer(waitTimeout)
		defer timer.Stop()
		select {
		case <-sess.stopCh:
			return
		case <-timer.C:
			sess.mu.Lock()
			conn := sess.connected
			sess.mu.Unlock()
			if !conn {
				b.logger.Info().Str("call_id", sess.id).Msg("call timed out waiting for peer")
				_ = call.Hangup()
				b.removeSession(sess.id)
			}
		}
	}()

	maxDur := 30 * time.Minute
	if autoEndSec > 30 && autoEndSec <= 7200 {
		maxDur = time.Duration(autoEndSec) * time.Second
	}
	go func() {
		timer := time.NewTimer(maxDur)
		defer timer.Stop()
		select {
		case <-sess.stopCh:
			return
		case <-timer.C:
			b.logger.Info().Str("call_id", sess.id).Msg("call reached max duration, hanging up")
			_ = call.Hangup()
			b.removeSession(sess.id)
		}
	}()
}

func (b *bridgeServer) runVideoLoop(sess *activeSession, aus [][]byte, idrIndices []int, fps int, vidStop <-chan struct{}) {
	if len(aus) == 0 {
		return
	}
	if fps <= 0 || fps > 60 {
		fps = 24
	}
	frameDur := time.Second / time.Duration(fps)

	idx := 0
	if len(idrIndices) > 0 {
		idx = idrIndices[0]
	}
	_ = sess.call.SendVideoWithDuration(aus[idx], frameDur)
	idx++
	if idx >= len(aus) {
		idx = 0
	}

	ticker := time.NewTicker(frameDur)
	defer ticker.Stop()

	ticks := 0
	for {
		select {
		case <-sess.stopCh:
			return
		case <-vidStop:
			return
		case <-ticker.C:
		}
		ticks++

		if (atomic.SwapInt32(&sess.forceIDR, 0) == 1 || ticks == fps) && len(idrIndices) > 0 {
			idrIdx := nearestIDRIndex(idrIndices, idx)
			_ = sess.call.SendVideoWithDuration(aus[idrIdx], frameDur)
			idx = idrIdx + 1
			if idx >= len(aus) {
				idx = 0
			}
			continue
		}

		if idx >= len(aus) {
			idx = 0
		}

		au := aus[idx]
		idx++
		if err := sess.call.SendVideoWithDuration(au, frameDur); err != nil {
			if sess.call.State() == meowcaller.CallPhaseEnded {
				return
			}
		}
	}
}

func nearestIDRIndex(idrs []int, current int) int {
	best := idrs[0]
	for _, pos := range idrs {
		if pos <= current {
			best = pos
		} else {
			break
		}
	}
	return best
}

func openAudioSource(path string) (meowcaller.AudioSource, error) {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".wav":
		return meowcaller.WAVFile(path)
	case ".opus", ".ogg":
		return meowcaller.OpusFile(path)
	default:
		return meowcaller.MP3File(path)
	}
}

func loadAccessUnits(h264Path string) ([][]byte, []int, error) {
	raw, err := os.ReadFile(h264Path)
	if err != nil {
		return nil, nil, err
	}
	nalus := rtp.SplitAnnexB(raw)
	if len(nalus) == 0 {
		return nil, nil, errors.New("tidak ada NAL unit H.264 ditemukan")
	}

	var sps, pps []byte
	var aus [][]byte
	var idrIndices []int

	for _, n := range nalus {
		if len(n) == 0 {
			continue
		}
		naluType := n[0] & 0x1F
		switch naluType {
		case 7:
			sps = append([]byte(nil), n...)
		case 8:
			pps = append([]byte(nil), n...)
		case 5:
			frameNalus := make([][]byte, 0, 3)
			if sps != nil {
				frameNalus = append(frameNalus, sps)
			}
			if pps != nil {
				frameNalus = append(frameNalus, pps)
			}
			frameNalus = append(frameNalus, n)
			idrIndices = append(idrIndices, len(aus))
			aus = append(aus, joinAnnexB(frameNalus))
		case 1:
			aus = append(aus, joinAnnexB([][]byte{n}))
		}
	}
	if len(aus) == 0 {
		return nil, nil, errors.New("tidak ada access unit H.264 terbentuk")
	}
	return aus, idrIndices, nil
}

func joinAnnexB(nalus [][]byte) []byte {
	var buf bytes.Buffer
	for _, n := range nalus {
		buf.Write([]byte{0x00, 0x00, 0x00, 0x01})
		buf.Write(n)
	}
	return buf.Bytes()
}

func normalizePhone(raw string) string {
	digits := nonDigitsRe.ReplaceAllString(strings.TrimSpace(raw), "")
	if strings.HasPrefix(digits, "08") {
		digits = "62" + digits[1:]
	} else if strings.HasPrefix(digits, "8") && len(digits) >= 9 && len(digits) <= 13 {
		digits = "62" + digits
	}
	return digits
}

func writeJSON(w http.ResponseWriter, status int, payload map[string]any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func envOrDefault(keys []string, fallback string) string {
	for _, k := range keys {
		if v := strings.TrimSpace(os.Getenv(k)); v != "" {
			return v
		}
	}
	return fallback
}

func main() {
	port := envOrDefault([]string{"CALL_BRIDGE_PORT", "SHIKI_CALL_PORT"}, "19842")
	dbPath := envOrDefault([]string{"CALL_BRIDGE_DB", "SHIKI_CALL_DB"}, filepath.Join("data", "caller-session.db"))
	token := envOrDefault([]string{"CALL_BRIDGE_TOKEN", "SHIKI_CALL_TOKEN"}, "")

	logger := zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: "15:04:05"}).
		Level(zerolog.InfoLevel).
		With().Timestamp().Logger()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	srv, err := newBridgeServer(ctx, dbPath, token, logger)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to initialize meowcaller bridge")
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", srv.authMiddleware(srv.handleHealth))
	mux.HandleFunc("/status", srv.authMiddleware(srv.handleHealth))
	mux.HandleFunc("/pair", srv.authMiddleware(srv.handlePair))
	mux.HandleFunc("/logout", srv.authMiddleware(srv.handleLogout))
	mux.HandleFunc("/playcall", srv.authMiddleware(srv.handlePlayCall))
	mux.HandleFunc("/enqueue", srv.authMiddleware(srv.handleEnqueue))
	mux.HandleFunc("/skip", srv.authMiddleware(srv.handleSkip))
	mux.HandleFunc("/clearqueue", srv.authMiddleware(srv.handleClearQueue))
	mux.HandleFunc("/invite", srv.authMiddleware(srv.handleInvite))
	mux.HandleFunc("/stop", srv.authMiddleware(srv.handleStop))

	addr := "127.0.0.1:" + port
	httpSrv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		<-ctx.Done()
		srv.stopAllSessions()
		shutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = httpSrv.Shutdown(shutCtx)
		srv.mu.Lock()
		if srv.wa != nil {
			srv.wa.Disconnect()
		}
		srv.mu.Unlock()
	}()

	logger.Info().Str("addr", addr).Str("db", dbPath).Str("version", bridgeVersion).Msg("HuTao - MD MeowCaller Bridge ready")
	if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Fatal().Err(err).Msg("http server error")
	}
}
