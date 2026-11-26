const os = require('os');
const { formatCard } = require('../../utils/formatter');
const {
    YOUHU_GAMES,
    sendYouhuRichGame,
    sendRichPingDashboard,
    sendRichTable,
    sendRichCode,
    sendRichCard
} = require('../../services/rich-message');

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatUptime(sec) {
    const s = Math.floor(Number(sec) || 0);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const rem = s % 60;
    const parts = [];
    if (d) parts.push(`${d}h`);
    if (h) parts.push(`${h}j`);
    if (m) parts.push(`${m}m`);
    parts.push(`${rem}d`);
    return parts.join(' ');
}

async function runRichGame(ctx, gameKey) {
    const { Dinz, m, Reply } = ctx;
    await Dinz.sendMessage(m.chat, { react: { text: '🎮', key: m.key } }).catch(() => {});
    try {
        await sendYouhuRichGame(Dinz, m, gameKey);
        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
    } catch (err) {
        await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
        return Reply(`❌ Gagal memuat Rich Game *${gameKey}*: ${err.message}`);
    }
    return true;
}

module.exports = {
    os,
    formatCard,
    YOUHU_GAMES,
    sendYouhuRichGame,
    sendRichPingDashboard,
    sendRichTable,
    sendRichCode,
    sendRichCard,
    formatBytes,
    formatUptime,
    runRichGame
};
