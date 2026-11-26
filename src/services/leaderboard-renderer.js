const axios = require('axios');
const https = require('https');
const { initRpgUser, HITORI_RPG } = require('./rpg');
const limitSvc = require('./limit');

let canvasMod = null;
try { canvasMod = require('canvas'); } catch (_) {}

const CATEGORIES = {
    level: { key: 'level', title: 'LEVEL', unit: 'Lv', accent: '#E5B85C', format: (v) => `Lv. ${v.toLocaleString('id-ID')}` },
    exp: { key: 'exp', title: 'EXPERIENCE', unit: 'EXP', accent: '#60A5FA', format: (v) => `${v.toLocaleString('id-ID')} EXP` },
    money: { key: 'money', title: 'KEKAYAAN', unit: 'Rp', accent: '#34D399', format: (v) => `Rp ${v.toLocaleString('id-ID')}` },
    dompet: { key: 'dompet', title: 'DOMPET', unit: 'Rp', accent: '#34D399', format: (v) => `Rp ${v.toLocaleString('id-ID')}` },
    bank: { key: 'bank', title: 'SALDO BANK', unit: 'Rp', accent: '#38BDF8', format: (v) => `Rp ${v.toLocaleString('id-ID')}` },
    limit: { key: 'limit', title: 'SISA LIMIT', unit: 'Limit', accent: '#F472B6', format: (v) => `${v.toLocaleString('id-ID')} Limit` },
    chat: { key: 'chat', title: 'AKTIF CHAT', unit: 'Pesan', accent: '#FB923C', format: (v) => `${v.toLocaleString('id-ID')} Pesan` },
    game: { key: 'game', title: 'MENANG GAME', unit: 'Win', accent: '#A78BFA', format: (v) => `${v.toLocaleString('id-ID')} Win` },
    diamond: { key: 'diamond', title: 'DIAMOND', unit: 'DM', accent: '#22D3EE', format: (v) => `${v.toLocaleString('id-ID')} DM` },
    gold: { key: 'gold', title: 'GOLD', unit: 'Gold', accent: '#FBBF24', format: (v) => `${v.toLocaleString('id-ID')} Gold` }
};

const ALIAS_MAP = {
    lv: 'level', lvl: 'level',
    xp: 'exp',
    uang: 'money', duit: 'money', kaya: 'money', wealth: 'money', saldo: 'money',
    wallet: 'dompet', cash: 'dompet',
    aktif: 'chat', pesan: 'chat', topchat: 'chat',
    win: 'game', wins: 'game', games: 'game',
    dm: 'diamond', emas: 'gold'
};

function resolveCategory(raw) {
    const k = String(raw || 'level').toLowerCase().trim();
    const mapped = ALIAS_MAP[k] || k;
    return CATEGORIES[mapped] || CATEGORIES.level;
}

function cleanDigits(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function canonicalDigits(jid) {
    const d = cleanDigits(jid);
    if (!d) return '';
    if (global.lidMap && global.lidMap[d]) return cleanDigits(global.lidMap[d]);
    return d;
}

function formatPrettyPhone(digits) {
    if (!digits) return 'Member';
    if (digits.startsWith('62') && digits.length >= 10) {
        const local = '0' + digits.slice(2);
        return `${local.slice(0, 4)}-${local.slice(4, 8)}-${local.slice(8)}`;
    }
    return digits;
}

function isPureDigitsOrJid(s) {
    const clean = String(s || '').trim().replace(/^[+@\s-]+/, '');
    return !clean || /^[\d\s-]+(@.*)?$/.test(clean) || clean.toLowerCase() === 'user' || clean.toLowerCase() === 'unknown';
}

async function resolveDisplayName(Dinz, store, jid, chatId) {
    const digits = cleanDigits(jid);
    const canon = canonicalDigits(jid);
    const stdJid = canon ? `${canon}@s.whatsapp.net` : jid;

    const chatStats = chatId ? global.db?.groups?.[chatId]?.chatStats : null;
    if (chatStats) {
        for (const key of [jid, stdJid]) {
            const nm = chatStats[key]?.name;
            if (nm && !isPureDigitsOrJid(nm)) return String(nm).trim();
        }
        for (const [k, v] of Object.entries(chatStats)) {
            if (canonicalDigits(k) === canon && v?.name && !isPureDigitsOrJid(v.name)) {
                return String(v.name).trim();
            }
        }
    }

    const u = global.db?.users?.[jid] || global.db?.users?.[stdJid];
    if (u?.name && !isPureDigitsOrJid(u.name)) return String(u.name).trim();

    if (store?.contacts) {
        for (const key of [jid, stdJid]) {
            const c = store.contacts[key];
            const nm = c?.notify || c?.name || c?.verifiedName;
            if (nm && !isPureDigitsOrJid(nm)) return String(nm).trim();
        }
    }

    if (typeof Dinz?.getName === 'function') {
        try {
            const nm = await Dinz.getName(stdJid);
            if (nm && !isPureDigitsOrJid(nm)) return String(nm).trim();
        } catch (_) {}
    }

    return formatPrettyPhone(canon || digits);
}

async function fetchAvatarBuffer(Dinz, jid) {
    if (!Dinz || typeof Dinz.profilePictureUrl !== 'function') return null;
    const canon = canonicalDigits(jid);
    const candidates = [...new Set([canon ? `${canon}@s.whatsapp.net` : '', jid].filter(Boolean))];
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    for (const target of candidates) {
        try {
            const url = await Promise.race([
                Dinz.profilePictureUrl(target, 'image'),
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3500))
            ]);
            if (!url || typeof url !== 'string') continue;
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 4500,
                httpsAgent,
                validateStatus: () => true
            });
            if (res.status === 200 && res.data && res.data.length > 200) {
                return Buffer.from(res.data);
            }
        } catch (_) {}
    }
    return null;
}

function getMetricValue(catKey, userObj, jid, chatStatsMap) {
    if (catKey === 'chat') {
        const canon = canonicalDigits(jid);
        let total = 0;
        for (const [k, v] of Object.entries(chatStatsMap || {})) {
            if (canonicalDigits(k) === canon) total += Number(v?.count) || 0;
        }
        return total;
    }
    if (catKey === 'limit') {
        try {
            const info = limitSvc.getUserLimitInfo(jid, false);
            return Number.isFinite(info.remaining) ? info.remaining : 0;
        } catch (_) {
            return 0;
        }
    }
    initRpgUser(userObj);
    if (catKey === 'money') return (Number(userObj.money) || 0) + (Number(userObj.bank) || 0);
    if (catKey === 'dompet') return Number(userObj.money) || 0;
    if (catKey === 'game') return Number(userObj.gameWins) || 0;
    return Number(userObj[catKey]) || 0;
}

async function buildLeaderboardData({ Dinz, m, store, categoryRaw = 'level', scope = 'group' }) {
    const cat = resolveCategory(categoryRaw);
    const isGroupScope = Boolean(m.isGroup && scope !== 'global');
    let allowedCanon = null;
    let groupSubject = '';

    if (isGroupScope) {
        try {
            const meta = await (Dinz.safeGroupMetadata ? Dinz.safeGroupMetadata(m.chat) : Dinz.groupMetadata(m.chat));
            groupSubject = meta?.subject || '';
            const parts = Array.isArray(meta?.participants) ? meta.participants : [];
            if (parts.length > 0) {
                allowedCanon = new Set();
                for (const p of parts) {
                    const c1 = canonicalDigits(p.id);
                    const c2 = canonicalDigits(p.jid || p.phoneNumber);
                    const c3 = canonicalDigits(p.lid);
                    if (c1) allowedCanon.add(c1);
                    if (c2) allowedCanon.add(c2);
                    if (c3) allowedCanon.add(c3);
                }
            }
        } catch (_) {}
    }

    const chatStatsMap = m.isGroup ? (global.db?.groups?.[m.chat]?.chatStats || {}) : {};
    const mergedByCanon = new Map();

    const addCandidate = (rawJid, uObj) => {
        if (!rawJid || rawJid.includes('@newsletter') || rawJid.includes('@g.us') || rawJid.includes('broadcast')) return;
        const canon = canonicalDigits(rawJid);
        if (!canon) return;
        if (allowedCanon && !allowedCanon.has(canon)) return;
        const stdJid = `${canon}@s.whatsapp.net`;
        const val = getMetricValue(cat.key, uObj || {}, rawJid, chatStatsMap);
        if (val <= 0) return;

        const existing = mergedByCanon.get(canon);
        if (!existing || val > existing.val) {
            mergedByCanon.set(canon, {
                jid: stdJid,
                rawJid,
                canon,
                val,
                level: Number(uObj?.level) || 0,
                role: HITORI_RPG?.getRole ? HITORI_RPG.getRole(Number(uObj?.level) || 0) : ''
            });
        }
    };

    if (cat.key === 'chat') {
        for (const [k] of Object.entries(chatStatsMap)) {
            const std = `${canonicalDigits(k)}@s.whatsapp.net`;
            addCandidate(k, global.db?.users?.[k] || global.db?.users?.[std] || {});
        }
    } else {
        for (const [jid, u] of Object.entries(global.db?.users || {})) {
            addCandidate(jid, u);
        }
    }

    const sortedAll = [...mergedByCanon.values()].sort((a, b) => b.val - a.val);
    const senderCanon = canonicalDigits(m.sender);
    const myRankIdx = sortedAll.findIndex((x) => x.canon === senderCanon);
    const topList = sortedAll.slice(0, 10);

    const enriched = await Promise.all(topList.map(async (item, idx) => {
        const [displayName, avatarBuf] = await Promise.all([
            resolveDisplayName(Dinz, store, item.rawJid, m.isGroup ? m.chat : null),
            fetchAvatarBuffer(Dinz, item.jid)
        ]);
        return {
            ...item,
            rank: idx + 1,
            displayName,
            avatarBuf
        };
    }));

    return {
        category: cat,
        scopeLabel: isGroupScope ? (groupSubject ? groupSubject.slice(0, 28) : 'GRUP INI') : 'GLOBAL',
        isGroupScope,
        totalPlayers: sortedAll.length,
        myRank: myRankIdx !== -1 ? myRankIdx + 1 : null,
        myVal: myRankIdx !== -1 ? sortedAll[myRankIdx].val : 0,
        entries: enriched
    };
}

function roundRectPath(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
    let s = String(text || '');
    if (ctx.measureText(s).width <= maxWidth) return s;
    while (s.length > 1 && ctx.measureText(s + '...').width > maxWidth) {
        s = s.slice(0, -1);
    }
    return s + '...';
}

function drawCrown(ctx, cx, cy, scale = 1, color = '#E5B85C') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-14, 8);
    ctx.lineTo(-16, -6);
    ctx.lineTo(-6, 1);
    ctx.lineTo(0, -10);
    ctx.lineTo(6, 1);
    ctx.lineTo(16, -6);
    ctx.lineTo(14, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-14, 10, 28, 3);
    ctx.restore();
}

const AVATAR_BG = ['#3B4C66', '#5C4742', '#3D5A52', '#5A4A63', '#61523A', '#3C5460'];

function getInitials(name) {
    const clean = String(name || 'U').replace(/[^A-Za-z0-9\s]/g, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (clean.slice(0, 2) || 'U').toUpperCase();
}

async function drawCircularAvatar(ctx, cx, cy, radius, avatarBuf, name, ringColor, idx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = ringColor || '#2C3444';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    let drawn = false;
    if (avatarBuf && canvasMod?.loadImage) {
        try {
            const img = await canvasMod.loadImage(avatarBuf);
            const size = Math.min(img.width, img.height);
            const sx = (img.width - size) / 2;
            const sy = (img.height - size) / 2;
            ctx.drawImage(img, sx, sy, size, size, cx - radius, cy - radius, radius * 2, radius * 2);
            drawn = true;
        } catch (_) {}
    }

    if (!drawn) {
        ctx.fillStyle = AVATAR_BG[idx % AVATAR_BG.length];
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
        ctx.fillStyle = '#F3F5F8';
        ctx.font = `bold ${Math.round(radius * 0.78)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(getInitials(name), cx, cy + 1);
    }
    ctx.restore();
}

async function renderLeaderboardImage(data, botname = 'HuTao - MD') {
    if (!canvasMod || typeof canvasMod.createCanvas !== 'function') return null;
    try {
    const { entries, category, scopeLabel, totalPlayers } = data;
    if (!entries || entries.length === 0) return null;

    const W = 920;
    const topEntries = entries.slice(0, 3);
    const restEntries = entries.slice(3, 10);
    const headerH = 112;
    const podiumH = topEntries.length === 1 ? 156 : 258;
    const rowH = 62;
    const rowGap = 10;
    const listBlockH = restEntries.length > 0 ? (24 + restEntries.length * (rowH + rowGap)) : 12;
    const footerH = 56;
    const H = headerH + podiumH + listBlockH + footerH;

    const canvas = canvasMod.createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#11141B';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = category.accent;
    ctx.fillRect(0, 0, W, 5);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 40; x < W; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = category.accent;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`RANKING  /  ${scopeLabel.toUpperCase()}`, 44, 46);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(`LEADERBOARD ${category.title}`, 44, 84);

    const badgeTxt = `${totalPlayers} PLAYERS`;
    ctx.font = 'bold 13px sans-serif';
    const bw = ctx.measureText(badgeTxt).width + 28;
    roundRectPath(ctx, W - 44 - bw, 46, bw, 32, 8);
    ctx.fillStyle = '#1C222E';
    ctx.fill();
    ctx.strokeStyle = '#2E3748';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#CBD5E1';
    ctx.textAlign = 'center';
    ctx.fillText(badgeTxt, W - 44 - bw / 2, 67);

    ctx.strokeStyle = '#222836';
    ctx.beginPath();
    ctx.moveTo(44, headerH - 6);
    ctx.lineTo(W - 44, headerH - 6);
    ctx.stroke();

    const podiumRings = ['#E5B85C', '#B8C4D4', '#D08B5B'];
    const maxVal = Math.max(1, entries[0]?.val || 1);

    if (topEntries.length === 1) {
        const item = topEntries[0];
        const cardY = headerH + 14;
        const cardH = 128;
        roundRectPath(ctx, 44, cardY, W - 88, cardH, 16);
        ctx.fillStyle = '#181D27';
        ctx.fill();
        ctx.strokeStyle = '#E5B85C';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        drawCrown(ctx, 118, cardY + 18, 0.85, '#E5B85C');
        await drawCircularAvatar(ctx, 118, cardY + 70, 38, item.avatarBuf, item.displayName, '#E5B85C', 0);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#E5B85C';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('#1 CHAMPION', 178, cardY + 42);

        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText(fitText(ctx, item.displayName, 400), 178, cardY + 74);

        ctx.fillStyle = '#8B95A7';
        ctx.font = '15px sans-serif';
        ctx.fillText(`Lv. ${item.level}${item.role ? '  •  ' + item.role : ''}`, 178, cardY + 100);

        ctx.textAlign = 'right';
        ctx.fillStyle = category.accent;
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText(category.format(item.val), W - 72, cardY + 74);
    } else {
        const order = topEntries.length === 2
            ? [{ item: topEntries[0], slot: 0, elevated: true }, { item: topEntries[1], slot: 1, elevated: false }]
            : [
                { item: topEntries[1], slot: 0, elevated: false },
                { item: topEntries[0], slot: 1, elevated: true },
                { item: topEntries[2], slot: 2, elevated: false }
            ];
        const cols = order.length;
        const gap = 18;
        const cardW = (W - 88 - gap * (cols - 1)) / cols;

        for (const p of order) {
            const { item, slot, elevated } = p;
            const ring = podiumRings[item.rank - 1] || '#475569';
            const cx = 44 + slot * (cardW + gap);
            const cy = headerH + (elevated ? 12 : 34);
            const ch = elevated ? 232 : 210;

            roundRectPath(ctx, cx, cy, cardW, ch, 16);
            ctx.fillStyle = elevated ? '#1B212E' : '#161B24';
            ctx.fill();
            ctx.strokeStyle = elevated ? ring : '#262E3D';
            ctx.lineWidth = elevated ? 1.8 : 1;
            ctx.stroke();

            const midX = cx + cardW / 2;
            if (item.rank === 1) {
                drawCrown(ctx, midX, cy + 20, 0.9, '#E5B85C');
            }
            const avR = elevated ? 38 : 32;
            const avY = cy + (item.rank === 1 ? 74 : 58);
            await drawCircularAvatar(ctx, midX, avY, avR, item.avatarBuf, item.displayName, ring, item.rank - 1);

            roundRectPath(ctx, midX - 24, avY + avR - 10, 48, 22, 11);
            ctx.fillStyle = ring;
            ctx.fill();
            ctx.fillStyle = '#11141B';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`#${item.rank}`, midX, avY + avR + 5);

            ctx.fillStyle = '#F8FAFC';
            ctx.font = elevated ? 'bold 20px sans-serif' : 'bold 18px sans-serif';
            ctx.fillText(fitText(ctx, item.displayName, cardW - 28), midX, avY + avR + 36);

            ctx.fillStyle = '#8B95A7';
            ctx.font = '13px sans-serif';
            ctx.fillText(`Lv. ${item.level}${item.role ? ' • ' + fitText(ctx, item.role, 110) : ''}`, midX, avY + avR + 56);

            ctx.fillStyle = category.accent;
            ctx.font = elevated ? 'bold 22px sans-serif' : 'bold 19px sans-serif';
            ctx.fillText(category.format(item.val), midX, cy + ch - 20);
        }
    }

    let curY = headerH + podiumH + 14;
    for (let i = 0; i < restEntries.length; i++) {
        const item = restEntries[i];
        roundRectPath(ctx, 44, curY, W - 88, rowH, 12);
        ctx.fillStyle = '#171C25';
        ctx.fill();
        ctx.strokeStyle = '#232A38';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#94A3B8';
        ctx.font = 'bold 17px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`#${item.rank}`, 74, curY + 37);

        await drawCircularAvatar(ctx, 124, curY + rowH / 2, 20, item.avatarBuf, item.displayName, '#2E3748', item.rank);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#F1F5F9';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(fitText(ctx, item.displayName, 340), 160, curY + 29);

        const pct = Math.max(0.06, Math.min(1, item.val / maxVal));
        const barW = 240;
        roundRectPath(ctx, 160, curY + 40, barW, 6, 3);
        ctx.fillStyle = '#242B39';
        ctx.fill();
        roundRectPath(ctx, 160, curY + 40, Math.round(barW * pct), 6, 3);
        ctx.fillStyle = category.accent;
        ctx.fill();

        ctx.textAlign = 'right';
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 19px sans-serif';
        ctx.fillText(category.format(item.val), W - 66, curY + 37);

        curY += rowH + rowGap;
    }

    ctx.strokeStyle = '#222836';
    ctx.beginPath();
    ctx.moveTo(44, H - footerH + 6);
    ctx.lineTo(W - 44, H - footerH + 6);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${botname}  •  Leaderboard ${category.title}`, 44, H - 20);

    ctx.textAlign = 'right';
    ctx.fillText(`Showing Top ${entries.length} of ${totalPlayers}`, W - 44, H - 20);

    const outBuf = canvas.toBuffer('image/png');
    return Buffer.isBuffer(outBuf) ? outBuf : null;
    } catch (_) {
        return null;
    }
}

function buildLeaderboardCaption(data, usedPrefix = '.') {
    const { category, scopeLabel, entries, myRank, myVal, totalPlayers } = data;
    const rankBadges = ['🥇', '🥈', '🥉', '4.', '5.', '6.', '7.', '8.', '9.', '10.'];

    if (!entries.length) {
        return (
            `\`⌜ LEADERBOARD ${category.title} ⌟\`\n` +
            `> ◦ *Cakupan :* ${scopeLabel}\n` +
            `> ◦ _Belum ada data pemain pada kategori ini._\n\n` +
            `💡 Kategori lain: \`${usedPrefix}lb level\`, \`exp\`, \`money\`, \`bank\`, \`limit\`, \`chat\`, \`game\``
        );
    }

    const mentions = [];
    const lines = entries.map((e, i) => {
        mentions.push(e.jid);
        const badge = rankBadges[i] || `${i + 1}.`;
        return `${badge} *${e.displayName}* (@${e.canon})\n   └ ${category.format(e.val)}${category.key !== 'level' && e.level > 0 ? ` • Lv.${e.level}` : ''}`;
    }).join('\n');

    const myLine = myRank
        ? `> ◦ *Peringkat Kamu :* #${myRank} dari ${totalPlayers} (${category.format(myVal)})`
        : `> ◦ *Total Pemain :* ${totalPlayers} orang`;

    const caption =
        `\`⌜ 🏆 LEADERBOARD ${category.title} ⌟\`\n` +
        `> ◦ *Cakupan :* ${scopeLabel}\n` +
        `${myLine}\n\n` +
        `${lines}\n\n` +
        `📂 *Pilih Kategori Lain:*\n` +
        `\`${usedPrefix}lb level\` | \`${usedPrefix}lb exp\` | \`${usedPrefix}lb money\` | \`${usedPrefix}lb bank\`\n` +
        `\`${usedPrefix}lb limit\` | \`${usedPrefix}lb chat\` | \`${usedPrefix}lb game\` | \`${usedPrefix}lb ${category.key} global\``;

    return { caption, mentions };
}

module.exports = {
    CATEGORIES,
    resolveCategory,
    buildLeaderboardData,
    renderLeaderboardImage,
    buildLeaderboardCaption
};
