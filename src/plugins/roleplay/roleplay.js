const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const { runFfmpegFile } = require('../audio/_helper');

const UA_APP = 'HuTaoBot/1.5 (+https://github.com/dinzid04/HuTao-MD)';

const RP_ACTIONS = {
    hug: { emoji: '🤗', label: 'Peluk', needTarget: true, delta: 8, target: '{sender} memeluk erat {target} dengan penuh kehangatan! 🤗', self: '{sender} memeluk dirinya sendiri sambil tersenyum.', nekos: 'hug', otaku: 'hug' },
    pat: { emoji: '🥰', label: 'Elus Kepala', needTarget: true, delta: 6, target: '{sender} mengelus kepala {target} dengan lembut~ 🥰', self: '{sender} menepuk-nepuk kepalanya sendiri.', nekos: 'pat', otaku: 'pat' },
    kiss: { emoji: '💋', label: 'Cium', needTarget: true, delta: 10, target: '{sender} mencium pipi {target}! 💋✨', self: '{sender} mengirim kiss jauh ke cermin~', nekos: 'kiss', otaku: 'kiss' },
    slap: { emoji: '👋', label: 'Tampar', needTarget: true, delta: -3, target: '{sender} menampar {target} sampai kaget! 💥👋', self: '{sender} menepuk pipinya sendiri biar sadar.', nekos: 'slap', otaku: 'slap' },
    cuddle: { emoji: '💞', label: 'Cuddle', needTarget: true, delta: 9, target: '{sender} bermanja-manja sambil cuddle bersama {target} 💞', self: '{sender} meringkuk nyaman di bawah selimut.', nekos: 'cuddle', otaku: 'cuddle' },
    poke: { emoji: '👉', label: 'Colek', needTarget: true, delta: 4, target: '{sender} mencolek pipi {target} iseng~ 👉', self: '{sender} mencolek pipinya sendiri.', nekos: 'poke', otaku: 'poke' },
    blush: { emoji: '😳', label: 'Blush', needTarget: false, delta: 5, target: '{sender} tersipu malu gara-gara {target}! 😳💗', self: '{sender} tersipu malu dengan pipi memerah~ 😳', nekos: 'blush', otaku: 'blush' },
    bonk: { emoji: '🔨', label: 'Bonk', needTarget: true, delta: -2, target: 'BONK! {sender} menggetok kepala {target}! 🔨💥', self: '{sender} menge-bonk kepalanya sendiri!', nekos: 'slap', otaku: 'smack' },
    bite: { emoji: '😬', label: 'Gigit', needTarget: true, delta: 5, target: '{sender} menggigit kecil {target}! Nom~ 😬', self: '{sender} menggigit bibirnya sendiri.', nekos: 'bite', otaku: 'bite' },
    dance: { emoji: '💃', label: 'Dance', needTarget: false, delta: 6, target: '{sender} berdansa penuh semangat bersama {target}! 💃✨', self: '{sender} menari riang penuh energi! 💃🎶', nekos: 'dance', otaku: 'dance' }
};

function getRpStats(jid) {
    if (!global.db.users) global.db.users = {};
    const u = global.db.users[jid] || (global.db.users[jid] = {});
    if (!u.rpStats || typeof u.rpStats !== 'object') {
        u.rpStats = { mood: '✨ Santai', affection: 0, given: 0, received: 0, counts: {} };
    }
    return u.rpStats;
}

function getRpTitle(aff = 0) {
    if (aff >= 200) return '🌸 HuTao Soulmate';
    if (aff >= 100) return '💖 Starlight Sweetheart';
    if (aff >= 50) return '✨ Crystal Companion';
    if (aff >= 20) return '🌷 Warm Friend';
    return '🌱 Newcomer';
}

async function fetchRoleplayGifUrl(spec) {
    // Primary: nekos.best (live-verified HTTP 200 dengan User-Agent app!)
    try {
        const res = await axios.get(`https://nekos.best/api/v2/${spec.nekos}`, {
            headers: { 'User-Agent': UA_APP },
            timeout: 10000
        });
        const url = res.data?.results?.[0]?.url;
        if (url) return url;
    } catch (_) {}

    // Fallback: otakugifs.xyz (live-verified HTTP 200!)
    try {
        const res = await axios.get(`https://api.otakugifs.xyz/gif?reaction=${spec.otaku}`, {
            headers: { 'User-Agent': UA_APP },
            timeout: 10000
        });
        if (res.data?.url) return res.data.url;
    } catch (_) {}

    return null;
}

async function gifUrlToMp4Buffer(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': UA_APP },
        timeout: 15000
    });
    const raw = Buffer.from(res.data);
    if (!/\.gif(\?|$)/i.test(url)) return { buffer: raw, isVideo: false };

    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const uid = `${Date.now()}_${randomBytes(3).toString('hex')}`;
    const inF = path.join(tmpDir, `rp_${uid}.gif`);
    const outF = path.join(tmpDir, `rp_${uid}.mp4`);
    try {
        fs.writeFileSync(inF, raw);
        await runFfmpegFile([
            '-y', '-i', inF,
            '-movflags', 'faststart',
            '-pix_fmt', 'yuv420p',
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26',
            outF
        ]);
        if (fs.existsSync(outF)) {
            return { buffer: fs.readFileSync(outF), isVideo: true };
        }
    } catch (_) {
    } finally {
        try { if (fs.existsSync(inF)) fs.unlinkSync(inF); } catch (_) {}
        try { if (fs.existsSync(outF)) fs.unlinkSync(outF); } catch (_) {}
    }
    return { buffer: raw, isVideo: false };
}

module.exports = {
    name: 'roleplay',
    category: 'roleplay',
    commands: [
        'hug', 'peluk', 'pat', 'elus', 'kiss', 'cium', 'slap', 'tampar',
        'cuddle', 'poke', 'colek', 'blush', 'bonk', 'bite', 'gigit', 'dance',
        'rpprofile', 'rpmood', 'rpact'
    ],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, checkLimit, addLimit, usedPrefix } = ctx;
        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();

        if (cmd === 'rpact') {
            const list = Object.entries(RP_ACTIONS)
                .map(([k, v]) => `> ◦ \`${pfx}${k}\` — ${v.emoji} ${v.label}`)
                .join('\n');
            return Reply(
                `\`🎭 DAFTAR AKSI ROLEPLAY\`\n${list}\n\n` +
                `> ◦ \`${pfx}rpprofile [@user]\` — lihat profil & affection RP\n` +
                `> ◦ \`${pfx}rpmood <mood>\` — ubah status mood RP`
            );
        }

        if (cmd === 'rpmood') {
            const newMood = String(text || '').trim().slice(0, 40);
            if (!newMood) return Reply(`🎭 Contoh: \`${pfx}rpmood 🔥 Semangat\``);
            const st = getRpStats(m.sender);
            st.mood = newMood;
            return Reply(`✅ Mood Roleplay kamu sekarang: *${newMood}*`);
        }

        if (cmd === 'rpprofile') {
            const target = (m.mentionedJid && m.mentionedJid[0]) || m.quoted?.sender || m.sender;
            const st = getRpStats(target);
            const tag = `@${String(target).split('@')[0].split(':')[0]}`;
            const topAct = Object.entries(st.counts || {}).sort((a, b) => b[1] - a[1]).slice(0, 3)
                .map(([k, v]) => `${k} (${v}x)`).join(', ') || '-';
            return Reply(
                `\`🎭 PROFIL ROLEPLAY\`\n` +
                `> ◦ *User :* ${tag}\n` +
                `> ◦ *Gelar :* ${getRpTitle(st.affection)}\n` +
                `> ◦ *Mood :* ${st.mood}\n` +
                `> ◦ *Affection :* 💖 ${st.affection}\n` +
                `> ◦ *Aksi Diberikan :* ${st.given}x\n` +
                `> ◦ *Aksi Diterima :* ${st.received}x\n` +
                `> ◦ *Favorit :* ${topAct}`,
                [target]
            );
        }

        const aliasMap = { peluk: 'hug', elus: 'pat', cium: 'kiss', tampar: 'slap', colek: 'poke', gigit: 'bite' };
        const actionKey = aliasMap[cmd] || cmd;
        const spec = RP_ACTIONS[actionKey];
        if (!spec) return false;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const target = (m.mentionedJid && m.mentionedJid[0]) || m.quoted?.sender || null;
        if (spec.needTarget && !target) {
            return Reply(`${spec.emoji} Tag atau reply seseorang untuk melakukan *${spec.label}*!\n> Contoh: \`${pfx}${actionKey} @user\``);
        }

        const isSelf = !target || target === m.sender;
        const senderTag = `@${String(m.sender).split('@')[0].split(':')[0]}`;
        const targetTag = target ? `@${String(target).split('@')[0].split(':')[0]}` : senderTag;

        const sStats = getRpStats(m.sender);
        sStats.given += 1;
        sStats.counts[actionKey] = (sStats.counts[actionKey] || 0) + 1;
        sStats.affection = Math.max(0, sStats.affection + Math.max(1, Math.floor(spec.delta / 2)));

        if (!isSelf && target) {
            const tStats = getRpStats(target);
            tStats.received += 1;
            tStats.affection = Math.max(0, tStats.affection + spec.delta);
        }

        const line = (isSelf ? spec.self : spec.target)
            .replace(/\{sender\}/g, senderTag)
            .replace(/\{target\}/g, targetTag);
        const caption = `\`${spec.emoji} ROLEPLAY — ${spec.label.toUpperCase()}\`\n> ${line}`;
        const mentions = isSelf ? [m.sender] : [m.sender, target];

        const mediaUrl = await fetchRoleplayGifUrl(spec);
        if (mediaUrl) {
            try {
                const conv = await gifUrlToMp4Buffer(mediaUrl);
                if (conv.isVideo) {
                    await Dinz.sendMessage(m.chat, { video: conv.buffer, gifPlayback: true, caption, mentions }, { quoted: m });
                } else {
                    await Dinz.sendMessage(m.chat, { image: conv.buffer, caption, mentions }, { quoted: m });
                }
                addLimit(m.sender, isCreator);
                return true;
            } catch (_) {}
        }

        await Reply(caption, mentions);
        addLimit(m.sender, isCreator);
        return true;
    }
};
