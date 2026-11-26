const { formatCard, formatNumber } = require('../../utils/formatter');

function cleanNum(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function getGroupObj(chatId) {
    if (!global.db.groups[chatId] || typeof global.db.groups[chatId] !== 'object') {
        global.db.groups[chatId] = {};
    }
    return global.db.groups[chatId];
}

function parseDurationMs(str) {
    const match = String(str || '').trim().match(/^(\d+)(s|m|h|d)$/i);
    if (!match) return null;
    const n = parseInt(match[1], 10);
    const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return n * mult[match[2].toLowerCase()];
}

function genGiveawayId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = 'GA-';
    for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

async function finalizeGiveaway(Dinz, botCtx, gaId, reroll = false) {
    const giveaways = botCtx.getSection('giveaways', Dinz) || {};
    const ga = giveaways[gaId];
    if (!ga) return null;
    if (!reroll && ga.ended) return ga;

    ga.ended = true;
    const pool = Array.isArray(ga.participants) ? [...ga.participants] : [];
    if (pool.length === 0) {
        ga.winnerList = [];
        botCtx.setSection('giveaways', giveaways, Dinz);
        await Dinz.sendMessage(ga.chatId, {
            text: formatCard({
                icon: '🎁',
                title: 'GIVEAWAY BERAKHIR',
                rows: [
                    { label: 'ID', value: `\`${gaId}\`` },
                    { label: 'Judul', value: ga.title },
                    { label: 'Peserta', value: '0 orang (tidak ada pemenang)' }
                ]
            })
        }).catch(() => {});
        return ga;
    }

    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const count = Math.min(ga.winners || 1, pool.length);
    ga.winnerList = pool.slice(0, count);
    botCtx.setSection('giveaways', giveaways, Dinz);

    const winnersTxt = ga.winnerList.map((w, i) => `${i + 1}. @${cleanNum(w)}`).join('\n');
    const card = formatCard({
        icon: reroll ? '🔄' : '🎊',
        title: reroll ? 'GIVEAWAY REROLL' : 'PEMENANG GIVEAWAY',
        rows: [
            { label: 'ID', value: `\`${gaId}\`` },
            { label: 'Judul', value: ga.title },
            { label: 'Hadiah', value: ga.prize },
            { label: 'Total Peserta', value: `${pool.length} orang` }
        ],
        body: `*Selamat kepada pemenang:*\n${winnersTxt}`
    });
    await Dinz.sendMessage(ga.chatId, { text: card, mentions: ga.winnerList }).catch(() => {});
    return ga;
}

if (!global._giveawayWatcherStarted) {
    global._giveawayWatcherStarted = true;
    setInterval(() => {
        try {
            const sock = global.socket;
            if (!sock) return;
            const botCtx = require('../../core/context');
            const giveaways = botCtx.getSection('giveaways', sock) || {};
            const now = Date.now();
            for (const [id, ga] of Object.entries(giveaways)) {
                if (ga && !ga.ended && ga.endTime && now >= ga.endTime) {
                    finalizeGiveaway(sock, botCtx, id, false).catch(() => {});
                }
            }
        } catch (_) {}
    }, 30000).unref?.();
}

function resolveTargetJid(m, args) {
    if (m.mentionedJid?.[0]) return m.mentionedJid[0];
    if (m.quoted?.sender) return m.quoted.sender;
    const raw = (args[0] || '').replace(/[^0-9]/g, '');
    if (raw.length >= 8) {
        const norm = raw.startsWith('08') ? '62' + raw.slice(1) : raw;
        return `${norm}@s.whatsapp.net`;
    }
    return '';
}

module.exports = {
    formatCard,
    formatNumber,
    cleanNum,
    getGroupObj,
    parseDurationMs,
    genGiveawayId,
    finalizeGiveaway,
    resolveTargetJid
};
