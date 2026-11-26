const crypto = require('crypto');
const https = require('https');
const botCtx = require('../core/context');
const { grantRandomGameReward } = require('./game');
const { sendRichHtmlToJid } = require('./rich-message');
const { formatCard } = require('../utils/formatter');

const rooms = (global._chessPvpRooms = global._chessPvpRooms || new Map());
const watchers = (global._chessPvpWatchers = global._chessPvpWatchers || new Map());
const FILES = 'abcdefgh';
const RELAY_HOST = 'ntfy.sh';
const ROOM_TTL_MS = 30 * 60 * 1000;

function makeInitialBoard() {
    return [
        ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
        ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
        ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
    ];
}

function cloneBoard(b) {
    return b.map((row) => [...row]);
}

function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function sqToRC(sq) {
    const s = String(sq || '').toLowerCase().trim();
    if (!/^[a-h][1-8]$/.test(s)) return null;
    return { r: 8 - parseInt(s[1], 10), c: FILES.indexOf(s[0]) };
}

function rcToSq(r, c) {
    return `${FILES[c]}${8 - r}`;
}

function findKing(board, color) {
    const target = `${color}K`;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === target) return { r, c };
        }
    }
    return null;
}

function isSquareAttacked(board, tr, tc, byColor) {
    const pawnDir = byColor === 'w' ? 1 : -1;
    for (const dc of [-1, 1]) {
        const pr = tr + pawnDir;
        const pc = tc + dc;
        if (inBounds(pr, pc) && board[pr][pc] === `${byColor}P`) return true;
    }

    const knightD = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (const [dr, dc] of knightD) {
        const nr = tr + dr, nc = tc + dc;
        if (inBounds(nr, nc) && board[nr][nc] === `${byColor}N`) return true;
    }

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const kr = tr + dr, kc = tc + dc;
            if (inBounds(kr, kc) && board[kr][kc] === `${byColor}K`) return true;
        }
    }

    const ortho = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of ortho) {
        let r = tr + dr, c = tc + dc;
        while (inBounds(r, c)) {
            const p = board[r][c];
            if (p) {
                if (p === `${byColor}R` || p === `${byColor}Q`) return true;
                break;
            }
            r += dr; c += dc;
        }
    }

    const diag = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diag) {
        let r = tr + dr, c = tc + dc;
        while (inBounds(r, c)) {
            const p = board[r][c];
            if (p) {
                if (p === `${byColor}B` || p === `${byColor}Q`) return true;
                break;
            }
            r += dr; c += dc;
        }
    }
    return false;
}

function isInCheck(board, color) {
    const king = findKing(board, color);
    if (!king) return false;
    return isSquareAttacked(board, king.r, king.c, color === 'w' ? 'b' : 'w');
}

function generatePseudoMoves(state, r, c) {
    const { board, castling, enPassant } = state;
    const piece = board[r][c];
    if (!piece) return [];
    const color = piece[0];
    const type = piece[1];
    const opp = color === 'w' ? 'b' : 'w';
    const moves = [];

    if (type === 'P') {
        const dir = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;
        const promoRow = color === 'w' ? 0 : 7;
        const nr = r + dir;
        if (inBounds(nr, c) && !board[nr][c]) {
            moves.push({ fr: r, fc: c, tr: nr, tc: c, promo: nr === promoRow });
            const nr2 = r + dir * 2;
            if (r === startRow && !board[nr2][c]) {
                moves.push({ fr: r, fc: c, tr: nr2, tc: c, doublePawn: true });
            }
        }
        for (const dc of [-1, 1]) {
            const nc = c + dc;
            if (!inBounds(nr, nc)) continue;
            if (board[nr][nc] && board[nr][nc][0] === opp) {
                moves.push({ fr: r, fc: c, tr: nr, tc: nc, promo: nr === promoRow });
            } else if (enPassant && enPassant.r === nr && enPassant.c === nc) {
                moves.push({ fr: r, fc: c, tr: nr, tc: nc, isEnPassant: true });
            }
        }
    } else if (type === 'N') {
        for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
            const nr = r + dr, nc = c + dc;
            if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc][0] === opp)) {
                moves.push({ fr: r, fc: c, tr: nr, tc: nc });
            }
        }
    } else if (type === 'B' || type === 'R' || type === 'Q') {
        const dirs = [];
        if (type === 'B' || type === 'Q') dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        if (type === 'R' || type === 'Q') dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        for (const [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            while (inBounds(nr, nc)) {
                if (!board[nr][nc]) {
                    moves.push({ fr: r, fc: c, tr: nr, tc: nc });
                } else {
                    if (board[nr][nc][0] === opp) moves.push({ fr: r, fc: c, tr: nr, tc: nc });
                    break;
                }
                nr += dr; nc += dc;
            }
        }
    } else if (type === 'K') {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (!dr && !dc) continue;
                const nr = r + dr, nc = c + dc;
                if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc][0] === opp)) {
                    moves.push({ fr: r, fc: c, tr: nr, tc: nc });
                }
            }
        }
        const homeRow = color === 'w' ? 7 : 0;
        if (r === homeRow && c === 4 && !isInCheck(board, color)) {
            if (castling[color === 'w' ? 'K' : 'k'] && !board[homeRow][5] && !board[homeRow][6] && board[homeRow][7] === `${color}R`) {
                if (!isSquareAttacked(board, homeRow, 5, opp) && !isSquareAttacked(board, homeRow, 6, opp)) {
                    moves.push({ fr: homeRow, fc: 4, tr: homeRow, tc: 6, castle: 'K' });
                }
            }
            if (castling[color === 'w' ? 'Q' : 'q'] && !board[homeRow][3] && !board[homeRow][2] && !board[homeRow][1] && board[homeRow][0] === `${color}R`) {
                if (!isSquareAttacked(board, homeRow, 3, opp) && !isSquareAttacked(board, homeRow, 2, opp)) {
                    moves.push({ fr: homeRow, fc: 4, tr: homeRow, tc: 2, castle: 'Q' });
                }
            }
        }
    }
    return moves;
}

function applyMoveToBoard(board, mv, promoPiece = 'Q') {
    const next = cloneBoard(board);
    const moving = next[mv.fr][mv.fc];
    const color = moving[0];
    let captured = next[mv.tr][mv.tc];

    next[mv.fr][mv.fc] = null;
    if (mv.isEnPassant) {
        const capRow = color === 'w' ? mv.tr + 1 : mv.tr - 1;
        captured = next[capRow][mv.tc];
        next[capRow][mv.tc] = null;
    }
    if (mv.castle === 'K') {
        next[mv.tr][5] = next[mv.tr][7];
        next[mv.tr][7] = null;
    } else if (mv.castle === 'Q') {
        next[mv.tr][3] = next[mv.tr][0];
        next[mv.tr][0] = null;
    }

    if (mv.promo) {
        const pType = ['Q', 'R', 'B', 'N'].includes(String(promoPiece).toUpperCase()) ? String(promoPiece).toUpperCase() : 'Q';
        next[mv.tr][mv.tc] = `${color}${pType}`;
    } else {
        next[mv.tr][mv.tc] = moving;
    }
    return { next, captured };
}

function getAllLegalMoves(state, color) {
    const legal = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = state.board[r][c];
            if (!p || p[0] !== color) continue;
            for (const mv of generatePseudoMoves(state, r, c)) {
                const { next } = applyMoveToBoard(state.board, mv);
                if (!isInCheck(next, color)) legal.push(mv);
            }
        }
    }
    return legal;
}

function parseUserMove(state, rawInput) {
    const clean = String(rawInput || '').trim();
    const legal = getAllLegalMoves(state, state.turn);
    if (!legal.length) return null;

    if (/^(o-o-o|0-0-0)$/i.test(clean)) {
        return legal.find((m) => m.castle === 'Q') || null;
    }
    if (/^(o-o|0-0)$/i.test(clean)) {
        return legal.find((m) => m.castle === 'K') || null;
    }

    const coord = clean.toLowerCase().replace(/[^a-h1-8qrbn]/g, '');
    const mCoord = coord.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/);
    if (mCoord) {
        const f = sqToRC(mCoord[1]);
        const t = sqToRC(mCoord[2]);
        const match = legal.find((mv) => mv.fr === f.r && mv.fc === f.c && mv.tr === t.r && mv.tc === t.c);
        if (match) return { ...match, promoPiece: (mCoord[3] || 'Q').toUpperCase() };
        return null;
    }

    const san = clean.replace(/[+#!?x]/g, '');
    const mSan = san.match(/^([KQRBN])?([a-h])?([1-8])?([a-h][1-8])(?:=?([QRBN]))?$/);
    if (mSan) {
        const pieceType = mSan[1] || 'P';
        const fromFile = mSan[2] ? FILES.indexOf(mSan[2]) : -1;
        const fromRank = mSan[3] ? 8 - parseInt(mSan[3], 10) : -1;
        const target = sqToRC(mSan[4]);
        const promoPiece = mSan[5] || 'Q';
        const match = legal.find((mv) => {
            const p = state.board[mv.fr][mv.fc];
            if (!p || p[1] !== pieceType) return false;
            if (mv.tr !== target.r || mv.tc !== target.c) return false;
            if (fromFile !== -1 && mv.fc !== fromFile) return false;
            if (fromRank !== -1 && mv.fr !== fromRank) return false;
            return true;
        });
        if (match) return { ...match, promoPiece };
    }
    return null;
}

function executeChessMove(room, rawInput) {
    const mv = parseUserMove(room, rawInput);
    if (!mv) return { ok: false, reason: 'Langkah tidak legal atau format tidak dikenali (contoh: `e2e4`, `e2 e4`, `Nf3`, `O-O`).' };

    const moving = room.board[mv.fr][mv.fc];
    const color = room.turn;
    const opp = color === 'w' ? 'b' : 'w';
    const { next, captured } = applyMoveToBoard(room.board, mv, mv.promoPiece);

    room.board = next;
    room.lastMove = { fr: mv.fr, fc: mv.fc, tr: mv.tr, tc: mv.tc };
    room.enPassant = mv.doublePawn ? { r: (mv.fr + mv.tr) / 2, c: mv.fc } : null;

    if (moving === 'wK') { room.castling.K = false; room.castling.Q = false; }
    if (moving === 'bK') { room.castling.k = false; room.castling.q = false; }
    if (mv.fr === 7 && mv.fc === 0) room.castling.Q = false;
    if (mv.fr === 7 && mv.fc === 7) room.castling.K = false;
    if (mv.fr === 0 && mv.fc === 0) room.castling.q = false;
    if (mv.fr === 0 && mv.fc === 7) room.castling.k = false;
    if (mv.tr === 7 && mv.tc === 0) room.castling.Q = false;
    if (mv.tr === 7 && mv.tc === 7) room.castling.K = false;
    if (mv.tr === 0 && mv.tc === 0) room.castling.q = false;
    if (mv.tr === 0 && mv.tc === 7) room.castling.k = false;

    if (captured) {
        room.captured[color].push(captured);
    }

    const coordMove = `${rcToSq(mv.fr, mv.fc)}${rcToSq(mv.tr, mv.tc)}${mv.promo ? String(mv.promoPiece || 'Q').toLowerCase() : ''}`;
    const notation = mv.castle === 'K' ? 'O-O' : mv.castle === 'Q' ? 'O-O-O' : `${rcToSq(mv.fr, mv.fc)}-${rcToSq(mv.tr, mv.tc)}${mv.promo ? '=' + (mv.promoPiece || 'Q') : ''}`;
    room.movesCoord = Array.isArray(room.movesCoord) ? room.movesCoord : [];
    room.movesCoord.push(coordMove);
    room.history.push(`${color === 'w' ? 'Putih' : 'Hitam'}: ${notation}`);
    room.turn = opp;
    room.updatedAt = Date.now();
    room.drawOfferBy = null;

    const inCheck = isInCheck(room.board, opp);
    const oppMoves = getAllLegalMoves(room, opp);
    let outcome = 'playing';
    if (oppMoves.length === 0) {
        outcome = inCheck ? 'checkmate' : 'stalemate';
    } else if (room.history.length >= 200) {
        outcome = 'draw';
    }

    return {
        ok: true,
        coordMove,
        moveIndex: room.movesCoord.length,
        movedColor: color,
        notation,
        captured,
        inCheck,
        outcome,
        winnerColor: outcome === 'checkmate' ? color : null
    };
}

function escapeJsonForHtml(obj) {
    return JSON.stringify(obj)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
}

function buildRichChessHtml(room, { role = 'auto', botname = 'HuTao - MD' } = {}) {
    const cfg = {
        code: room.code,
        topic: room.topic,
        relay: `https://${RELAY_HOST}`,
        wsRelay: `wss://${RELAY_HOST}`,
        role: ['w', 'b', 'spec'].includes(role) ? role : 'auto',
        whiteName: String(room.whiteName || 'Putih').slice(0, 20),
        blackName: String(room.blackName || 'Menunggu...').slice(0, 20),
        botname: String(botname || 'HuTao - MD').slice(0, 24),
        moves: Array.isArray(room.movesCoord) ? room.movesCoord : []
    };

    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<title>Chess Co-op ${cfg.code}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;user-select:none}
body{margin:0;background:transparent;color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;overflow-x:hidden}
.wrap{width:100%;max-width:440px;margin:0 auto;padding:8px}
.card{background:#111622;border:1.5px solid #263248;border-radius:18px;padding:12px;box-shadow:0 12px 32px rgba(0,0,0,.55)}
.top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}
.brand{display:flex;align-items:center;gap:7px}
.room-tag{font-size:11px;font-weight:800;letter-spacing:.7px;color:#e5b85c;background:rgba(229,184,92,.12);border:1px solid rgba(229,184,92,.35);padding:3px 8px;border-radius:8px}
.sync{font-size:10px;font-weight:800;letter-spacing:.4px;padding:3px 8px;border-radius:99px;display:inline-flex;align-items:center;gap:5px}
.sync.live{background:rgba(16,185,129,.16);color:#34d399;border:1px solid rgba(52,211,153,.35)}
.sync.wait{background:rgba(245,158,11,.16);color:#fbbf24;border:1px solid rgba(251,191,36,.35)}
.sync.chat{background:rgba(56,189,248,.16);color:#38bdf8;border:1px solid rgba(56,189,248,.35)}
.dot{width:7px;height:7px;border-radius:50%;background:currentColor}
.roles{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}
.rbtn{border:1px solid #28354d;background:#182032;color:#cbd5e1;border-radius:10px;padding:7px 4px;font-size:11px;font-weight:800;cursor:pointer;text-align:center}
.rbtn.on{background:#2563eb;border-color:#60a5fa;color:#fff}
.pbar{display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:#171e2e;border:1px solid #243046;border-radius:10px;margin:6px 0}
.pbar.turn{border-color:#34d399;background:#152534}
.pname{font-size:12px;font-weight:800;display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:62%}
.pdot{width:8px;height:8px;border-radius:50%;background:#475569;flex-shrink:0}
.pbar.turn .pdot{background:#34d399;box-shadow:0 0 8px #34d399}
.caps{font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:.3px}
.bwrap{position:relative;width:100%;aspect-ratio:1/1;border-radius:10px;overflow:hidden;border:2px solid #27344a;background:#0b1019}
.board{display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);width:100%;height:100%}
.sq{position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;width:100%;height:100%}
.sq.lt{background:#eeeed2}
.sq.dk{background:#769656}
.sq.lm{box-shadow:inset 0 0 0 99px rgba(246,246,105,.52)}
.sq.sel{box-shadow:inset 0 0 0 99px rgba(245,158,11,.68)}
.sq.chk{background:radial-gradient(circle,#ef4444 0%,#b91c1c 75%)!important}
.sq.mv::after{content:'';position:absolute;width:28%;height:28%;border-radius:50%;background:rgba(15,23,42,.34);pointer-events:none}
.sq.cap::after{content:'';position:absolute;width:82%;height:82%;border-radius:50%;border:4px solid rgba(15,23,42,.36);pointer-events:none}
.coord-f{position:absolute;right:2px;bottom:1px;font-size:8px;font-weight:800;opacity:.75;pointer-events:none}
.coord-r{position:absolute;left:2px;top:1px;font-size:8px;font-weight:800;opacity:.75;pointer-events:none}
.sq.lt .coord-f,.sq.lt .coord-r{color:#5d7843}
.sq.dk .coord-f,.sq.dk .coord-r{color:#eeeed2}
.pc{width:84%;height:84%;pointer-events:none;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))}
.pc.pop{animation:pop .24s ease-out}
@keyframes pop{0%{transform:scale(1.22)}100%{transform:scale(1)}}
.ov{display:none;position:absolute;inset:0;background:rgba(10,14,23,.88);z-index:12;flex-direction:column;align-items:center;justify-content:center;padding:16px;text-align:center}
.ov.show{display:flex}
.ov h2{font-size:20px;font-weight:900;color:#fbbf24;margin-bottom:6px}
.ov p{font-size:13px;color:#cbd5e1;margin-bottom:12px}
.promo-row{display:flex;gap:10px;margin-top:8px}
.promo-btn{width:54px;height:54px;border-radius:12px;border:1.5px solid #38bdf8;background:#1e293b;display:flex;align-items:center;justify-content:center;cursor:pointer}
.status{margin-top:8px;font-size:12px;font-weight:700;color:#e2e8f0;background:#171e2e;border:1px solid #243046;border-radius:10px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.copybar{display:none;margin-top:8px;background:#13263d;border:1px solid #38bdf8;border-radius:10px;padding:8px 10px;align-items:center;justify-content:space-between;gap:8px}
.copybar.show{display:flex}
.copybar span{font-size:12px;font-weight:800;color:#bae6fd}
.cbtn{background:#0284c7;color:#fff;border:0;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:800;cursor:pointer}
.acts{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
.abtn{border:1px solid #2a3750;background:#1a2235;color:#e2e8f0;border-radius:10px;padding:8px 6px;font-size:11px;font-weight:800;cursor:pointer}
.abtn.danger{border-color:#7f1d1d;background:#2b151a;color:#fca5a5}
.ftr{margin-top:8px;text-align:center;font-size:10px;color:#64748b;font-weight:700;letter-spacing:.6px}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="top">
      <div class="brand">
        <span class="room-tag" id="roomTag"></span>
      </div>
      <span class="sync wait" id="syncPill"><span class="dot"></span><span id="syncTxt">MENGHUBUNGKAN...</span></span>
    </div>

    <div class="roles" id="roleBar">
      <button class="rbtn" data-role="w" id="rw">⬜ Putih</button>
      <button class="rbtn" data-role="b" id="rb">⬛ Hitam</button>
      <button class="rbtn" data-role="spec" id="rs">👁️ Nonton</button>
    </div>

    <div class="pbar" id="topBar">
      <span class="pname"><span class="pdot"></span><span id="topName"></span></span>
      <span class="caps" id="topCaps"></span>
    </div>

    <div class="bwrap">
      <div class="board" id="board"></div>
      <div class="ov" id="promoOv">
        <h2>Promosi Pion</h2>
        <p>Pilih bidak promosi:</p>
        <div class="promo-row" id="promoRow"></div>
      </div>
      <div class="ov" id="endOv">
        <h2 id="endTitle"></h2>
        <p id="endDesc"></p>
      </div>
    </div>

    <div class="pbar" id="botBar">
      <span class="pname"><span class="pdot"></span><span id="botName"></span></span>
      <span class="caps" id="botCaps"></span>
    </div>

    <div class="status">
      <span id="statusTxt">Giliran Putih</span>
      <span id="lastMvTxt" style="color:#94a3b8">-</span>
    </div>

    <div class="copybar" id="copyBar">
      <span id="copyLabel">Langkah: -</span>
      <button class="cbtn" id="copyBtn">📋 Salin & Kirim Chat</button>
    </div>

    <div class="acts">
      <button class="abtn" id="flipBtn">🔄 Flip</button>
      <button class="abtn" id="syncBtn">⚡ Sync</button>
      <button class="abtn danger" id="resignBtn">🏳️ Menyerah</button>
    </div>
    <div class="ftr" id="ftrTxt"></div>
  </div>
</div>
<script>
(()=>{
const CFG=${escapeJsonForHtml(cfg)};
const FILES='abcdefgh';
const SVG={
P:'<path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/>',
R:'<path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5l-3 3H14l-3-3zM14 17h17v12.5H14V17zM14 29.5l-1.5 2.5h20l-1.5-2.5H14z"/>',
N:'<path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/>',
B:'<path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>',
Q:'<path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26zM9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><circle cx="6" cy="12" r="2.2"/><circle cx="14" cy="9" r="2.2"/><circle cx="22.5" cy="8" r="2.2"/><circle cx="31" cy="9" r="2.2"/><circle cx="39" cy="12" r="2.2"/>',
K:'<path d="M22.5 11.63V6M20 8h5M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"/>'
};
function pieceSvg(code,cls){
  const isW=code[0]==='w';
  const fill=isW?'#ffffff':'#181c24';
  const stroke=isW?'#181c24':'#f1f5f9';
  return '<svg class="pc '+(cls||'')+'" viewBox="0 0 45 45" fill="'+fill+'" stroke="'+stroke+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+SVG[code[1]]+'</svg>';
}
function initBoard(){
  return [
    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
    ['bP','bP','bP','bP','bP','bP','bP','bP'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['wP','wP','wP','wP','wP','wP','wP','wP'],
    ['wR','wN','wB','wQ','wK','wB','wN','wR']
  ];
}
const st={
  board:initBoard(),turn:'w',castling:{K:true,Q:true,k:true,q:true},
  ep:null,last:null,moves:[],caps:{w:[],b:[]},over:false,
  whiteName:CFG.whiteName,blackName:CFG.blackName
};
let myRole=CFG.role==='auto'?'w':CFG.role;
let flipped=myRole==='b';
let sel=null,selMoves=[],pendingPromo=null,liveOnline=false,lastLocalCopy='';
const inB=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const cloneB=b=>b.map(r=>r.slice());
const toSq=(r,c)=>FILES[c]+(8-r);
const fromSq=s=>({r:8-parseInt(s[1],10),c:FILES.indexOf(s[0])});
function findK(b,col){for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===col+'K')return{r,c};return null;}
function attacked(b,tr,tc,by){
  const pd=by==='w'?1:-1;
  for(const dc of[-1,1])if(inB(tr+pd,tc+dc)&&b[tr+pd][tc+dc]===by+'P')return true;
  for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])if(inB(tr+dr,tc+dc)&&b[tr+dr][tc+dc]===by+'N')return true;
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if((dr||dc)&&inB(tr+dr,tc+dc)&&b[tr+dr][tc+dc]===by+'K')return true;
  for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){let r=tr+dr,c=tc+dc;while(inB(r,c)){const p=b[r][c];if(p){if(p===by+'R'||p===by+'Q')return true;break;}r+=dr;c+=dc;}}
  for(const[dr,dc]of[[-1,-1],[-1,1],[1,-1],[1,1]]){let r=tr+dr,c=tc+dc;while(inB(r,c)){const p=b[r][c];if(p){if(p===by+'B'||p===by+'Q')return true;break;}r+=dr;c+=dc;}}
  return false;
}
function inChk(b,col){const k=findK(b,col);return k?attacked(b,k.r,k.c,col==='w'?'b':'w'):false;}
function pseudo(r,c){
  const p=st.board[r][c];if(!p)return[];
  const col=p[0],t=p[1],opp=col==='w'?'b':'w',ms=[];
  if(t==='P'){
    const d=col==='w'?-1:1,sr=col==='w'?6:1,pr=col==='w'?0:7,nr=r+d;
    if(inB(nr,c)&&!st.board[nr][c]){
      ms.push({fr:r,fc:c,tr:nr,tc:c,promo:nr===pr});
      if(r===sr&&!st.board[r+d*2][c])ms.push({fr:r,fc:c,tr:r+d*2,tc:c,dbl:true});
    }
    for(const dc of[-1,1]){
      const nc=c+dc;if(!inB(nr,nc))continue;
      if(st.board[nr][nc]&&st.board[nr][nc][0]===opp)ms.push({fr:r,fc:c,tr:nr,tc:nc,promo:nr===pr});
      else if(st.ep&&st.ep.r===nr&&st.ep.c===nc)ms.push({fr:r,fc:c,tr:nr,tc:nc,ep:true});
    }
  }else if(t==='N'){
    for(const[dr,dc]of[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){
      const nr=r+dr,nc=c+dc;if(inB(nr,nc)&&(!st.board[nr][nc]||st.board[nr][nc][0]===opp))ms.push({fr:r,fc:c,tr:nr,tc:nc});
    }
  }else if(t==='B'||t==='R'||t==='Q'){
    const dirs=[];
    if(t!=='R')dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
    if(t!=='B')dirs.push([-1,0],[1,0],[0,-1],[0,1]);
    for(const[dr,dc]of dirs){
      let nr=r+dr,nc=c+dc;
      while(inB(nr,nc)){
        if(!st.board[nr][nc])ms.push({fr:r,fc:c,tr:nr,tc:nc});
        else{if(st.board[nr][nc][0]===opp)ms.push({fr:r,fc:c,tr:nr,tc:nc});break;}
        nr+=dr;nc+=dc;
      }
    }
  }else if(t==='K'){
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc){
      const nr=r+dr,nc=c+dc;if(inB(nr,nc)&&(!st.board[nr][nc]||st.board[nr][nc][0]===opp))ms.push({fr:r,fc:c,tr:nr,tc:nc});
    }
    const hr=col==='w'?7:0;
    if(r===hr&&c===4&&!inChk(st.board,col)){
      if(st.castling[col==='w'?'K':'k']&&!st.board[hr][5]&&!st.board[hr][6]&&st.board[hr][7]===col+'R'&&!attacked(st.board,hr,5,opp)&&!attacked(st.board,hr,6,opp))ms.push({fr:hr,fc:4,tr:hr,tc:6,castle:'K'});
      if(st.castling[col==='w'?'Q':'q']&&!st.board[hr][3]&&!st.board[hr][2]&&!st.board[hr][1]&&st.board[hr][0]===col+'R'&&!attacked(st.board,hr,3,opp)&&!attacked(st.board,hr,2,opp))ms.push({fr:hr,fc:4,tr:hr,tc:2,castle:'Q'});
    }
  }
  return ms;
}
function applyB(b,mv,pp){
  const n=cloneB(b),m=n[mv.fr][mv.fc],col=m[0];
  let cap=n[mv.tr][mv.tc];n[mv.fr][mv.fc]=null;
  if(mv.ep){const cr=col==='w'?mv.tr+1:mv.tr-1;cap=n[cr][mv.tc];n[cr][mv.tc]=null;}
  if(mv.castle==='K'){n[mv.tr][5]=n[mv.tr][7];n[mv.tr][7]=null;}
  if(mv.castle==='Q'){n[mv.tr][3]=n[mv.tr][0];n[mv.tr][0]=null;}
  n[mv.tr][mv.tc]=mv.promo?(col+(pp||'Q')):m;
  return{n,cap};
}
function legalMoves(col){
  const out=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=st.board[r][c];if(!p||p[0]!==col)continue;
    for(const mv of pseudo(r,c)){if(!inChk(applyB(st.board,mv,'Q').n,col))out.push(mv);}
  }
  return out;
}
function doCoordMove(coordStr){
  if(st.over)return false;
  const s=String(coordStr||'').toLowerCase().trim();
  const m=s.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/);
  if(!m)return false;
  const f=fromSq(m[1]),t=fromSq(m[2]),pp=(m[3]||'q').toUpperCase();
  const leg=legalMoves(st.turn);
  const mv=leg.find(x=>x.fr===f.r&&x.fc===f.c&&x.tr===t.r&&x.tc===t.c);
  if(!mv)return false;
  const moving=st.board[mv.fr][mv.fc],col=st.turn,opp=col==='w'?'b':'w';
  const{n,cap}=applyB(st.board,mv,pp);
  st.board=n;st.last={fr:mv.fr,fc:mv.fc,tr:mv.tr,tc:mv.tc};
  st.ep=mv.dbl?{r:(mv.fr+mv.tr)/2,c:mv.fc}:null;
  if(moving==='wK'){st.castling.K=false;st.castling.Q=false;}
  if(moving==='bK'){st.castling.k=false;st.castling.q=false;}
  if(mv.fr===7&&mv.fc===0)st.castling.Q=false;if(mv.fr===7&&mv.fc===7)st.castling.K=false;
  if(mv.fr===0&&mv.fc===0)st.castling.q=false;if(mv.fr===0&&mv.fc===7)st.castling.k=false;
  if(mv.tr===7&&mv.tc===0)st.castling.Q=false;if(mv.tr===7&&mv.tc===7)st.castling.K=false;
  if(mv.tr===0&&mv.tc===0)st.castling.q=false;if(mv.tr===0&&mv.tc===7)st.castling.k=false;
  if(cap)st.caps[col].push(cap[1]);
  const cleanCoord=m[1]+m[2]+(mv.promo?pp.toLowerCase():'');
  st.moves.push(cleanCoord);
  st.turn=opp;
  sel=null;selMoves=[];
  const oppLeg=legalMoves(opp);
  if(oppLeg.length===0){
    st.over=true;
    const chk=inChk(st.board,opp);
    showEnd(chk?'SKAKMAT! 🏆':'SERI (STALEMATE)',chk?((col==='w'?'Putih':'Hitam')+' memenangkan pertandingan!'):'Tidak ada langkah legal tersisa.');
  }
  return cleanCoord;
}
function showEnd(title,desc){
  document.getElementById('endTitle').textContent=title;
  document.getElementById('endDesc').textContent=desc;
  document.getElementById('endOv').classList.add('show');
}
function setSyncState(mode,txt){
  const pill=document.getElementById('syncPill');
  pill.className='sync '+mode;
  document.getElementById('syncTxt').textContent=txt;
}
function updateRolesUI(){
  ['w','b','spec'].forEach(r=>{
    const el=document.getElementById(r==='w'?'rw':r==='b'?'rb':'rs');
    if(el)el.classList.toggle('on',myRole===r);
  });
}
function render(){
  document.getElementById('roomTag').textContent='♟️ '+CFG.code;
  document.getElementById('ftrTxt').textContent=CFG.botname.toUpperCase()+' • REALTIME RICH CHESS CO-OP';
  updateRolesUI();
  const topColor=flipped?'w':'b',botColor=flipped?'b':'w';
  document.getElementById('topName').textContent=(topColor==='w'?'⬜ ':'⬛ ')+(topColor==='w'?st.whiteName:st.blackName);
  document.getElementById('botName').textContent=(botColor==='w'?'⬜ ':'⬛ ')+(botColor==='w'?st.whiteName:st.blackName);
  document.getElementById('topCaps').textContent=st.caps[topColor].join(' ');
  document.getElementById('botCaps').textContent=st.caps[botColor].join(' ');
  document.getElementById('topBar').classList.toggle('turn',!st.over&&st.turn===topColor);
  document.getElementById('botBar').classList.toggle('turn',!st.over&&st.turn===botColor);
  const chkPos=inChk(st.board,st.turn)?findK(st.board,st.turn):null;
  const boardEl=document.getElementById('board');
  boardEl.innerHTML='';
  for(let vr=0;vr<8;vr++){
    for(let vc=0;vc<8;vc++){
      const r=flipped?7-vr:vr,c=flipped?7-vc:vc;
      const sq=document.createElement('div');
      sq.className='sq '+((r+c)%2===0?'lt':'dk');
      if(st.last&&((st.last.fr===r&&st.last.fc===c)||(st.last.tr===r&&st.last.tc===c)))sq.classList.add('lm');
      if(sel&&sel.r===r&&sel.c===c)sq.classList.add('sel');
      if(chkPos&&chkPos.r===r&&chkPos.c===c)sq.classList.add('chk');
      const targetMv=selMoves.find(x=>x.tr===r&&x.tc===c);
      if(targetMv)sq.classList.add(st.board[r][c]||targetMv.ep?'cap':'mv');
      if(vc===0){const cr=document.createElement('span');cr.className='coord-r';cr.textContent=String(8-r);sq.appendChild(cr);}
      if(vr===7){const cf=document.createElement('span');cf.className='coord-f';cf.textContent=FILES[c];sq.appendChild(cf);}
      const p=st.board[r][c];
      if(p){
        const isLastDest=st.last&&st.last.tr===r&&st.last.tc===c;
        sq.insertAdjacentHTML('beforeend',pieceSvg(p,isLastDest?'pop':''));
      }
      sq.onclick=()=>onSqTap(r,c);
      boardEl.appendChild(sq);
    }
  }
  const turnLbl=st.turn==='w'?'Putih ⬜':'Hitam ⬛';
  const myTurn=!st.over&&myRole===st.turn;
  document.getElementById('statusTxt').textContent=st.over?'Permainan Selesai':(myTurn?'Giliran KAMU ('+turnLbl+')':'Menunggu '+turnLbl+(chkPos?' • SKAK!':''));
  document.getElementById('lastMvTxt').textContent=st.moves.length?('#'+st.moves.length+' '+st.moves[st.moves.length-1]):'Belum ada langkah';
}
async function pushEvent(payload){
  try{
    const res=await fetch(CFG.relay+'/'+CFG.topic,{method:'POST',body:JSON.stringify(payload)});
    if(res.ok){liveOnline=true;setSyncState('live','LIVE ONLINE');return true;}
  }catch(_){}
  liveOnline=false;setSyncState('chat','SINKRON CHAT WA');
  return false;
}
function showCopyMove(mv){
  lastLocalCopy=mv;
  document.getElementById('copyLabel').textContent='Kirim langkah ke chat WA: '+mv;
  document.getElementById('copyBar').classList.add('show');
}
async function commitLocalMove(mv,promo){
  const coord=toSq(mv.fr,mv.fc)+toSq(mv.tr,mv.tc)+(mv.promo?(promo||'q').toLowerCase():'');
  const movedCol=st.turn;
  const done=doCoordMove(coord);
  if(!done)return;
  render();
  const ok=await pushEvent({t:'m',mv:done,c:movedCol,n:st.moves.length,src:'html'});
  if(!ok)showCopyMove(done);
}
function openPromo(mv){
  pendingPromo=mv;
  const row=document.getElementById('promoRow');
  row.innerHTML='';
  ['Q','R','B','N'].forEach(pt=>{
    const b=document.createElement('button');
    b.className='promo-btn';
    b.innerHTML=pieceSvg(st.turn+pt,'');
    b.onclick=()=>{
      document.getElementById('promoOv').classList.remove('show');
      const cur=pendingPromo;pendingPromo=null;
      commitLocalMove(cur,pt);
    };
    row.appendChild(b);
  });
  document.getElementById('promoOv').classList.add('show');
}
function onSqTap(r,c){
  if(st.over||myRole==='spec')return;
  if(st.turn!==myRole)return;
  const hit=selMoves.find(x=>x.tr===r&&x.tc===c);
  if(hit){
    if(hit.promo)return openPromo(hit);
    return commitLocalMove(hit,'Q');
  }
  const p=st.board[r][c];
  if(p&&p[0]===myRole){
    sel={r,c};
    selMoves=legalMoves(myRole).filter(x=>x.fr===r&&x.fc===c);
  }else{
    sel=null;selMoves=[];
  }
  render();
}
function handleRemoteMsg(raw){
  let data=null;
  try{data=JSON.parse(raw);}catch(_){return;}
  if(!data||typeof data!=='object')return;
  if(data.t==='hello'){
    if(data.c==='b'&&data.by)st.blackName=String(data.by).slice(0,20);
    if(data.c==='w'&&data.by)st.whiteName=String(data.by).slice(0,20);
    render();return;
  }
  if(data.t==='resign'&&!st.over){
    st.over=true;
    const w=data.c==='w'?'Hitam ⬛':'Putih ⬜';
    showEnd('MENYERAH 🏳️',w+' memenangkan pertandingan!');
    render();return;
  }
  if(data.t==='m'&&data.mv){
    const n=Number(data.n||0);
    if(n&&n<=st.moves.length)return;
    if(doCoordMove(data.mv))render();
  }
}
let wsConn=null,esConn=null;
function connectLive(){
  setSyncState('wait','MENGHUBUNGKAN...');
  let settled=false;
  const onConnected=()=>{if(!settled){settled=true;liveOnline=true;setSyncState('live','LIVE ONLINE');}};
  const fallbackToChat=()=>{if(!settled&&!liveOnline){setSyncState('chat','SINKRON CHAT WA');}};
  const startSse=()=>{
    try{
      if(esConn){try{esConn.close();}catch(_){}}
      esConn=new EventSource(CFG.relay+'/'+CFG.topic+'/sse?since=all');
      esConn.onopen=onConnected;
      esConn.onmessage=(ev)=>{
        onConnected();
        try{const o=JSON.parse(ev.data);if(o&&o.message)handleRemoteMsg(o.message);}catch(_){}
      };
      esConn.onerror=()=>{setTimeout(fallbackToChat,1500);};
    }catch(_){fallbackToChat();}
  };
  try{
    if(wsConn){try{wsConn.close();}catch(_){}}
    wsConn=new WebSocket(CFG.wsRelay+'/'+CFG.topic+'/ws?since=all');
    wsConn.onopen=onConnected;
    wsConn.onmessage=(ev)=>{
      onConnected();
      try{const o=JSON.parse(ev.data);if(o&&o.event==='message'&&o.message)handleRemoteMsg(o.message);}catch(_){}
    };
    wsConn.onerror=()=>{if(!liveOnline)startSse();};
  }catch(_){startSse();}
  setTimeout(fallbackToChat,3200);
}
async function manualSync(){
  try{
    const res=await fetch(CFG.relay+'/'+CFG.topic+'/json?poll=1&since=all');
    if(res.ok){
      liveOnline=true;setSyncState('live','LIVE ONLINE');
      const txt=await res.text();
      txt.split('\\n').filter(Boolean).forEach(line=>{
        try{const o=JSON.parse(line);if(o&&o.message)handleRemoteMsg(o.message);}catch(_){}
      });
      return;
    }
  }catch(_){}
  setSyncState('chat','SINKRON CHAT WA');
}
document.querySelectorAll('.rbtn').forEach(b=>{
  b.onclick=()=>{
    myRole=b.dataset.role;
    if(myRole==='w')flipped=false;
    if(myRole==='b')flipped=true;
    sel=null;selMoves=[];
    render();
  };
});
document.getElementById('flipBtn').onclick=()=>{flipped=!flipped;render();};
document.getElementById('syncBtn').onclick=()=>{manualSync();};
document.getElementById('resignBtn').onclick=async()=>{
  if(st.over||myRole==='spec')return;
  st.over=true;
  const w=myRole==='w'?'Hitam ⬛':'Putih ⬜';
  showEnd('MENYERAH 🏳️',w+' memenangkan pertandingan!');
  render();
  const ok=await pushEvent({t:'resign',c:myRole,src:'html'});
  if(!ok)showCopyMove('.chess resign');
};
document.getElementById('copyBtn').onclick=()=>{
  if(!lastLocalCopy)return;
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(lastLocalCopy).catch(()=>{});
  }
  document.getElementById('copyBtn').textContent='✅ Tersalin: '+lastLocalCopy;
  setTimeout(()=>{document.getElementById('copyBtn').textContent='📋 Salin & Kirim Chat';},2000);
};
if(CFG.role==='w'||CFG.role==='b'){
  document.getElementById('roleBar').style.display='none';
}
CFG.moves.forEach(mv=>doCoordMove(mv));
render();
connectLive();
})();
</script>
</body>
</html>`;
}

function getBotKey(Dinz) {
    return Dinz?.isJadibot && Dinz?.jadibotNumber ? Dinz.jadibotNumber : 'main';
}

function cleanNum(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function getRoomKey(room) {
    return `${room.botKey}_${room.code}`;
}

function publishRelayEvent(room, payload) {
    if (!room || !room.topic) return Promise.resolve(false);
    return new Promise((resolve) => {
        try {
            const body = JSON.stringify(payload);
            const req = https.request({
                hostname: RELAY_HOST,
                path: `/${room.topic}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Content-Length': Buffer.byteLength(body)
                },
                timeout: 8000
            }, (res) => {
                res.resume();
                resolve(res.statusCode >= 200 && res.statusCode < 300);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => { req.destroy(); resolve(false); });
            req.write(body);
            req.end();
        } catch (_) {
            resolve(false);
        }
    });
}

function stopRoomRelayWatcher(room) {
    if (!room) return;
    const key = getRoomKey(room);
    const w = watchers.get(key);
    if (!w) return;
    w.closed = true;
    if (w.reconnectTimer) clearTimeout(w.reconnectTimer);
    if (w.ttlTimer) clearTimeout(w.ttlTimer);
    if (w.req) {
        try { w.req.destroy(); } catch (_) {}
    }
    watchers.delete(key);
}

function startRoomRelayWatcher(Dinz, room, botname = 'HuTao - MD') {
    if (!room || !room.topic) return;
    const key = getRoomKey(room);
    if (watchers.has(key)) return;

    const state = { closed: false, req: null, reconnectTimer: null, ttlTimer: null };
    watchers.set(key, state);

    state.ttlTimer = setTimeout(() => {
        stopRoomRelayWatcher(room);
        rooms.delete(key);
    }, ROOM_TTL_MS);

    const handleFinish = async ({ title, winnerColor, reasonText }) => {
        const currentRoom = rooms.get(key);
        if (!currentRoom) return;
        stopRoomRelayWatcher(currentRoom);
        rooms.delete(key);

        let rewardLine = '';
        let winnerJid = '';
        if (winnerColor) {
            winnerJid = winnerColor === 'w' ? currentRoom.whiteJid : currentRoom.blackJid;
            if (winnerJid) {
                const reward = botCtx.runWithBotContext(Dinz, () => grantRandomGameReward(winnerJid, 1.5));
                rewardLine = `\n> ◦ *Pemenang :* @${cleanNum(winnerJid)} (${winnerColor === 'w' ? 'Putih ⬜' : 'Hitam ⬛'})\n> ◦ *Hadiah Random :*\n> ◦ ${reward.summary}`;
            } else {
                rewardLine = `\n> ◦ *Pemenang :* ${winnerColor === 'w' ? 'Putih ⬜' : 'Hitam ⬛'}`;
            }
        }

        const msg =
            `\`⌜ ${title} (${currentRoom.code}) ⌟\`\n` +
            `> ◦ *Info :* ${reasonText}${rewardLine}`;
        const mentions = [currentRoom.whiteJid, currentRoom.blackJid].filter(Boolean);
        const targets = [...new Set([currentRoom.whiteChat, currentRoom.blackChat].filter(Boolean))];
        for (const jid of targets) {
            await Dinz.sendMessage(jid, {
                text: msg,
                contextInfo: mentions.length ? { mentionedJid: mentions } : undefined
            }).catch(() => {});
        }
    };

    const connect = () => {
        if (state.closed || !rooms.has(key)) return;
        try {
            const req = https.get(`https://${RELAY_HOST}/${room.topic}/sse?since=all`, (res) => {
                if (res.statusCode !== 200) {
                    res.resume();
                    if (!state.closed) state.reconnectTimer = setTimeout(connect, 5000);
                    return;
                }
                let buf = '';
                res.on('data', (chunk) => {
                    if (state.closed) return;
                    buf += chunk.toString('utf8');
                    const lines = buf.split('\n');
                    buf = lines.pop() || '';
                    for (const line of lines) {
                        if (!line.startsWith('data:')) continue;
                        const raw = line.slice(5).trim();
                        if (!raw) continue;
                        let outer = null;
                        try { outer = JSON.parse(raw); } catch (_) { continue; }
                        if (!outer || outer.event !== 'message' || !outer.message) continue;
                        let ev = null;
                        try { ev = JSON.parse(outer.message); } catch (_) { continue; }
                        if (!ev || typeof ev !== 'object') continue;

                        const currentRoom = rooms.get(key);
                        if (!currentRoom) { stopRoomRelayWatcher(room); return; }

                        if (ev.t === 'resign' && ev.src === 'html') {
                            const wCol = ev.c === 'w' ? 'b' : 'w';
                            handleFinish({
                                title: '🏳️ CATUR RICH SELESAI',
                                winnerColor: wCol,
                                reasonText: `${ev.c === 'w' ? 'Putih' : 'Hitam'} memilih menyerah di papan Rich HTML.`
                            }).catch(() => {});
                            return;
                        }

                        if (ev.t === 'm' && ev.mv && ev.src === 'html') {
                            const seq = Number(ev.n || 0);
                            const curLen = (currentRoom.movesCoord || []).length;
                            if (seq && seq <= curLen) continue;
                            currentRoom.status = 'playing';
                            const mRes = executeChessMove(currentRoom, ev.mv);
                            if (mRes.ok && mRes.outcome !== 'playing') {
                                if (mRes.outcome === 'checkmate') {
                                    handleFinish({
                                        title: '♟️ SKAKMAT! CATUR RICH SELESAI 🏆',
                                        winnerColor: mRes.winnerColor,
                                        reasonText: `Langkah penutup *${mRes.notation}*`
                                    }).catch(() => {});
                                } else {
                                    handleFinish({
                                        title: '♟️ CATUR RICH SERI 🤝',
                                        winnerColor: null,
                                        reasonText: `Hasil *${mRes.outcome === 'stalemate' ? 'Stalemate' : 'Seri'}* (${mRes.notation})`
                                    }).catch(() => {});
                                }
                                return;
                            }
                        }
                    }
                });
                res.on('end', () => {
                    if (!state.closed && rooms.has(key)) {
                        state.reconnectTimer = setTimeout(connect, 4000);
                    }
                });
                res.on('error', () => {
                    if (!state.closed && rooms.has(key)) {
                        state.reconnectTimer = setTimeout(connect, 5000);
                    }
                });
            });
            req.on('error', () => {
                if (!state.closed && rooms.has(key)) {
                    state.reconnectTimer = setTimeout(connect, 5000);
                }
            });
            state.req = req;
        } catch (_) {
            if (!state.closed && rooms.has(key)) {
                state.reconnectTimer = setTimeout(connect, 5000);
            }
        }
    };

    connect();
}

function findActiveRoomForPlayer(Dinz, senderJid, chatId) {
    const botKey = getBotKey(Dinz);
    const sNum = cleanNum(senderJid);
    for (const room of rooms.values()) {
        if (room.botKey !== botKey) continue;
        const isW = cleanNum(room.whiteJid) === sNum;
        const isB = room.blackJid && cleanNum(room.blackJid) === sNum;
        if (isW || isB) {
            if (room.whiteChat === chatId || room.blackChat === chatId) return room;
        }
    }
    return null;
}

function findWaitingRoomInChat(Dinz, chatId) {
    const botKey = getBotKey(Dinz);
    for (const room of rooms.values()) {
        if (room.botKey === botKey && room.status === 'waiting' && room.whiteChat === chatId) {
            return room;
        }
    }
    return null;
}

function createChessRoom(Dinz, { whiteJid, whiteName, whiteChat, invitedBlackJid = '' }) {
    const botKey = getBotKey(Dinz);
    const code = `CH-${Math.floor(1000 + Math.random() * 9000)}`;
    const topic = `htc_${crypto.randomBytes(8).toString('hex')}`;
    const room = {
        code,
        topic,
        botKey,
        status: 'waiting',
        whiteJid,
        whiteName: whiteName || cleanNum(whiteJid),
        whiteChat,
        blackJid: invitedBlackJid || '',
        blackName: '',
        blackChat: invitedBlackJid ? whiteChat : '',
        board: makeInitialBoard(),
        turn: 'w',
        castling: { K: true, Q: true, k: true, q: true },
        enPassant: null,
        lastMove: null,
        captured: { w: [], b: [] },
        movesCoord: [],
        history: [],
        drawOfferBy: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    rooms.set(`${botKey}_${code}`, room);
    return room;
}

function deleteChessRoom(room) {
    if (!room) return;
    stopRoomRelayWatcher(room);
    rooms.delete(`${room.botKey}_${room.code}`);
}

function getRoomByCode(Dinz, rawCode) {
    const botKey = getBotKey(Dinz);
    const c = String(rawCode || '').trim().toUpperCase();
    const norm = c.startsWith('CH-') ? c : `CH-${c.replace(/[^0-9]/g, '')}`;
    return rooms.get(`${botKey}_${norm}`) || null;
}

async function sendRichBoardToChat(Dinz, jid, room, { role = 'auto', botname = 'HuTao - MD' } = {}) {
    const htmlPayload = buildRichChessHtml(room, { role, botname });
    return sendRichHtmlToJid(Dinz, jid, {
        title: `♟️ Chess Co-op ${room.code} - ${botname}`,
        htmlPayload,
        trustedSources: [RELAY_HOST, 'nox.dev']
    });
}

async function broadcastBoard(Dinz, room, caption, mentions = [], quoted = null, botname = 'HuTao - MD') {
    const sameChat = Boolean(room.whiteChat && room.blackChat && room.whiteChat === room.blackChat);
    const targets = [...new Set([room.whiteChat, room.blackChat].filter(Boolean))];

    for (const jid of targets) {
        const role = sameChat ? 'auto' : (jid === room.whiteChat ? 'w' : 'b');
        try {
            await sendRichBoardToChat(Dinz, jid, room, { role, botname });
        } catch (err) {
            console.error('[ChessRich] sendRichBoardToChat error:', err?.message || err);
        }
        if (caption) {
            const opts = quoted && jid === quoted.chat ? { quoted } : {};
            await Dinz.sendMessage(jid, {
                text: caption,
                contextInfo: mentions.length ? { mentionedJid: mentions } : undefined
            }, opts).catch(() => {});
        }
    }
}

async function handleQuickChessMove(Dinz, m, body, botname = 'HuTao - MD') {
    const text = String(body || '').trim();
    if (!text) return false;
    const isMovePattern = /^([a-h][1-8]\s*-?\s*[a-h][1-8][qrbn]?|o-o(-o)?|0-0(-0)?|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](=?[QRBN])?[+#]?)$/i.test(text);
    if (!isMovePattern) return false;

    const room = findActiveRoomForPlayer(Dinz, m.sender, m.chat);
    if (!room || room.status !== 'playing') return false;

    const sNum = cleanNum(m.sender);
    const playerColor = cleanNum(room.whiteJid) === sNum ? 'w' : (cleanNum(room.blackJid) === sNum ? 'b' : null);
    if (!playerColor) return false;
    if (room.turn !== playerColor) {
        await Dinz.sendMessage(m.chat, { text: `⏳ Bukan giliran kamu! Sekarang giliran *${room.turn === 'w' ? 'Putih' : 'Hitam'}*.` }, { quoted: m });
        return true;
    }

    const res = executeChessMove(room, text);
    if (!res.ok) {
        await Dinz.sendMessage(m.chat, { text: `❌ ${res.reason}` }, { quoted: m });
        return true;
    }

    await publishRelayEvent(room, {
        t: 'm',
        mv: res.coordMove,
        c: res.movedColor,
        n: res.moveIndex,
        src: 'bot'
    });

    const nextJid = room.turn === 'w' ? room.whiteJid : room.blackJid;
    const nextColorLabel = room.turn === 'w' ? 'Putih ⬜' : 'Hitam ⬛';
    const mentions = [room.whiteJid, room.blackJid].filter(Boolean);

    if (res.outcome === 'checkmate') {
        const winnerJid = res.winnerColor === 'w' ? room.whiteJid : room.blackJid;
        const reward = grantRandomGameReward(winnerJid, 1.5);
        const cap =
            `\`⌜ ♟️ SKAKMAT! CATUR RICH SELESAI 🏆 ⌟\`\n` +
            `> ◦ *Langkah Terakhir :* ${res.notation}\n` +
            `> ◦ *Pemenang :* @${cleanNum(winnerJid)} (${res.winnerColor === 'w' ? 'Putih' : 'Hitam'})\n` +
            `> ◦ *Hadiah Random :*\n` +
            `> ◦ ${reward.summary}`;
        await broadcastBoard(Dinz, room, cap, mentions, m, botname);
        deleteChessRoom(room);
        return true;
    }

    if (res.outcome === 'stalemate' || res.outcome === 'draw') {
        const cap =
            `\`⌜ ♟️ CATUR RICH SERI (DRAW) 🤝 ⌟\`\n` +
            `> ◦ *Langkah Terakhir :* ${res.notation}\n` +
            `> ◦ *Status :* ${res.outcome === 'stalemate' ? 'Stalemate (Buntu)' : 'Seri'}`;
        await broadcastBoard(Dinz, room, cap, mentions, m, botname);
        deleteChessRoom(room);
        return true;
    }

    const cap =
        `\`⌜ ♟️ CATUR RICH ONLINE (${room.code}) ⌟\`\n` +
        `> ◦ *Langkah :* *${res.notation}*${res.inCheck ? '  ⚠️ *SKAK!*' : ''}\n` +
        `> ◦ *Giliran :* ${nextColorLabel} (@${cleanNum(nextJid)})\n` +
        `> ◦ *Main :* Sentuh langsung papan Rich HTML di atas (atau ketik \`e7e5\`)`;
    await broadcastBoard(Dinz, room, cap, mentions, m, botname);
    return true;
}

module.exports = {
    rooms,
    createChessRoom,
    deleteChessRoom,
    getRoomByCode,
    findActiveRoomForPlayer,
    findWaitingRoomInChat,
    executeChessMove,
    getAllLegalMoves,
    sqToRC,
    rcToSq,
    buildRichChessHtml,
    sendRichBoardToChat,
    broadcastBoard,
    publishRelayEvent,
    startRoomRelayWatcher,
    stopRoomRelayWatcher,
    handleQuickChessMove,
    cleanNum,
    formatCard
};
