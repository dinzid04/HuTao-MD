const presenceStore = (global._livePresenceMap = global._livePresenceMap || new Map());

function getBotKey(sock) {
    return sock?.isJadibot && sock?.jadibotNumber ? String(sock.jadibotNumber) : 'main';
}

function cleanNum(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function canonicalNum(jid) {
    const d = cleanNum(jid);
    if (!d) return '';
    if (global.lidMap && global.lidMap[d]) return cleanNum(global.lidMap[d]);
    return d;
}

function getBucket(sock) {
    const key = getBotKey(sock);
    if (!presenceStore.has(key)) presenceStore.set(key, new Map());
    return presenceStore.get(key);
}

function recordPresence(sock, chatId, presences) {
    if (!presences || typeof presences !== 'object') return;
    const bucket = getBucket(sock);
    const now = Date.now();
    for (const [jid, info] of Object.entries(presences)) {
        const canon = canonicalNum(jid);
        if (!canon) continue;
        const status = info?.lastKnownPresence || 'unavailable';
        const prev = bucket.get(canon) || {};
        const lastOnlineAt = ['available', 'composing', 'recording'].includes(status)
            ? now
            : (info?.lastSeen ? Number(info.lastSeen) * 1000 : (prev.lastOnlineAt || 0));
        bucket.set(canon, {
            jid: `${canon}@s.whatsapp.net`,
            rawJid: jid,
            status,
            chatId: chatId || prev.chatId || '',
            updatedAt: now,
            lastOnlineAt
        });
    }
}

function attachPresenceListener(sock) {
    if (!sock || !sock.ev || sock._presenceListenerAttached) return;
    sock._presenceListenerAttached = true;
    sock.ev.on('presence.update', (update) => {
        try {
            if (!update) return;
            recordPresence(sock, update.id, update.presences);
        } catch (_) {}
    });
}

async function probeGroupPresence(sock, chatId, participants = []) {
    try {
        if (typeof sock?.presenceSubscribe === 'function') {
            await sock.presenceSubscribe(chatId).catch(() => {});
            const sample = participants.slice(0, 25);
            await Promise.all(sample.map((p) => {
                const jid = p?.jid || p?.phoneNumber || p?.id;
                if (!jid) return Promise.resolve();
                return sock.presenceSubscribe(jid).catch(() => {});
            }));
            await new Promise((r) => setTimeout(r, 1400));
        }
    } catch (_) {}
}

function getLiveOnlineMembers(sock, chatId, participants = []) {
    const bucket = getBucket(sock);
    const now = Date.now();
    const liveCutoff = now - 3 * 60 * 1000;
    const recentChatCutoff = now - 10 * 60 * 1000;
    const chatStats = global.db?.groups?.[chatId]?.chatStats || {};

    const results = new Map();
    const partCanonMap = new Map();

    for (const p of participants) {
        const jid = p?.jid || p?.phoneNumber || p?.id || '';
        const canon = canonicalNum(jid);
        if (canon) partCanonMap.set(canon, `${canon}@s.whatsapp.net`);
    }

    for (const [canon, rec] of bucket.entries()) {
        if (partCanonMap.size > 0 && !partCanonMap.has(canon)) continue;
        const isLive = ['available', 'composing', 'recording'].includes(rec.status) && rec.updatedAt >= liveCutoff;
        if (isLive) {
            const label = rec.status === 'composing'
                ? '✍️ Mengetik (Live)'
                : rec.status === 'recording'
                    ? '🎙️ Merekam (Live)'
                    : '🟢 Online (Live)';
            results.set(canon, {
                jid: partCanonMap.get(canon) || rec.jid,
                canon,
                priority: rec.status === 'available' ? 2 : 3,
                label,
                ts: rec.updatedAt
            });
        }
    }

    for (const [rawJid, stat] of Object.entries(chatStats)) {
        const canon = canonicalNum(rawJid);
        if (!canon) continue;
        if (partCanonMap.size > 0 && !partCanonMap.has(canon)) continue;
        if ((stat?.lastChat || 0) >= recentChatCutoff && !results.has(canon)) {
            const mins = Math.max(1, Math.floor((now - stat.lastChat) / 60000));
            results.set(canon, {
                jid: partCanonMap.get(canon) || `${canon}@s.whatsapp.net`,
                canon,
                priority: 1,
                label: `🟡 Baru Aktif (${mins}m lalu)`,
                ts: stat.lastChat
            });
        }
    }

    return [...results.values()].sort((a, b) => (b.priority - a.priority) || (b.ts - a.ts));
}

module.exports = {
    attachPresenceListener,
    recordPresence,
    probeGroupPresence,
    getLiveOnlineMembers,
    canonicalNum
};
