const axios = require('axios');
let createCanvas, loadImage;
try { ({ createCanvas, loadImage } = require('canvas')); } catch (e) {}

function isNumber(x) {
    return typeof x === 'number' && !isNaN(x);
}

function clockString(ms) {
    let h = Math.floor(ms / 3600000);
    let m = Math.floor(ms / 60000) % 60;
    let s = Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

function msToTime(duration) {
    let seconds = Math.floor((duration / 1000) % 60);
    let minutes = Math.floor((duration / (1000 * 60)) % 60);
    let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    let days = Math.floor(duration / (1000 * 60 * 60 * 24));
    let parts = [];
    if (days > 0) parts.push(`${days} hari`);
    if (hours > 0) parts.push(`${hours} jam`);
    if (minutes > 0) parts.push(`${minutes} menit`);
    if (seconds > 0) parts.push(`${seconds} detik`);
    return parts.length > 0 ? parts.join(' ') : '0 detik';
}

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function rrp(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function petal(ctx, cx, cy, r, angle, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-r * 0.5, -r * 0.8, -r * 0.3, -r * 1.5, 0, -r * 1.6);
    ctx.bezierCurveTo(r * 0.3, -r * 1.5, r * 0.5, -r * 0.8, 0, 0);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

function sakura(ctx, cx, cy, r, color, alpha = 1) {
    for (let i = 0; i < 5; i++) petal(ctx, cx, cy, r, (Math.PI * 2 / 5) * i, color, alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff8f0';
    ctx.fill();
    ctx.restore();
}

function fadeLine(ctx, y, W, color) {
    const g = ctx.createLinearGradient(30, 0, W - 30, 0);
    g.addColorStop(0, 'transparent');
    g.addColorStop(0.12, color);
    g.addColorStop(0.88, color);
    g.addColorStop(1, 'transparent');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(W - 30, y);
    ctx.stroke();
}

function cornerL(ctx, x, y, w, h, size, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]
        .forEach(([cx, cy, dx, dy]) => {
            ctx.beginPath();
            ctx.moveTo(cx + dx * size, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + dy * size);
            ctx.stroke();
        });
}

function drawDefaultAvatar(ctx, cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const aG = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, r);
    aG.addColorStop(0, '#fde8f0');
    aG.addColorStop(1, '#f4b8cc');
    ctx.fillStyle = aG;
    ctx.fill();
    ctx.restore();
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c9184a';
    ctx.fillText('~', cx, cy + 4);
}

const RPG_EMOTICONS = {
    health: '❤️',
    money: '💹',
    exp: '✨',
    level: '🎖️',
    role: '👑',
    skill: '🃏',
    potion: '🥤',
    trash: '🗑️',
    wood: '🪵',
    rock: '🪨',
    string: '🕸️',
    iron: '⛓️',
    gold: '🪙',
    diamond: '💎',
    emerald: '❇️',
    upgrader: '🔧',
    common: '📦',
    uncommon: '🛍️',
    mythic: '🎁',
    legendary: '🧰',
    pet: '🐾',
    petFood: '🍖',
    sword: '🗡️',
    armor: '🥼',
    pickaxe: '⛏️',
    fishingrod: '🎣',
    cat: '🐈',
    dog: '🐕',
    fox: '🦊',
    horse: '🐎',
    botol: '🍾',
    kaleng: '🥫',
    kardus: '📦',
    gelas: '🥛',
    plastik: '🛍️'
};

function rpgEmoticon(type) {
    return RPG_EMOTICONS[type] || '📦';
}

function getRoleByLevel(level = 0) {
    const roles = [
        [0, 'Beginner'],
        [4, 'Cadet'],
        [8, 'Private'],
        [12, 'Corporal'],
        [16, 'Sergeant'],
        [20, 'Staff Sergeant'],
        [24, 'Master Sergeant'],
        [28, 'Second Lieutenant'],
        [32, 'First Lieutenant'],
        [36, 'Captain'],
        [40, 'Major'],
        [45, 'Lieutenant Colonel'],
        [50, 'Colonel'],
        [55, 'Brigadier General'],
        [60, 'Major General'],
        [65, 'Lieutenant General'],
        [70, 'General'],
        [80, 'Field Marshal'],
        [100, 'Grand Master'],
        [120, 'Legendary Hero'],
        [150, 'Demigod'],
        [200, 'Immortal God']
    ];
    let userRole = 'Beginner';
    for (const [lvl, r] of roles) {
        if (level >= lvl) userRole = r;
    }
    return userRole;
}

function initRpgUser(user) {
    if (!user || typeof user !== 'object') return {};

    if (!isNumber(user.exp)) user.exp = 0;
    if (!isNumber(user.level)) user.level = 0;
    if (!user.role) user.role = 'Beginner';
    if (!user.skill) user.skill = '';
    if (!isNumber(user.health)) user.health = 100;
    if (!isNumber(user.money)) user.money = 1000;
    if (!isNumber(user.bank)) user.bank = 0;
    if (!isNumber(user.atm)) user.atm = 0;

    if (!isNumber(user.potion)) user.potion = 10;
    if (!isNumber(user.trash)) user.trash = 0;
    if (!isNumber(user.wood)) user.wood = 0;
    if (!isNumber(user.rock)) user.rock = 0;
    if (!isNumber(user.string)) user.string = 0;
    if (!isNumber(user.iron)) user.iron = 0;
    if (!isNumber(user.gold)) user.gold = 0;
    if (!isNumber(user.diamond)) user.diamond = 0;
    if (!isNumber(user.emerald)) user.emerald = 0;
    if (!isNumber(user.upgrader)) user.upgrader = 0;

    if (!isNumber(user.common)) user.common = 0;
    if (!isNumber(user.uncommon)) user.uncommon = 0;
    if (!isNumber(user.mythic)) user.mythic = 0;
    if (!isNumber(user.legendary)) user.legendary = 0;
    if (!isNumber(user.pet)) user.pet = 0;

    if (!isNumber(user.sword)) user.sword = 0;
    if (!isNumber(user.sworddurability)) user.sworddurability = 0;
    if (!isNumber(user.armor)) user.armor = 0;
    if (!isNumber(user.armordurability)) user.armordurability = 0;
    if (!isNumber(user.pickaxe)) user.pickaxe = 0;
    if (!isNumber(user.pickaxedurability)) user.pickaxedurability = 0;
    if (!isNumber(user.fishingrod)) user.fishingrod = 0;
    if (!isNumber(user.fishingroddurability)) user.fishingroddurability = 0;

    if (!isNumber(user.petFood)) user.petFood = 0;
    if (!isNumber(user.cat)) user.cat = 0;
    if (!isNumber(user.catexp)) user.catexp = 0;
    if (!isNumber(user.dog)) user.dog = 0;
    if (!isNumber(user.dogexp)) user.dogexp = 0;
    if (!isNumber(user.fox)) user.fox = 0;
    if (!isNumber(user.foxexp)) user.foxexp = 0;
    if (!isNumber(user.horse)) user.horse = 0;
    if (!isNumber(user.horseexp)) user.horseexp = 0;

    if (!isNumber(user.ikan)) user.ikan = 0;
    if (!isNumber(user.lele)) user.lele = 0;
    if (!isNumber(user.nila)) user.nila = 0;
    if (!isNumber(user.bawal)) user.bawal = 0;
    if (!isNumber(user.udang)) user.udang = 0;
    if (!isNumber(user.paus)) user.paus = 0;
    if (!isNumber(user.kepiting)) user.kepiting = 0;
    if (!isNumber(user.gurita)) user.gurita = 0;
    if (!isNumber(user.cumi)) user.cumi = 0;
    if (!isNumber(user.buntal)) user.buntal = 0;
    if (!isNumber(user.dory)) user.dory = 0;
    if (!isNumber(user.lumba)) user.lumba = 0;
    if (!isNumber(user.lobster)) user.lobster = 0;
    if (!isNumber(user.hiu)) user.hiu = 0;

    if (!isNumber(user.banteng)) user.banteng = 0;
    if (!isNumber(user.harimau)) user.harimau = 0;
    if (!isNumber(user.gajah)) user.gajah = 0;
    if (!isNumber(user.kambing)) user.kambing = 0;
    if (!isNumber(user.panda)) user.panda = 0;
    if (!isNumber(user.buaya)) user.buaya = 0;
    if (!isNumber(user.kerbau)) user.kerbau = 0;
    if (!isNumber(user.sapi)) user.sapi = 0;
    if (!isNumber(user.monyet)) user.monyet = 0;
    if (!isNumber(user.babihutan)) user.babihutan = 0;
    if (!isNumber(user.babi)) user.babi = 0;
    if (!isNumber(user.ayam)) user.ayam = 0;

    if (!isNumber(user.botol)) user.botol = 0;
    if (!isNumber(user.kaleng)) user.kaleng = 0;
    if (!isNumber(user.kardus)) user.kardus = 0;
    if (!isNumber(user.gelas)) user.gelas = 0;
    if (!isNumber(user.plastik)) user.plastik = 0;

    if (!isNumber(user.lastclaim)) user.lastclaim = 0;
    if (!isNumber(user.lastweekly)) user.lastweekly = 0;
    if (!isNumber(user.lastmonthly)) user.lastmonthly = 0;
    if (!isNumber(user.lastadventure)) user.lastadventure = 0;
    if (!isNumber(user.lastfishing)) user.lastfishing = 0;
    if (!isNumber(user.lastmining)) user.lastmining = 0;
    if (!isNumber(user.lastparming)) user.lastparming = 0;
    if (!isNumber(user.lastberburu)) user.lastberburu = 0;
    if (!isNumber(user.lastmulung)) user.lastmulung = 0;
    if (!isNumber(user.lastnguli)) user.lastnguli = 0;
    if (!isNumber(user.lastngojek)) user.lastngojek = 0;
    if (!isNumber(user.lastkerja)) user.lastkerja = 0;
    if (!isNumber(user.lastrob)) user.lastrob = 0;
    if (!isNumber(user.lastmaling)) user.lastmaling = 0;
    if (!isNumber(user.lastduel)) user.lastduel = 0;
    if (!isNumber(user.lastdungeon)) user.lastdungeon = 0;

    user.role = getRoleByLevel(user.level);
    return user;
}

const HITORI_RPG = {
    initRpgUser,
    rpgEmoticon,
    clockString,
    msToTime,
    pickRandom,

    xpRange(level) {
        const min = 100 * Math.pow(level, 2);
        const max = 100 * Math.pow(level + 1, 2);
        return { min, max, xp: max - min };
    },

    async renderProfileCard(user, pushName, avatarUrl, statusText = 'Free User', statusIcon = 'FREE', userId = 'user') {
        try {
            initRpgUser(user);
            const W = 720, H = 460;
            const canvas = createCanvas(W, H);
            const ctx = canvas.getContext('2d');
            const iconUpper = (statusIcon || 'FREE').toUpperCase();
            const tc = iconUpper === 'OWNER' ? '#e07098' : (iconUpper === 'PREMIUM' ? '#f48fb1' : '#ffc2d1');

            const bgG = ctx.createLinearGradient(0, 0, W, H);
            bgG.addColorStop(0, '#fdf8f0');
            bgG.addColorStop(0.5, '#fef9f2');
            bgG.addColorStop(1, '#faf3e8');
            ctx.fillStyle = bgG;
            ctx.fillRect(0, 0, W, H);

            for (let i = 0; i < 700; i++) {
                ctx.fillStyle = `rgba(180,140,100,${Math.random() * 0.025 + 0.005})`;
                ctx.beginPath();
                ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 0.9, 0, Math.PI * 2);
                ctx.fill();
            }

            const vign = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, W * 0.78);
            vign.addColorStop(0, 'transparent');
            vign.addColorStop(1, 'rgba(140,90,40,0.14)');
            ctx.fillStyle = vign;
            ctx.fillRect(0, 0, W, H);

            const warmBlob = ctx.createRadialGradient(W * 0.12, H * 0.18, 0, W * 0.12, H * 0.18, 220);
            warmBlob.addColorStop(0, tc + '18');
            warmBlob.addColorStop(1, 'transparent');
            ctx.fillStyle = warmBlob;
            ctx.fillRect(0, 0, W, H);

            const M = 20;
            rrp(ctx, M, M, W - M * 2, H - M * 2, 16);
            ctx.strokeStyle = '#c9956e';
            ctx.lineWidth = 2;
            ctx.stroke();
            rrp(ctx, M + 6, M + 6, W - M * 2 - 12, H - M * 2 - 12, 12);
            ctx.strokeStyle = 'rgba(201,149,110,0.25)';
            ctx.lineWidth = 1;
            ctx.stroke();
            cornerL(ctx, M + 4, M + 4, W - M * 2 - 8, H - M * 2 - 8, 28, '#c9956e');

            const sp = '#f8a4c0', sl = '#fcc8d8', sd = '#e87098';
            sakura(ctx, 46, 46, 32, sl, 0.20);
            sakura(ctx, W - 50, 38, 25, sp, 0.16);
            sakura(ctx, 38, H - 46, 28, sp, 0.18);
            sakura(ctx, W - 44, H - 50, 30, sl, 0.15);
            sakura(ctx, W * 0.5, 30, 16, sd, 0.10);
            [
                [W * 0.82, H * 0.08, 10, 0.3, sp],
                [W * 0.12, H * 0.25, 8, 0.8, sl],
                [W * 0.92, H * 0.52, 9, 1.1, sp],
                [W * 0.08, H * 0.74, 9, 0.2, sd],
                [W * 0.76, H * 0.90, 8, 1.5, sl],
                [W * 0.42, H * 0.96, 7, 0.6, sp],
                [W * 0.95, H * 0.28, 7, 1.8, sd],
            ].forEach(([px, py, pr, pa, pc]) => petal(ctx, px, py, pr, pa, pc, 0.48));

            const AV_R = 72;
            const AV_CX = M + 28 + AV_R;
            const AV_CY = H / 2;

            const ringG = ctx.createLinearGradient(AV_CX - AV_R, AV_CY - AV_R, AV_CX + AV_R, AV_CY + AV_R);
            ringG.addColorStop(0, tc);
            ringG.addColorStop(0.5, tc + 'aa');
            ringG.addColorStop(1, tc);
            ctx.beginPath();
            ctx.arc(AV_CX, AV_CY, AV_R + 6, 0, Math.PI * 2);
            ctx.strokeStyle = ringG;
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.save();
            ctx.setLineDash([4, 5]);
            ctx.beginPath();
            ctx.arc(AV_CX, AV_CY, AV_R + 12, 0, Math.PI * 2);
            ctx.strokeStyle = tc + '55';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2);
            ctx.clip();
            let avatarLoaded = false;
            if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('http')) {
                try {
                    const res = await axios.get(avatarUrl, { responseType: 'arraybuffer', timeout: 5000 });
                    const img = await loadImage(Buffer.from(res.data));
                    ctx.drawImage(img, AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
                    avatarLoaded = true;
                } catch (_) {}
            }
            if (!avatarLoaded) {
                drawDefaultAvatar(ctx, AV_CX, AV_CY, AV_R);
            }
            ctx.restore();

            const tierBadgeW = 76, tierBadgeH = 22;
            const tbx = AV_CX - tierBadgeW / 2;
            const tby = AV_CY + AV_R + 14;
            rrp(ctx, tbx, tby, tierBadgeW, tierBadgeH, 11);
            ctx.fillStyle = tc + 'dd';
            ctx.fill();
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = '#fff8f0';
            ctx.textAlign = 'center';
            ctx.fillText(iconUpper, AV_CX, tby + 15);

            const TX = AV_CX + AV_R + 36;
            const TW = W - TX - M - 14;

            ctx.font = 'bold 9px Arial';
            ctx.fillStyle = '#b07850';
            ctx.textAlign = 'left';
            ctx.fillText('✦  PROFILE CARD  ✦', TX, H / 2 - 138);

            const displayName = (pushName || 'Player').length > 20 ? (pushName || 'Player').slice(0, 20) + '…' : (pushName || 'Player');
            ctx.font = 'bold 30px Arial';
            ctx.fillStyle = '#4a1e0a';
            ctx.shadowColor = 'rgba(201,149,110,0.28)';
            ctx.shadowBlur = 12;
            ctx.fillText(displayName, TX, H / 2 - 112);
            ctx.shadowBlur = 0;

            ctx.font = '11px Arial';
            ctx.fillStyle = '#9b6a43';
            ctx.fillText('@' + (userId || 'user'), TX, H / 2 - 94);

            fadeLine(ctx, H / 2 - 82, W, 'rgba(201,149,110,0.3)');

            const bigLabel = `Lv ${user.level || 0}`;
            ctx.font = 'bold 64px Arial';
            ctx.fillStyle = tc;
            ctx.shadowColor = tc + '66';
            ctx.shadowBlur = 22;
            ctx.fillText(bigLabel, TX, H / 2 - 14);
            ctx.shadowBlur = 0;

            ctx.font = '10px Arial';
            ctx.fillStyle = '#9b6a43';
            ctx.fillText(`Role: ${user.role || 'Cadet'} · Skill: ${user.skill || 'None'}`, TX, H / 2 + 6);

            const { min, xp } = this.xpRange(user.level || 0);
            const pExp = Math.max(0, (user.exp || 0) - min);
            const pct = Math.min(100, Math.round((pExp / Math.max(1, xp)) * 100));

            const barX = TX, barY = H / 2 + 18, barW = TW, barH = 12;
            rrp(ctx, barX, barY, barW, barH, 6);
            ctx.fillStyle = 'rgba(201,149,110,0.15)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(201,149,110,0.28)';
            ctx.lineWidth = 1;
            ctx.stroke();

            const fillW = Math.max(12, (pct / 100) * barW);
            const fG = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
            fG.addColorStop(0, tc + 'bb');
            fG.addColorStop(1, tc);
            rrp(ctx, barX, barY, fillW, barH, 6);
            ctx.fillStyle = fG;
            ctx.fill();

            for (let i = 0; i < 10; i++) {
                ctx.beginPath();
                ctx.arc(barX + i * 7, barY + barH + 10, 2.2, 0, Math.PI * 2);
                ctx.fillStyle = i < Math.round(pct / 10) ? tc : 'rgba(201,149,110,0.18)';
                ctx.fill();
            }

            fadeLine(ctx, H / 2 + 52, W, 'rgba(201,149,110,0.3)');

            ctx.font = '12px Arial';
            ctx.fillStyle = '#7a3e1a';
            ctx.textAlign = 'left';
            ctx.fillText('Pengguna aktif dalam ekosistem bot.', TX, H / 2 + 72);
            ctx.fillText('Semangat terus bertualang dan berinteraksi.', TX, H / 2 + 92);

            const statY = H / 2 + 118;
            const statW = (TW - 16) / 3;
            const stats = [
                { label: 'HEALTH', val: `${user.health || 100}/100` },
                { label: 'EXP', val: `${pct}%` },
                { label: 'MONEY', val: (user.money || 0).toLocaleString('id-ID') }
            ];

            const boxColors = ['#c9184a', '#fb6f92', '#ff8fab'];
            stats.forEach(({ label, val }, i) => {
                const sx = TX + i * (statW + 8);
                rrp(ctx, sx, statY, statW, 52, 10);
                ctx.fillStyle = 'rgba(201,149,110,0.07)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(201,149,110,0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();
                rrp(ctx, sx, statY, statW, 3, 2);
                ctx.fillStyle = boxColors[i % 3] + 'cc';
                ctx.fill();
                ctx.font = 'bold 8px Arial';
                ctx.fillStyle = '#9b6a43';
                ctx.textAlign = 'center';
                ctx.fillText(label, sx + statW / 2, statY + 14);
                ctx.font = 'bold 15px Arial';
                ctx.fillStyle = '#3a1808';
                ctx.fillText(val, sx + statW / 2, statY + 34);
            });

            fadeLine(ctx, H - 36, W, 'rgba(201,149,110,0.28)');
            ctx.font = '9px Arial';
            ctx.fillStyle = 'rgba(154,100,60,0.5)';
            ctx.textAlign = 'center';
            ctx.fillText(`${global.botname || 'Bot'}  ·  Premium Profile System`, W / 2, H - 20);

            return canvas.toBuffer('image/png');
        } catch (err) {
            console.error('[Profile Card Render Error]', err.message);
            return null;
        }
    },

    async renderLevelCard(user, pushName, beforeLevel, isLevelUp, avatarUrl, statusIcon = 'MEMBER', userId = 'user', extraOpts = {}) {
        try {
            initRpgUser(user);
            const W = 720, H = 460;
            const canvas = createCanvas(W, H);
            const ctx = canvas.getContext('2d');
            const iconUpper = (statusIcon || 'MEMBER').toUpperCase();
            const tc = isLevelUp ? '#e07098' : (iconUpper === 'OWNER' ? '#e07098' : (iconUpper === 'PREMIUM' ? '#f48fb1' : '#c9956e'));
            const moneyBonus = Math.max(0, Number(extraOpts?.moneyBonus || 0));

            const bgG = ctx.createLinearGradient(0, 0, W, H);
            bgG.addColorStop(0, '#fdf8f0');
            bgG.addColorStop(0.5, '#fef9f2');
            bgG.addColorStop(1, '#faf3e8');
            ctx.fillStyle = bgG;
            ctx.fillRect(0, 0, W, H);

            for (let i = 0; i < 700; i++) {
                ctx.fillStyle = `rgba(180,140,100,${Math.random() * 0.025 + 0.005})`;
                ctx.beginPath();
                ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 0.9, 0, Math.PI * 2);
                ctx.fill();
            }

            const vign = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, W * 0.78);
            vign.addColorStop(0, 'transparent');
            vign.addColorStop(1, 'rgba(140,90,40,0.14)');
            ctx.fillStyle = vign;
            ctx.fillRect(0, 0, W, H);

            const warmBlob = ctx.createRadialGradient(W * 0.12, H * 0.18, 0, W * 0.12, H * 0.18, 220);
            warmBlob.addColorStop(0, tc + '18');
            warmBlob.addColorStop(1, 'transparent');
            ctx.fillStyle = warmBlob;
            ctx.fillRect(0, 0, W, H);

            const M = 20;
            rrp(ctx, M, M, W - M * 2, H - M * 2, 16);
            ctx.strokeStyle = '#c9956e';
            ctx.lineWidth = 2;
            ctx.stroke();
            rrp(ctx, M + 6, M + 6, W - M * 2 - 12, H - M * 2 - 12, 12);
            ctx.strokeStyle = 'rgba(201,149,110,0.25)';
            ctx.lineWidth = 1;
            ctx.stroke();
            cornerL(ctx, M + 4, M + 4, W - M * 2 - 8, H - M * 2 - 8, 28, '#c9956e');

            const sp = '#f8a4c0', sl = '#fcc8d8', sd = '#e87098';
            sakura(ctx, 46, 46, 32, sl, 0.20);
            sakura(ctx, W - 50, 38, 25, sp, 0.16);
            sakura(ctx, 38, H - 46, 28, sp, 0.18);
            sakura(ctx, W - 44, H - 50, 30, sl, 0.15);
            sakura(ctx, W * 0.5, 30, 16, sd, 0.10);
            [
                [W * 0.82, H * 0.08, 10, 0.3, sp],
                [W * 0.12, H * 0.25, 8, 0.8, sl],
                [W * 0.92, H * 0.52, 9, 1.1, sp],
                [W * 0.08, H * 0.74, 9, 0.2, sd],
                [W * 0.76, H * 0.90, 8, 1.5, sl],
                [W * 0.42, H * 0.96, 7, 0.6, sp],
                [W * 0.95, H * 0.28, 7, 1.8, sd],
            ].forEach(([px, py, pr, pa, pc]) => petal(ctx, px, py, pr, pa, pc, 0.48));

            const AV_R = 72;
            const AV_CX = M + 28 + AV_R;
            const AV_CY = H / 2;

            const ringG = ctx.createLinearGradient(AV_CX - AV_R, AV_CY - AV_R, AV_CX + AV_R, AV_CY + AV_R);
            ringG.addColorStop(0, tc);
            ringG.addColorStop(0.5, tc + 'aa');
            ringG.addColorStop(1, tc);
            ctx.beginPath();
            ctx.arc(AV_CX, AV_CY, AV_R + 6, 0, Math.PI * 2);
            ctx.strokeStyle = ringG;
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.save();
            ctx.setLineDash([4, 5]);
            ctx.beginPath();
            ctx.arc(AV_CX, AV_CY, AV_R + 12, 0, Math.PI * 2);
            ctx.strokeStyle = tc + '55';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            ctx.arc(AV_CX, AV_CY, AV_R, 0, Math.PI * 2);
            ctx.clip();
            let avatarLoaded = false;
            if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('http')) {
                try {
                    const res = await axios.get(avatarUrl, { responseType: 'arraybuffer', timeout: 5000 });
                    const img = await loadImage(Buffer.from(res.data));
                    ctx.drawImage(img, AV_CX - AV_R, AV_CY - AV_R, AV_R * 2, AV_R * 2);
                    avatarLoaded = true;
                } catch (_) {}
            }
            if (!avatarLoaded) {
                drawDefaultAvatar(ctx, AV_CX, AV_CY, AV_R);
            }
            ctx.restore();

            const roleBadgeW = 86, roleBadgeH = 22;
            const tbx = AV_CX - roleBadgeW / 2;
            const tby = AV_CY + AV_R + 14;
            rrp(ctx, tbx, tby, roleBadgeW, roleBadgeH, 11);
            ctx.fillStyle = tc + 'dd';
            ctx.fill();
            ctx.font = 'bold 9px Arial';
            ctx.fillStyle = '#fff8f0';
            ctx.textAlign = 'center';
            ctx.fillText((user.role || 'Cadet').toUpperCase().slice(0, 14), AV_CX, tby + 15);

            const TX = AV_CX + AV_R + 36;
            const TW = W - TX - M - 14;

            ctx.font = 'bold 9px Arial';
            ctx.fillStyle = '#b07850';
            ctx.textAlign = 'left';
            ctx.fillText(isLevelUp ? '✦  LEVEL UP PROMOTION  ✦' : '✦  LEVEL PROGRESSION  ✦', TX, H / 2 - 138);

            const displayName = (pushName || 'Player').length > 20 ? (pushName || 'Player').slice(0, 20) + '…' : (pushName || 'Player');
            ctx.font = 'bold 30px Arial';
            ctx.fillStyle = '#4a1e0a';
            ctx.shadowColor = 'rgba(201,149,110,0.28)';
            ctx.shadowBlur = 12;
            ctx.fillText(displayName, TX, H / 2 - 112);
            ctx.shadowBlur = 0;

            ctx.font = '11px Arial';
            ctx.fillStyle = '#9b6a43';
            ctx.fillText('@' + (userId || 'user'), TX, H / 2 - 94);

            fadeLine(ctx, H / 2 - 82, W, 'rgba(201,149,110,0.3)');

            const bigLabel = isLevelUp ? `Lv ${beforeLevel} ➔ Lv ${user.level}` : `Lv ${user.level || 0}`;
            const bigFontSize = bigLabel.length >= 13 ? 42 : (bigLabel.length >= 10 ? 50 : 58);
            ctx.font = `bold ${bigFontSize}px Arial`;
            ctx.fillStyle = tc;
            ctx.shadowColor = tc + '66';
            ctx.shadowBlur = 22;
            ctx.fillText(bigLabel, TX, H / 2 - 14);
            ctx.shadowBlur = 0;

            ctx.font = '10px Arial';
            ctx.fillStyle = '#9b6a43';
            ctx.fillText(`Rank: ${user.role || 'Beginner'} · Skill: ${user.skill || 'None'}`, TX, H / 2 + 6);

            const { min, xp, max } = this.xpRange(user.level || 0);
            const pExp = Math.max(0, (user.exp || 0) - min);
            const pct = Math.min(100, Math.round((pExp / Math.max(1, xp)) * 100));

            const barX = TX, barY = H / 2 + 18, barW = TW, barH = 12;
            rrp(ctx, barX, barY, barW, barH, 6);
            ctx.fillStyle = 'rgba(201,149,110,0.15)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(201,149,110,0.28)';
            ctx.lineWidth = 1;
            ctx.stroke();

            const fillW = Math.max(12, (pct / 100) * barW);
            const fG = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
            fG.addColorStop(0, tc + 'bb');
            fG.addColorStop(1, tc);
            rrp(ctx, barX, barY, fillW, barH, 6);
            ctx.fillStyle = fG;
            ctx.fill();

            for (let i = 0; i < 10; i++) {
                ctx.beginPath();
                ctx.arc(barX + i * 7, barY + barH + 10, 2.2, 0, Math.PI * 2);
                ctx.fillStyle = i < Math.round(pct / 10) ? tc : 'rgba(201,149,110,0.18)';
                ctx.fill();
            }

            fadeLine(ctx, H / 2 + 52, W, 'rgba(201,149,110,0.3)');

            ctx.font = '12px Arial';
            ctx.fillStyle = '#7a3e1a';
            ctx.textAlign = 'left';
            if (isLevelUp) {
                ctx.fillText(`Selamat! Kamu naik ke Lv.${user.level} (${user.role}).`, TX, H / 2 + 72);
                ctx.fillText(
                    moneyBonus > 0
                        ? `Hadiah naik level: +Rp ${moneyBonus.toLocaleString('id-ID')} Money!`
                        : 'Terus gunakan bot dan kumpulkan EXP lebih banyak!',
                    TX,
                    H / 2 + 92
                );
            } else {
                ctx.fillText('Pengalaman bertualang terus berkembang.', TX, H / 2 + 72);
                ctx.fillText('Raih level berikutnya untuk membuka gelar baru.', TX, H / 2 + 92);
            }

            const statY = H / 2 + 118;
            const statW = (TW - 16) / 3;
            const stats = (isLevelUp && moneyBonus > 0)
                ? [
                    { label: 'EXP', val: `${pct}%` },
                    { label: 'BONUS MONEY', val: `+${moneyBonus.toLocaleString('id-ID')}` },
                    { label: 'TOTAL MONEY', val: (user.money || 0).toLocaleString('id-ID') }
                ]
                : [
                    { label: 'CURRENT', val: `${pExp.toLocaleString('id-ID')}` },
                    { label: 'TARGET', val: `${xp.toLocaleString('id-ID')}` },
                    { label: 'PROGRESS', val: `${pct}%` }
                ];

            const boxColors = ['#c9184a', '#fb6f92', '#ff8fab'];
            stats.forEach(({ label, val }, i) => {
                const sx = TX + i * (statW + 8);
                rrp(ctx, sx, statY, statW, 52, 10);
                ctx.fillStyle = 'rgba(201,149,110,0.07)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(201,149,110,0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();
                rrp(ctx, sx, statY, statW, 3, 2);
                ctx.fillStyle = boxColors[i % 3] + 'cc';
                ctx.fill();
                ctx.font = 'bold 8px Arial';
                ctx.fillStyle = '#9b6a43';
                ctx.textAlign = 'center';
                ctx.fillText(label, sx + statW / 2, statY + 14);
                ctx.font = 'bold 15px Arial';
                ctx.fillStyle = '#3a1808';
                ctx.fillText(val, sx + statW / 2, statY + 34);
            });

            fadeLine(ctx, H - 36, W, 'rgba(201,149,110,0.28)');
            ctx.font = '9px Arial';
            ctx.fillStyle = 'rgba(154,100,60,0.5)';
            ctx.textAlign = 'center';
            ctx.fillText(`${global.botname || 'Bot'}  ·  Level Progression System`, W / 2, H - 20);

            return canvas.toBuffer('image/png');
        } catch (err) {
            console.error('[Level Card Render Error]', err.message);
            return null;
        }
    },

    async renderLeaderboardCard(usersObj, sortKey = 'level') {
        try {
            const W = 850, H = 580;
            const canvas = createCanvas(W, H);
            const ctx = canvas.getContext('2d');

            const key = (sortKey || 'level').toLowerCase();
            const validKeys = ['level', 'exp', 'money', 'bank', 'diamond', 'iron', 'gold', 'emerald', 'potion'];
            const activeKey = validKeys.includes(key) ? key : 'level';

            const list = Object.entries(usersObj || {})
                .filter(([jid, u]) => jid && !jid.includes('@newsletter') && !jid.includes('@g.us') && !jid.includes('broadcast') && (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid')))
                .map(([jid, u]) => {
                    initRpgUser(u);
                    return { jid, val: u[activeKey] || 0 };
                })
                .filter(item => item.val > 0)
                .sort((a, b) => b.val - a.val)
                .slice(0, 5);

            const bgG = ctx.createLinearGradient(0, 0, W, H);
            bgG.addColorStop(0, '#fdf8f0');
            bgG.addColorStop(0.5, '#fef9f2');
            bgG.addColorStop(1, '#faf3e8');
            ctx.fillStyle = bgG;
            ctx.fillRect(0, 0, W, H);

            for (let i = 0; i < 700; i++) {
                ctx.fillStyle = `rgba(180,140,100,${Math.random() * 0.025 + 0.005})`;
                ctx.beginPath();
                ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 0.9, 0, Math.PI * 2);
                ctx.fill();
            }

            const vign = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, W * 0.78);
            vign.addColorStop(0, 'transparent');
            vign.addColorStop(1, 'rgba(140,90,40,0.14)');
            ctx.fillStyle = vign;
            ctx.fillRect(0, 0, W, H);

            const M = 20;
            rrp(ctx, M, M, W - M * 2, H - M * 2, 16);
            ctx.strokeStyle = '#c9956e';
            ctx.lineWidth = 2;
            ctx.stroke();
            rrp(ctx, M + 6, M + 6, W - M * 2 - 12, H - M * 2 - 12, 12);
            ctx.strokeStyle = 'rgba(201,149,110,0.25)';
            ctx.lineWidth = 1;
            ctx.stroke();
            cornerL(ctx, M + 4, M + 4, W - M * 2 - 8, H - M * 2 - 8, 28, '#c9956e');

            const sp = '#f8a4c0', sl = '#fcc8d8';
            sakura(ctx, 46, 46, 32, sl, 0.20);
            sakura(ctx, W - 50, 38, 25, sp, 0.16);

            ctx.font = 'bold 11px Arial';
            ctx.fillStyle = '#b07850';
            ctx.textAlign = 'center';
            ctx.fillText(`✦  HALL OF FAME (${activeKey.toUpperCase()})  ✦`, W / 2, M + 35);

            fadeLine(ctx, M + 50, W, 'rgba(201,149,110,0.3)');

            const rowX = M + 35;
            const rowW = W - (M + 35) * 2;
            const rowH = 68;
            const rowGap = 14;
            const startY = M + 70;

            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
            const tierTags = ['CHAMPION', 'RUNNER UP', '3RD PLACE', 'TOP 5', 'TOP 5'];
            const boxAccents = ['#c9184a', '#fb6f92', '#ff8fab', '#e07098', '#e07098'];

            if (list.length === 0) {
                ctx.font = '16px Arial';
                ctx.fillStyle = '#7a3e1a';
                ctx.fillText(`Belum ada data peringkat untuk ${activeKey}.`, W / 2, H / 2);
            } else {
                list.forEach((item, idx) => {
                    const y = startY + idx * (rowH + rowGap);
                    rrp(ctx, rowX, y, rowW, rowH, 12);
                    ctx.fillStyle = 'rgba(201,149,110,0.08)';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(201,149,110,0.25)';
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    rrp(ctx, rowX, y, 4, rowH, 2);
                    ctx.fillStyle = boxAccents[idx];
                    ctx.fill();

                    ctx.font = '26px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillText(medals[idx], rowX + 18, y + 44);

                    ctx.font = 'bold 18px Arial';
                    ctx.fillStyle = '#4a1e0a';
                    ctx.fillText(`@${item.jid.split('@')[0]}`, rowX + 65, y + 34);

                    ctx.font = 'bold 10px Arial';
                    ctx.fillStyle = '#9b6a43';
                    ctx.fillText(tierTags[idx], rowX + 65, y + 52);

                    ctx.textAlign = 'right';
                    ctx.font = 'bold 20px Arial';
                    ctx.fillStyle = boxAccents[idx];
                    ctx.fillText(`${item.val.toLocaleString('id-ID')} ${activeKey.toUpperCase()}`, rowX + rowW - 22, y + 42);
                });
            }

            fadeLine(ctx, H - 36, W, 'rgba(201,149,110,0.28)');
            ctx.font = '9px Arial';
            ctx.fillStyle = 'rgba(154,100,60,0.5)';
            ctx.textAlign = 'center';
            ctx.fillText(`${global.botname || 'Bot'}  ·  Leaderboard System`, W / 2, H - 18);

            return canvas.toBuffer('image/png');
        } catch (err) {
            console.error('[Leaderboard Card Render Error]', err.message);
            return null;
        }
    },

    getProfile(user, pushName, userJid) {
        initRpgUser(user);
        const { min, xp } = this.xpRange(user.level);
        const progressExp = Math.max(0, user.exp - min);
        const percentExp = Math.min(100, Math.round((progressExp / Math.max(1, xp)) * 100));
        const userId = userJid ? userJid.split('@')[0] : 'user';

        return `\`⌜ User Profile ⌟\`
> ◦ *Name :* ${pushName || 'Player'}
> ◦ *Tag :* @${userId}
> ◦ *Level :* Lv. ${user.level} (${user.role})
> ◦ *Health :* ${user.health}/100 HP
> ◦ *Exp :* ${user.exp.toLocaleString('id-ID')} (${percentExp}%)
> ◦ *Money :* Rp ${user.money.toLocaleString('id-ID')}
> ◦ *Bank :* Rp ${user.bank.toLocaleString('id-ID')}
> ◦ *Diamond :* ${user.diamond} 💎${user.skill ? `\n> ◦ *Skill :* ${user.skill}` : ''}`.trim();
    },

    rollLevelMoneyBonus(newLevel) {
        const base = Math.floor(Math.random() * 3501) + 1500;
        const levelScale = Math.max(0, Number(newLevel || 1)) * 250;
        return base + levelScale;
    },

    grantCommandExp(user, opts = {}) {
        initRpgUser(user);
        const userKey = String(opts.userKey || '');
        const cooldownMs = Number(opts.cooldownMs ?? 2000);
        const now = Date.now();

        if (!global._cmdExpCooldown) global._cmdExpCooldown = new Map();
        if (userKey && cooldownMs > 0) {
            const lastTs = global._cmdExpCooldown.get(userKey) || 0;
            if (now - lastTs < cooldownMs) {
                return {
                    awarded: false,
                    expGain: 0,
                    leveledUp: false,
                    beforeLevel: user.level,
                    afterLevel: user.level,
                    levelsGained: 0,
                    moneyBonus: 0,
                    role: user.role
                };
            }
            global._cmdExpCooldown.set(userKey, now);
            if (global._cmdExpCooldown.size > 3000) {
                const firstKey = global._cmdExpCooldown.keys().next().value;
                global._cmdExpCooldown.delete(firstKey);
            }
        }

        const expGain = Math.floor(Math.random() * 26) + 15;
        user.exp += expGain;

        const beforeLevel = user.level * 1;
        let moneyBonus = 0;

        while (user.exp >= Math.floor(Math.pow(user.level + 1, 2) * 100)) {
            user.level += 1;
            const bonus = this.rollLevelMoneyBonus(user.level);
            user.money += bonus;
            moneyBonus += bonus;
        }

        user.role = getRoleByLevel(user.level);
        const leveledUp = user.level > beforeLevel;

        return {
            awarded: true,
            expGain,
            leveledUp,
            beforeLevel,
            afterLevel: user.level,
            levelsGained: user.level - beforeLevel,
            moneyBonus,
            role: user.role,
            totalExp: user.exp,
            totalMoney: user.money
        };
    },

    levelup(user, userJid) {
        initRpgUser(user);
        const canUp = user.exp >= Math.floor(Math.pow(user.level + 1, 2) * 100);
        const { min, xp, max } = this.xpRange(user.level);
        const progressExp = Math.max(0, user.exp - min);
        const percentExp = Math.min(100, Math.round((progressExp / Math.max(1, xp)) * 100));
        let before = user.level * 1;
        const userId = userJid ? userJid.split('@')[0] : 'user';

        if (!canUp) {
            return {
                success: false,
                beforeLevel: before,
                isLevelUp: false,
                moneyBonus: 0,
                message: `\`⌜ Level Status ⌟\`
> ◦ *User :* @${userId}
> ◦ *Level :* Lv. ${user.level} (${user.role})
> ◦ *Exp :* ${progressExp.toLocaleString('id-ID')} / ${xp.toLocaleString('id-ID')} (${percentExp}%)
> ◦ *Progress :* Kurang ${(max - user.exp).toLocaleString('id-ID')} Exp lagi`
            };
        }
        let moneyBonus = 0;
        while (user.exp >= Math.floor(Math.pow(user.level + 1, 2) * 100)) {
            user.level++;
            const bonus = this.rollLevelMoneyBonus(user.level);
            user.money += bonus;
            moneyBonus += bonus;
        }
        user.role = getRoleByLevel(user.level);
        return {
            success: true,
            beforeLevel: before,
            isLevelUp: true,
            moneyBonus,
            message: `\`⌜ Level Up Promotion 🎉 ⌟\`
> ◦ *User :* @${userId}
> ◦ *Level :* Lv. ${before} ➔ Lv. ${user.level}
> ◦ *Gelar Baru :* *${user.role}*
> ◦ *Bonus Money :* +Rp ${moneyBonus.toLocaleString('id-ID')}
> ◦ *Total Exp :* ${user.exp.toLocaleString('id-ID')} Exp`
        };
    },

    getInventory(user, pushName) {
        initRpgUser(user);

        const armorNames = {
            '0': 'None (❌)', '1': 'Leather Armor', '2': 'Iron Armor', '3': 'Gold Armor',
            '4': 'Diamond Armor', '5': 'Emerald Armor', '6': 'Crystal Armor',
            '7': 'Obsidian Armor', '8': 'Netherite Armor', '9': 'Wither Armor',
            '10': 'Dragon Armor', '11': 'Hacker Armor'
        };

        const swordNames = {
            '0': 'None (❌)', '1': 'Wooden Sword', '2': 'Stone Sword', '3': 'Iron Sword',
            '4': 'Gold Sword', '5': 'Copper Sword', '6': 'Diamond Sword',
            '7': 'Emerald Sword', '8': 'Obsidian Sword', '9': 'Netherite Sword',
            '10': 'Samurai Slayer Sword', '11': 'Hacker Sword'
        };

        const pickaxeNames = {
            '0': 'None (❌)', '1': 'Wooden Pickaxe', '2': 'Stone Pickaxe', '3': 'Iron Pickaxe',
            '4': 'Gold Pickaxe', '5': 'Copper Pickaxe', '6': 'Diamond Pickaxe',
            '7': 'Emerald Pickaxe', '8': 'Crystal Pickaxe', '9': 'Obsidian Pickaxe',
            '10': 'Netherite Pickaxe', '11': 'Hacker Pickaxe'
        };

        const now = Date.now();
        const cdAdventure = (now - user.lastadventure >= 300000) ? '🟢 Siap' : '🔴 Cooldown';
        const cdMining = (now - user.lastmining >= 300000) ? '🟢 Siap' : '🔴 Cooldown';
        const cdFishing = (now - user.lastfishing >= 240000) ? '🟢 Siap' : '🔴 Cooldown';
        const cdDaily = (now - user.lastclaim >= 86400000) ? '🟢 Siap' : '🔴 Cooldown';
        const cdWeekly = (now - user.lastweekly >= 604800000) ? '🟢 Siap' : '🔴 Cooldown';
        const cdMonthly = (now - user.lastmonthly >= 2592000000) ? '🟢 Siap' : '🔴 Cooldown';

        const totalItems = user.potion + user.trash + user.wood + user.rock + user.string + user.emerald + user.diamond + user.gold + user.iron + user.upgrader;
        const totalCrates = user.common + user.uncommon + user.mythic + user.legendary;

        let pets = [];
        if (user.cat > 0) pets.push(`> ◦ 🐈 Kucing : Lv.${user.cat}`);
        if (user.dog > 0) pets.push(`> ◦ 🐕 Anjing : Lv.${user.dog}`);
        if (user.fox > 0) pets.push(`> ◦ 🦊 Rubah : Lv.${user.fox}`);
        if (user.horse > 0) pets.push(`> ◦ 🐎 Kuda : Lv.${user.horse}`);

        let text = `\`⌜ Inventory: ${pushName || 'Player'} ⌟\`
> ◦ *Health :* ${user.health}/100 HP
> ◦ *Level :* Lv. ${user.level} (${user.role})
> ◦ *Money :* Rp ${user.money.toLocaleString('id-ID')}
> ◦ *Exp :* ${user.exp.toLocaleString('id-ID')} Exp${user.skill ? `\n> ◦ *Skill :* ${user.skill}` : ''}

\`⌜ Equipment & Durability ⌟\`
> ◦ 🥼 Armor : *${armorNames[user.armor] || 'Level ' + user.armor}* (${user.armordurability}%)
> ◦ 🗡️ Sword : *${swordNames[user.sword] || 'Level ' + user.sword}* (${user.sworddurability}%)
> ◦ ⛏️ Pickaxe : *${pickaxeNames[user.pickaxe] || 'Level ' + user.pickaxe}* (${user.pickaxedurability}%)
> ◦ 🎣 Fishingrod : *${user.fishingrod > 0 ? 'Level ' + user.fishingrod : 'None (❌)'}* (${user.fishingroddurability}%)

\`⌜ Resources & Mining ⌟\`
> ◦ 🥤 Potion : ${user.potion} | 💎 Diamond : ${user.diamond}
> ◦ 🪙 Gold : ${user.gold} | ⛓️ Iron : ${user.iron}
> ◦ ❇️ Emerald : ${user.emerald} | 🪨 Rock : ${user.rock}
> ◦ 🪵 Wood : ${user.wood} | 🕸️ String : ${user.string}
> ◦ 🗑️ Trash : ${user.trash} | 🔧 Upgrader : ${user.upgrader}
> ◦ *Total Item :* ${totalItems} Items

\`⌜ Crates & Mystery Box ⌟\`
> ◦ 📦 Common : ${user.common} | 🛍️ Uncommon : ${user.uncommon}
> ◦ 🎁 Mythic : ${user.mythic} | 🧰 Legendary : ${user.legendary}
> ◦ *Total Crate :* ${totalCrates} Box

\`⌜ Companion & Pet ⌟\`
${pets.length > 0 ? pets.join('\n') + '\n' : ''}> ◦ 🍖 Pet Food : ${user.petFood}

\`⌜ Status Cooldown ⌟\`
> ◦ Adventure : ${cdAdventure} | Mining : ${cdMining}
> ◦ Mancing : ${cdFishing} | Daily Claim : ${cdDaily}
> ◦ Weekly : ${cdWeekly} | Monthly : ${cdMonthly}`;

        return text.trim();
    },

    adventure(user) {
        initRpgUser(user);
        const cooldown = 300000;
        const now = Date.now();
        if (now - user.lastadventure <= cooldown) {
            const timers = clockString(cooldown - (now - user.lastadventure));
            return { success: false, message: `Kamu masih kelelahan dari petualangan sebelumnya! Silakan istirahat *🕐 ${timers}* lagi.` };
        }
        if (user.health < 80) {
            return { success: false, message: `❤️ Health kamu tersisa *${user.health}*! Butuh minimal *80 Health* untuk berpetualang.\n\nGunakan potion dengan mengetik *heal* atau beli di *shop buy potion <jumlah>*.` };
        }

        const armorReduction = (user.armor || 0) * 3;
        const swordBonus = (user.sword || 0) * 15;
        const catBonus = (user.cat || 0) * 4;
        const foxBonus = (user.fox || 0);
        const horseBonus = (user.horse || 0);

        let healthLost = Math.max(8, 90 - catBonus - armorReduction + Math.floor(Math.random() * 15));
        let moneyGain = Math.floor(Math.random() * 250) + 100 + swordBonus;
        let expGain = Math.floor(Math.random() * 350) + 150 + (horseBonus * 20);
        let trashGain = Math.floor(Math.random() * 80) + 15;
        let potionGain = Math.floor(Math.random() * 2);
        let rockGain = Math.floor(Math.random() * 3);
        let woodGain = Math.floor(Math.random() * 3);
        let stringGain = Math.floor(Math.random() * 2);

        const commonGot = Math.random() > 0.45 ? 1 : 0;
        const uncommonGot = Math.random() > 0.65 ? 1 : 0;
        const mythicGot = Math.random() > (0.90 - (foxBonus * 0.02)) ? 1 : 0;
        const diamondGot = Math.random() > 0.92 ? 1 : 0;
        const goldGot = Math.random() > 0.80 ? 1 : 0;
        const ironGot = Math.random() > 0.65 ? 1 : 0;

        let skillLog = '';
        if (user.skill === 'swordmaster') {
            moneyGain = Math.floor(moneyGain * 1.2);
            expGain = Math.floor(expGain * 1.25);
            skillLog = `\n🗡️ *[Skill: Swordmaster]* Tebasan pedang fatal menumbangkan monster dengan cepat! (+20% Money, +25% Exp)`;
        } else if (user.skill === 'thief') {
            moneyGain = Math.floor(moneyGain * 1.35);
            skillLog = `\n🥷 *[Skill: Thief]* Menjarah kantong emas musuh secara lihai! (+35% Money)`;
        } else if (user.skill === 'shadow') {
            healthLost = Math.max(5, Math.floor(healthLost * 0.65));
            skillLog = `\n👥 *[Skill: Shadow]* Menghilang ke dalam bayangan dan menghindari sebagian besar serangan musuh! (-35% Damage Taken)`;
        } else if (user.skill === 'witch') {
            if (Math.random() > 0.4) potionGain += 1;
            skillLog = `\n🧙‍♀️ *[Skill: Witch]* Meracik ramuan herbal mistis dari hutan belantara! (+Potion)`;
        } else if (user.skill === 'necromancer') {
            expGain = Math.floor(expGain * 1.3);
            if (Math.random() > 0.5) rockGain += 2;
            skillLog = `\n💀 *[Skill: Necromancer]* Memanggil pasukan undead untuk mengumpulkan sumber daya alam! (+30% Exp)`;
        } else if (user.skill === 'archer') {
            expGain = Math.floor(expGain * 1.2);
            skillLog = `\n🏹 *[Skill: Archer]* Membidik titik lemah monster dari jarak jauh dengan akurasi tinggi!`;
        } else if (user.skill === 'magicswordmaster') {
            expGain = Math.floor(expGain * 1.2);
            moneyGain = Math.floor(moneyGain * 1.15);
            skillLog = `\n⚔️✨ *[Skill: Magic Swordmaster]* Menyulut pedang dengan api magis yang membakar pertahanan musuh!`;
        }

        let petLog = '';
        if (user.dog > 0 && Math.random() > 0.5) {
            user.iron += 1;
            petLog += `\n🐕 *[Pet Dog]* Anjing setiamu menggali tanah dan menemukan +1 Iron!`;
        }
        if (user.fox > 0 && Math.random() > 0.6) {
            petLog += `\n🦊 *[Pet Fox]* Rubah peliharaanmu mengendus jejak peti harta karun tersembunyi!`;
        }

        const dungeons = [
            { name: "🌲 Hutan Terlarang (Forbidden Forest)", story: "Menyusuri semak belukar lebat dan menyergap kawanan Goblin Pemburu!" },
            { name: "🏰 Reruntuhan Kastil Kuno (Ancient Fortress)", story: "Menjelajahi lorong bawah tanah gelap yang dijaga Ksatria Tengkorak!" },
            { name: "🌋 Lembah Kawah Magma (Infernal Volcano)", story: "Menghindari semburan lava panas dan menumbangkan Golem Batu Api!" },
            { name: "🏜️ Gurun Pasir Ilusi (Desert of Whispers)", story: "Menembus badai pasir ganas dan menemukan makam firaun kuno!" },
            { name: "🌌 Kuil Dimensi Astral (Celestial Astral Void)", story: "Melawan monster bayangan antar-dimensi dan menyerap esensi kosmik!" }
        ];
        const selectedDungeon = user.level > 50 ? dungeons[4] : user.level > 25 ? dungeons[2] : user.level > 10 ? dungeons[1] : pickRandom(dungeons);

        user.health = Math.max(0, user.health - healthLost);
        user.money += moneyGain;
        user.exp += expGain;
        user.trash += trashGain;
        user.potion += potionGain;
        user.rock += rockGain;
        user.wood += woodGain;
        user.string += stringGain;
        user.common += commonGot;
        user.uncommon += uncommonGot;
        user.mythic += mythicGot;
        user.diamond += diamondGot;
        user.gold += goldGot;
        user.iron += ironGot;
        user.lastadventure = now;

        if (user.sword > 0) user.sworddurability = Math.max(0, user.sworddurability - 5);
        if (user.armor > 0) user.armordurability = Math.max(0, user.armordurability - 5);

        let lootList = [];
        lootList.push(`✨ Exp: +${expGain.toLocaleString('id-ID')}`);
        lootList.push(`💹 Money: +${moneyGain.toLocaleString('id-ID')}`);
        lootList.push(`🗑️ Trash: +${trashGain}`);
        if (potionGain) lootList.push(`🥤 Potion: +${potionGain}`);
        if (rockGain) lootList.push(`🪨 Rock: +${rockGain}`);
        if (woodGain) lootList.push(`🪵 Wood: +${woodGain}`);
        if (stringGain) lootList.push(`🕸️ String: +${stringGain}`);
        if (ironGot) lootList.push(`⛓️ Iron: +${ironGot}`);
        if (goldGot) lootList.push(`🪙 Gold: +${goldGot}`);
        if (diamondGot) lootList.push(`💎 Diamond: +${diamondGot}`);
        if (commonGot) lootList.push(`📦 Common Crate: +${commonGot}`);
        if (uncommonGot) lootList.push(`🛍️ Uncommon Crate: +${uncommonGot}`);
        if (mythicGot) lootList.push(`🎁 Mythic Crate: +${mythicGot}`);

        const resultMessage = `]──❏ *PETUALANGAN SELESAI* ❏──[
🗺️ • *Area:* ${selectedDungeon.name}
⚔️ • *Pertarungan:* ${selectedDungeon.story}${skillLog}${petLog}
❤️ • *Damage Diterima:* -${healthLost} Health (Sisa: ${user.health}/100)

*🎁 Hadiah & Jarahan:*
${lootList.map(v => `> ◦ ${v}`).join('\n')}`.trim();

        return { success: true, message: resultMessage };
    },

    berburu(user) {
        initRpgUser(user);
        const cooldown = 3600000;
        const now = Date.now();
        if (now - user.lastberburu <= cooldown) {
            const timers = clockString(cooldown - (now - user.lastberburu));
            return { success: false, message: `Kamu sudah lelah berburu! Tunggu *${timers}* lagi untuk memulihkan stamina.` };
        }

        const isArcher = user.skill === 'archer';
        const archerBonus = isArcher ? 3 : 0;
        const dogBonus = user.dog > 0 ? 1 : 0;

        const banteng = Math.floor(Math.random() * 8) + 1 + archerBonus;
        const harimau = Math.floor(Math.random() * 6) + 1 + dogBonus;
        const gajah = Math.floor(Math.random() * 5) + 1;
        const kambing = Math.floor(Math.random() * 9) + 2 + archerBonus;
        const panda = Math.floor(Math.random() * 4) + 1;
        const buaya = Math.floor(Math.random() * 5) + 1;
        const sapi = Math.floor(Math.random() * 8) + 2;
        const monyet = Math.floor(Math.random() * 9) + 2;
        const ayam = Math.floor(Math.random() * 12) + 3;
        const babihutan = Math.floor(Math.random() * 7) + 1;

        user.banteng += banteng;
        user.harimau += harimau;
        user.gajah += gajah;
        user.kambing += kambing;
        user.panda += panda;
        user.buaya += buaya;
        user.sapi += sapi;
        user.monyet += monyet;
        user.ayam += ayam;
        user.babihutan += babihutan;
        user.lastberburu = now;

        const huntZones = [
            "Savana Belantara Savanna",
            "Hutan Rimba Tropis",
            "Rawa Amazon",
            "Lembah Pegunungan Liar"
        ];
        const selectedZone = pickRandom(huntZones);
        const archerText = isArcher ? "\n🏹 *[Skill: Archer]* Tembakan jitu tepat sasaran melipatgandakan hasil buruan!" : "";

        return {
            success: true,
            message: `]──❏ *HASIL BERBURU* ❏──[
🌲 • *Lokasi:* ${selectedZone}
🏹 • *Aksi:* Berhasil melacak dan menangkap hewan liar untuk kandang!${archerText}

*🐾 Hewan Tangkapan:*
> ◦ 🐂 Banteng: +${banteng}
> ◦ 🐅 Harimau: +${harimau}
> ◦ 🐘 Gajah: +${gajah}
> ◦ 🐐 Kambing: +${kambing}
> ◦ 🐼 Panda: +${panda}
> ◦ 🐊 Buaya: +${buaya}
> ◦ 🐂 Sapi: +${sapi}
> ◦ 🐒 Monyet: +${monyet}
> ◦ 🐔 Ayam: +${ayam}
> ◦ 🐗 Babi Hutan: +${babihutan}

_Ketik *kandang* untuk melihat isi kandangmu atau *shop sell* untuk menjualnya._`
        };
    },

    getKandang(user) {
        initRpgUser(user);
        return `*《 KANDANG HEWAN MU 》*

 ➲ 🐂 Banteng: [ ${user.banteng || 0} ] Ekor
 ➲ 🐅 Harimau: [ ${user.harimau || 0} ] Ekor
 ➲ 🐘 Gajah: [ ${user.gajah || 0} ] Ekor
 ➲ 🐐 Kambing: [ ${user.kambing || 0} ] Ekor
 ➲ 🐼 Panda: [ ${user.panda || 0} ] Ekor
 ➲ 🐊 Buaya: [ ${user.buaya || 0} ] Ekor
 ➲ 🐂 Kerbau: [ ${user.kerbau || 0} ] Ekor
 ➲ 🐂 Sapi: [ ${user.sapi || 0} ] Ekor
 ➲ 🐒 Monyet: [ ${user.monyet || 0} ] Ekor
 ➲ 🐗 Babi Hutan: [ ${user.babihutan || 0} ] Ekor
 ➲ 🐖 Babi: [ ${user.babi || 0} ] Ekor
 ➲ 🐔 Ayam: [ ${user.ayam || 0} ] Ekor`.trim();
    },

    mancing(user) {
        initRpgUser(user);
        if (user.fishingrod <= 0) {
            return { success: false, message: `*[❗] Kamu tidak memiliki alat pancingan (Fishingrod)* 🎣\nKetik *craft pancing* untuk membuatnya terlebih dahulu.` };
        }
        const cooldown = 240000;
        const now = Date.now();
        if (now - user.lastfishing <= cooldown) {
            const timers = clockString(cooldown - (now - user.lastfishing));
            return { success: false, message: `Kamu masih menunggu ikan memakan umpan! Tunggu *${timers}* lagi.` };
        }

        const rodBonus = user.fishingrod * 2;
        const nila = Math.floor(Math.random() * 12) + 2 + rodBonus;
        const bawal = Math.floor(Math.random() * 10) + 1 + rodBonus;
        const lele = Math.floor(Math.random() * 15) + 3 + rodBonus;
        const ikan = Math.floor(Math.random() * 25) + 5 + rodBonus;
        const udang = Math.floor(Math.random() * 20) + 2;
        const kepiting = Math.floor(Math.random() * 15) + 1;
        const paus = Math.random() > 0.85 ? Math.floor(Math.random() * 2) + 1 : 0;
        const hiu = Math.random() > 0.90 ? 1 : 0;
        const lumba = Math.random() > 0.92 ? 1 : 0;
        const lobster = Math.random() > 0.88 ? 2 : 0;
        const cumi = Math.random() > 0.80 ? 3 : 0;

        const sunkenCrate = Math.random() > 0.85 ? (Math.random() > 0.7 ? 'uncommon' : 'common') : null;
        if (sunkenCrate) user[sunkenCrate] += 1;

        user.ikan += ikan;
        user.lele += lele;
        user.nila += nila;
        user.bawal += bawal;
        user.udang += udang;
        user.paus += paus;
        user.kepiting += kepiting;
        user.hiu += hiu;
        user.lumba += lumba;
        user.lobster += lobster;
        user.cumi += cumi;
        user.fishingroddurability = Math.max(0, user.fishingroddurability - 8);
        user.lastfishing = now;

        const fishingSpots = [
            "Danau Tenang Crystal Lake",
            "Muara Sungai Amazon",
            "Lautan Karang Pasifik",
            "Palung Samudera Misterius"
        ];
        const selectedSpot = pickRandom(fishingSpots);

        let catchList = [];
        catchList.push(`🐟 Ikan Nila: +${nila}`);
        catchList.push(`🐡 Bawal: +${bawal}`);
        catchList.push(`🐟 Lele: +${lele}`);
        catchList.push(`🐟 Ikan Biasa: +${ikan}`);
        catchList.push(`🦐 Udang: +${udang}`);
        catchList.push(`🦀 Kepiting: +${kepiting}`);
        if (cumi > 0) catchList.push(`🦑 Cumi: +${cumi}`);
        if (lobster > 0) catchList.push(`🦞 Lobster: +${lobster}`);
        if (paus > 0) catchList.push(`🐋 Paus Raksasa: +${paus}`);
        if (hiu > 0) catchList.push(`🦈 Hiu Samudera: +${hiu}`);
        if (lumba > 0) catchList.push(`🐬 Lumba-Lumba: +${lumba}`);
        if (sunkenCrate) catchList.push(`🎁 Peti Harta Karun Laut: +1 ${sunkenCrate} Crate!`);

        return {
            success: true,
            message: `]──❏ *HASIL MEMANCING* ❏──[
🌊 • *Spot:* ${selectedSpot}
🎣 • *Aksi:* Strike! Kail disentak kuat dan berhasil mengangkat hasil tangkapan laut!
🔧 • *Durability Kail:* -8 (Sisa: ${user.fishingroddurability}/100)

*🐟 Tangkapan Kolam:*
${catchList.map(v => `> ◦ ${v}`).join('\n')}

_Ketik *kolam* untuk melihat kolammu atau *shop sell* untuk menjual hasil tangkapan._`
        };
    },

    getKolam(user) {
        initRpgUser(user);
        return `*《 KOLAM IKAN MU 》*

 ➲ 🐋 Paus: [ ${user.paus || 0} ] Ekor
 ➲ 🦈 Hiu: [ ${user.hiu || 0} ] Ekor
 ➲ 🐬 Lumba-Lumba: [ ${user.lumba || 0} ] Ekor
 ➲ 🦞 Lobster: [ ${user.lobster || 0} ] Ekor
 ➲ 🦀 Kepiting: [ ${user.kepiting || 0} ] Ekor
 ➲ 🐙 Gurita: [ ${user.gurita || 0} ] Ekor
 ➲ 🦑 Cumi: [ ${user.cumi || 0} ] Ekor
 ➲ 🐡 Buntal / Bawal: [ ${(user.buntal || 0) + (user.bawal || 0)} ] Ekor
 ➲ 🐠 Dory / Nila: [ ${(user.dory || 0) + (user.nila || 0)} ] Ekor
 ➲ 🦐 Udang: [ ${user.udang || 0} ] Ekor
 ➲ 🐟 Ikan Air Tawar: [ ${(user.ikan || 0) + (user.lele || 0)} ] Ekor`.trim();
    },

    mining(user) {
        initRpgUser(user);
        if (user.pickaxe <= 0) {
            return { success: false, message: `*[❗] Kamu tidak memiliki beliung (Pickaxe)* ⛏️\nKetik *craft pickaxe* untuk membuatnya terlebih dahulu.` };
        }
        if (user.health < 80) {
            return { success: false, message: `❤️ Health kamu tersisa *${user.health}*! Butuh minimal *80 Health* untuk menambang.\nGunakan *heal* atau beli potion di shop.` };
        }
        const cooldown = 300000;
        const now = Date.now();
        if (now - user.lastmining <= cooldown) {
            const timers = clockString(cooldown - (now - user.lastmining));
            return { success: false, message: `Kamu masih kelelahan menambang! Tunggu *${timers}* lagi.` };
        }

        const pickaxeTier = user.pickaxe || 1;
        const tierBonus = pickaxeTier * 3;

        let expGain = 1000 + (pickaxeTier * 200);
        let trashGain = Math.floor(Math.random() * 50) + 30;
        let stringGain = Math.floor(Math.random() * 15) + 10;
        let rockGain = Math.floor(Math.random() * 25) + 20 + tierBonus;
        let ironGain = Math.floor(Math.random() * 15) + 10 + tierBonus;
        let goldGain = Math.floor(Math.random() * 5) + (pickaxeTier > 2 ? 2 : 0);
        let diamondGain = Math.floor(Math.random() * 4) + (pickaxeTier > 3 ? 3 : 1);
        let emeraldGain = Math.floor(Math.random() * 3) + (pickaxeTier > 4 ? 2 : 1);
        let healthLost = Math.max(8, 35 - (user.cat * 3));

        if (user.skill === 'magicswordmaster' || user.skill === 'necromancer') {
            diamondGain += 1;
            expGain = Math.floor(expGain * 1.2);
        }

        user.exp += expGain;
        user.trash += trashGain;
        user.string += stringGain;
        user.rock += rockGain;
        user.iron += ironGain;
        user.gold += goldGain;
        user.diamond += diamondGain;
        user.emerald += emeraldGain;
        user.health = Math.max(0, user.health - healthLost);
        user.pickaxedurability = Math.max(0, user.pickaxedurability - 10);
        user.lastmining = now;

        const mineLayers = [
            "Gua Kristal Bawah Tanah (Layer 12)",
            "Tambang Granit Kuno (Layer 24)",
            "Inti Magma Berlian (Layer 48)",
            "Lorong Obsidian Reruntuhan (Layer 64)"
        ];
        const selectedLayer = pickRandom(mineLayers);

        return {
            success: true,
            message: `]──❏ *HASIL MENAMBANG* ❏──[
⛏️ • *Lokasi:* ${selectedLayer}
💎 • *Aksi:* Dentuman beliung membongkar urat mineral berharga di dinding gua!
❤️ • *Health Terkuras:* -${healthLost} HP (Sisa: ${user.health}/100)
🔧 • *Durability Beliung:* -10 (Sisa: ${user.pickaxedurability}/100)

*🪨 Mineral Diperoleh:*
> ◦ ✨ Exp: +${expGain.toLocaleString('id-ID')}
> ◦ 💎 Diamond: +${diamondGain}
> ◦ ❇️ Emerald: +${emeraldGain}
> ◦ 🪙 Gold: +${goldGain}
> ◦ ⛓️ Iron: +${ironGain}
> ◦ 🪨 Rock: +${rockGain}
> ◦ 🕸️ String: +${stringGain}`.trim()
        };
    },

    nebang(user) {
        initRpgUser(user);
        const timeout = 1800000;
        const now = Date.now();
        if (now - user.lastparming < timeout) {
            return { success: false, message: `Anda sudah lelah untuk bekerja\nTunggu selama ${msToTime(timeout - (now - user.lastparming))} lagi` };
        }

        const wood = Math.floor(Math.random() * 50);
        const money = Math.floor(Math.random() * 50000);

        user.wood += wood;
        user.money += money;
        user.lastparming = now;

        return {
            success: true,
            message: `Selamat kamu mendapatkan : \n+${wood} Kayu\n+${money.toLocaleString('id-ID')} Money`
        };
    },

    mulung(user) {
        initRpgUser(user);
        const timeout = 1800000;
        const now = Date.now();
        if (now - user.lastmulung < timeout) {
            return { success: false, message: `Anda sudah lelah untuk mulung\nTunggu selama ${msToTime(timeout - (now - user.lastmulung))} lagi` };
        }

        const botol = Math.floor(Math.random() * 1000);
        const kaleng = Math.floor(Math.random() * 1000);
        const kardus = Math.floor(Math.random() * 1000);
        const gelas = Math.floor(Math.random() * 1000);
        const plastik = Math.floor(Math.random() * 1000);

        user.botol += botol;
        user.kaleng += kaleng;
        user.kardus += kardus;
        user.gelas += gelas;
        user.plastik += plastik;
        user.lastmulung = now;

        return {
            success: true,
            message: `Selamat kamu mendapatkan : \n+${botol} Botol\n+${kaleng} Kaleng\n+${kardus} Kardus\n+${gelas} Gelas\n+${plastik} Plastik`
        };
    },

    nguli(user) {
        initRpgUser(user);
        const now = Date.now();
        if (now - user.lastnguli > 86400000) {
            user.money += 25000;
            user.exp += 1000;
            user.lastnguli = now;
            return {
                success: true,
                message: `_🎉Selamat kamu mendapatkan +25.000 Money & +1.000 Exp upah nguli_`
            };
        } else {
            return { success: false, message: `[💬] Anda sudah mengklaim upah nguli hari ini` };
        }
    },

    ojek(user) {
        initRpgUser(user);
        const timeout = 300000;
        const now = Date.now();
        if (now - user.lastngojek < timeout) {
            const timers = clockString(timeout - (now - user.lastngojek));
            return { success: false, message: `Kamu sudah mengojek, tunggu *${timers}* lagi.` };
        }

        const money = Math.floor(Math.random() * 20000) + 5000;
        const exp = Math.floor(Math.random() * 1000) + 200;

        user.money += money;
        user.exp += exp;
        user.lastngojek = now;

        return {
            success: true,
            message: `🛵 *Orderan Ojek Selesai!*\n> ◦ 💹 +${money.toLocaleString('id-ID')} Money\n> ◦ ✨ +${exp} Exp`
        };
    },

    kerja(user, jobType) {
        initRpgUser(user);
        const timeout = 300000;
        const now = Date.now();
        if (now - user.lastkerja < timeout) {
            const timers = clockString(timeout - (now - user.lastkerja));
            return { success: false, message: `Anda sudah lelah bekerja, silakan istirahat *${timers}* lagi.` };
        }

        const validJobs = ['dokter', 'petani', 'supir', 'pedagang', 'kurir'];
        const type = (jobType || '').toLowerCase();
        if (!validJobs.includes(type)) {
            return {
                success: false,
                message: `*PILIH PROFESI PEKERJAAN:*\n${validJobs.map(v => `• ${v}`).join('\n')}\n\n*Contoh:* kerja dokter`
            };
        }

        const gajih = Math.floor(Math.random() * 30000) + 10000;
        const exp = Math.floor(Math.random() * 1500) + 500;

        user.money += gajih;
        user.exp += exp;
        user.lastkerja = now;

        return {
            success: true,
            message: `💼 *Kerja Selesai (${type.toUpperCase()})*\nKamu mendapatkan gajih sebesar:\n💹 *+${gajih.toLocaleString('id-ID')} Money*\n✨ *+${exp} Exp*`
        };
    },

    heal(user, countStr) {
        initRpgUser(user);
        if (user.health >= 100) return { success: false, message: `Your ❤️health is full!` };

        const buf = user.cat;
        const buff = buf * 5;
        const heal = 15 + (buff * 4);
        const needed = Math.round((100 - user.health) / heal);
        const count = countStr ? Math.max(1, parseInt(countStr) || 1) : Math.max(1, needed);

        if (user.potion < count) {
            return { success: false, message: `Your 🥤Potion is not enough, you only have *${user.potion}* 🥤Potion.\nType *shop buy potion <amount>* to buy.` };
        }

        user.potion -= count;
        user.health = Math.min(100, user.health + (heal * count));

        return {
            success: true,
            message: `Successful use of *${count}* 🥤Potion(s).\nYour ❤️health: *${user.health}/100*`
        };
    },

    craft(user, itemType) {
        initRpgUser(user);
        const type = (itemType || '').toLowerCase();

        if (type === 'sword' || type === 'pedang') {
            if (user.sword > 0) return { success: false, message: `Kamu sudah memiliki sword!` };
            if (user.wood < 10 || user.iron < 5) return { success: false, message: `Bahan tidak cukup! Butuh 10 Wood & 5 Iron.` };
            user.wood -= 10; user.iron -= 5;
            user.sword = 1; user.sworddurability = 100;
            return { success: true, message: `Sukses membuat 1 🗡️Sword!` };
        } else if (type === 'armor' || type === 'zirah') {
            if (user.armor > 0) return { success: false, message: `Kamu sudah memiliki armor!` };
            if (user.iron < 10 || user.wood < 5) return { success: false, message: `Bahan tidak cukup! Butuh 10 Iron & 5 Wood.` };
            user.iron -= 10; user.wood -= 5;
            user.armor = 1; user.armordurability = 100;
            return { success: true, message: `Sukses membuat 1 🥼Armor!` };
        } else if (type === 'pickaxe' || type === 'beliung') {
            if (user.pickaxe > 0) return { success: false, message: `Kamu sudah memiliki pickaxe!` };
            if (user.wood < 10 || user.rock < 5 || user.iron < 3) return { success: false, message: `Bahan tidak cukup! Butuh 10 Wood, 5 Rock, 3 Iron.` };
            user.wood -= 10; user.rock -= 5; user.iron -= 3;
            user.pickaxe = 1; user.pickaxedurability = 100;
            return { success: true, message: `Sukses membuat 1 ⛏️Pickaxe!` };
        } else if (type === 'pancing' || type === 'fishingrod') {
            if (user.fishingrod > 0) return { success: false, message: `Kamu sudah memiliki fishingrod!` };
            if (user.wood < 10 || user.string < 5) return { success: false, message: `Bahan tidak cukup! Butuh 10 Wood & 5 String.` };
            user.wood -= 10; user.string -= 5;
            user.fishingrod = 1; user.fishingroddurability = 100;
            return { success: true, message: `Sukses membuat 1 🎣Fishingrod!` };
        } else {
            return {
                success: false,
                message: `*「 C R A F T I N G 」*

▧ Pickaxe ⛏️
〉 10 Kayu
〉 5 Batu
〉 3 Iron

▧ Sword ⚔️
〉 10 Kayu
〉 5 Iron

▧ Armor 🥼
〉 10 Iron
〉 5 Kayu

▧ Fishingrod 🎣
〉 10 Kayu
〉 5 String

*Contoh:* craft sword`
            };
        }
    },

    repair(user, itemType) {
        initRpgUser(user);
        const type = (itemType || '').toLowerCase();

        if (type === 'pickaxe') {
            if (user.pickaxe <= 0) return { success: false, message: `Kamu belum memiliki pickaxe!` };
            if (user.wood < 5 || user.rock < 3 || user.iron < 3) return { success: false, message: `Butuh 5 Kayu, 3 Batu, 3 Iron untuk repair pickaxe.` };
            user.wood -= 5; user.rock -= 3; user.iron -= 3;
            user.pickaxedurability = 100;
            return { success: true, message: `⛏️ Sukses memperbaiki Pickaxe!` };
        } else if (type === 'sword' || type === 'pedang') {
            if (user.sword <= 0) return { success: false, message: `Kamu belum memiliki sword!` };
            if (user.wood < 5 || user.iron < 5) return { success: false, message: `Butuh 5 Kayu & 5 Iron untuk repair sword.` };
            user.wood -= 5; user.iron -= 5;
            user.sworddurability = 100;
            return { success: true, message: `🗡️ Sukses memperbaiki Sword!` };
        } else if (type === 'armor' || type === 'zirah') {
            if (user.armor <= 0) return { success: false, message: `Kamu belum memiliki armor!` };
            if (user.iron < 8 || user.wood < 3) return { success: false, message: `Butuh 8 Iron & 3 Kayu untuk repair armor.` };
            user.iron -= 8; user.wood -= 3;
            user.armordurability = 100;
            return { success: true, message: `🥼 Sukses memperbaiki Armor!` };
        } else if (type === 'fishingrod' || type === 'pancing') {
            if (user.fishingrod <= 0) return { success: false, message: `Kamu belum memiliki fishingrod!` };
            if (user.wood < 5 || user.string < 3) return { success: false, message: `Butuh 5 Kayu & 3 String untuk repair pancing.` };
            user.wood -= 5; user.string -= 3;
            user.fishingroddurability = 100;
            return { success: true, message: `🎣 Sukses memperbaiki Fishingrod!` };
        } else {
            return {
                success: false,
                message: `*「 R E P A I R 」*

▧ Pickaxe ⛏️
〉 5 Kayu
〉 3 Batu
〉 3 Iron

▧ Sword ⚔️
〉 5 Kayu
〉 5 Iron

▧ Armor 🥼
〉 8 Iron
〉 3 Kayu

▧ Fishingrod 🎣
〉 5 Kayu
〉 3 String

*Contoh:* repair pickaxe`
            };
        }
    },

    upgrade(user, itemType) {
        initRpgUser(user);
        const type = (itemType || '').toLowerCase();

        if (type === 'sword' || type === 'pedang') {
            if (user.sword <= 0) return { success: false, message: `Kamu belum punya sword!` };
            const reqIron = (user.sword + 1) * 10;
            const reqMoney = (user.sword + 1) * 15000;
            if (user.iron < reqIron || user.money < reqMoney) {
                return { success: false, message: `Butuh *${reqIron} Iron* & *${reqMoney.toLocaleString('id-ID')} Money* untuk upgrade Sword ke Level ${user.sword + 1}.` };
            }
            user.iron -= reqIron;
            user.money -= reqMoney;
            user.sword += 1;
            user.sworddurability = 100;
            return { success: true, message: `✨ Sukses meng-upgrade Sword ke Level ${user.sword}!` };
        } else if (type === 'armor') {
            if (user.armor <= 0) return { success: false, message: `Kamu belum punya armor!` };
            const reqIron = (user.armor + 1) * 12;
            const reqMoney = (user.armor + 1) * 20000;
            if (user.iron < reqIron || user.money < reqMoney) {
                return { success: false, message: `Butuh *${reqIron} Iron* & *${reqMoney.toLocaleString('id-ID')} Money* untuk upgrade Armor ke Level ${user.armor + 1}.` };
            }
            user.iron -= reqIron;
            user.money -= reqMoney;
            user.armor += 1;
            user.armordurability = 100;
            return { success: true, message: `✨ Sukses meng-upgrade Armor ke Level ${user.armor}!` };
        } else if (type === 'pickaxe') {
            if (user.pickaxe <= 0) return { success: false, message: `Kamu belum punya pickaxe!` };
            const reqRock = (user.pickaxe + 1) * 15;
            const reqMoney = (user.pickaxe + 1) * 10000;
            if (user.rock < reqRock || user.money < reqMoney) {
                return { success: false, message: `Butuh *${reqRock} Rock* & *${reqMoney.toLocaleString('id-ID')} Money* untuk upgrade Pickaxe ke Level ${user.pickaxe + 1}.` };
            }
            user.rock -= reqRock;
            user.money -= reqMoney;
            user.pickaxe += 1;
            user.pickaxedurability = 100;
            return { success: true, message: `✨ Sukses meng-upgrade Pickaxe ke Level ${user.pickaxe}!` };
        } else {
            return {
                success: false,
                message: `*「 U P G R A D E 」*
• upgrade sword
• upgrade armor
• upgrade pickaxe`
            };
        }
    },

    openCrate(user, crateType, countStr = '1') {
        initRpgUser(user);
        const type = (crateType || '').toLowerCase();
        const count = Math.max(1, parseInt(countStr) || 1);

        if (!['common', 'uncommon', 'mythic', 'legendary'].includes(type)) {
            return {
                success: false,
                message: `Tipe crate tidak valid!\nPilihan: *common*, *uncommon*, *mythic*, *legendary*\n*Contoh:* open common 1`
            };
        }

        if (user[type] < count) {
            return { success: false, message: `Crate *${type}* kamu tidak cukup! Kamu hanya punya *${user[type]}*.` };
        }

        user[type] -= count;
        let totalMoney = 0, totalExp = 0, totalPotion = 0, totalTrash = 0, totalDiamond = 0, totalIron = 0, totalGold = 0;

        for (let i = 0; i < count; i++) {
            if (type === 'common') {
                totalMoney += Math.floor(Math.random() * 500) + 100;
                totalExp += Math.floor(Math.random() * 300) + 50;
                totalTrash += Math.floor(Math.random() * 20);
                if (Math.random() > 0.6) totalPotion += 1;
            } else if (type === 'uncommon') {
                totalMoney += Math.floor(Math.random() * 1500) + 500;
                totalExp += Math.floor(Math.random() * 800) + 200;
                totalPotion += Math.floor(Math.random() * 3) + 1;
                if (Math.random() > 0.7) totalIron += 1;
            } else if (type === 'mythic') {
                totalMoney += Math.floor(Math.random() * 5000) + 2000;
                totalExp += Math.floor(Math.random() * 2500) + 1000;
                totalPotion += Math.floor(Math.random() * 5) + 2;
                totalDiamond += Math.floor(Math.random() * 2);
                totalGold += Math.floor(Math.random() * 3) + 1;
            } else if (type === 'legendary') {
                totalMoney += Math.floor(Math.random() * 20000) + 10000;
                totalExp += Math.floor(Math.random() * 10000) + 5000;
                totalPotion += Math.floor(Math.random() * 10) + 5;
                totalDiamond += Math.floor(Math.random() * 5) + 1;
                totalGold += Math.floor(Math.random() * 8) + 2;
                user.pet += 1;
            }
        }

        user.money += totalMoney;
        user.exp += totalExp;
        user.potion += totalPotion;
        user.trash += totalTrash;
        user.diamond += totalDiamond;
        user.iron += totalIron;
        user.gold += totalGold;

        let res = `*Kamu membuka ${count} ${type} Crate dan mendapatkan:*
+${totalMoney.toLocaleString('id-ID')} Money 💹
+${totalExp.toLocaleString('id-ID')} Exp ✨
+${totalPotion} Potion 🥤`;
        if (totalDiamond > 0) res += `\n+${totalDiamond} Diamond 💎`;
        if (totalGold > 0) res += `\n+${totalGold} Gold 🪙`;
        if (totalIron > 0) res += `\n+${totalIron} Iron ⛓️`;

        return { success: true, message: res };
    },

    shop(user, action, itemKey, countStr = '1') {
        initRpgUser(user);
        const act = (action || '').toLowerCase();
        const item = (itemKey || '').toLowerCase();
        const count = countStr === 'all' ? 'all' : Math.max(1, parseInt(countStr) || 1);

        const buyPrices = {
            potion: 1250,
            trash: 50,
            wood: 700,
            rock: 850,
            string: 400,
            iron: 3000,
            gold: 7500,
            diamond: 25000,
            common: 5000,
            uncommon: 15000,
            mythic: 50000,
            legendary: 150000,
            petfood: 950
        };

        const sellPrices = {
            potion: 600,
            trash: 20,
            wood: 350,
            rock: 400,
            string: 200,
            iron: 1500,
            gold: 3500,
            diamond: 12000,
            emerald: 18000,
            ikan: 100,
            lele: 150,
            nila: 200,
            bawal: 250,
            udang: 120,
            paus: 5000,
            kepiting: 300,
            ayam: 500,
            kambing: 2500,
            sapi: 6000,
            banteng: 10000,
            harimau: 15000,
            gajah: 20000,
            botol: 50,
            kaleng: 50,
            kardus: 50,
            gelas: 50,
            plastik: 50
        };

        if (act === 'buy' || act === 'beli') {
            const price = buyPrices[item];
            if (!price) {
                const list = Object.entries(buyPrices).map(([k, p]) => `• *${k}* : ${p.toLocaleString('id-ID')} Money`).join('\n');
                return {
                    success: false,
                    message: `*「 SHOP BUY 」*\n${list}\n\n*Format:* shop buy potion 5`
                };
            }
            const total = price * count;
            if (user.money < total) return { success: false, message: `Money kamu tidak cukup untuk membeli ${count} ${item}!` };
            user.money -= total;
            if (item === 'petfood') user.petFood += count;
            else user[item] += count;
            return { success: true, message: `Sukses membeli *${count} ${item}* seharga *${total.toLocaleString('id-ID')} Money*!` };
        } else if (act === 'sell' || act === 'jual') {
            const price = sellPrices[item];
            if (!price) {
                const list = Object.entries(sellPrices).map(([k, p]) => `• *${k}* : ${p.toLocaleString('id-ID')} Money`).join('\n');
                return {
                    success: false,
                    message: `*「 SHOP SELL / PASAR 」*\n${list}\n\n*Format:* shop sell wood 10 atau shop sell wood all`
                };
            }
            const available = user[item] || 0;
            const realCount = count === 'all' ? available : Math.min(available, count);
            if (realCount <= 0) return { success: false, message: `Kamu tidak memiliki ${item} untuk dijual!` };
            const income = price * realCount;
            user[item] -= realCount;
            user.money += income;
            return { success: true, message: `Sukses menjual *${realCount} ${item}* seharga *+${income.toLocaleString('id-ID')} Money*!` };
        } else {
            return {
                success: false,
                message: `*「 SHOP & PASAR 」*\n• *shop buy [item] [jumlah]*\n• *shop sell [item] [jumlah/all]*`
            };
        }
    },

    atm(user, action, amountStr) {
        initRpgUser(user);
        const act = (action || '').toLowerCase();

        if (act === 'nabung' || act === 'deposit') {
            const count = amountStr === 'all' ? user.money : parseInt(amountStr);
            if (isNaN(count) || count <= 0) return { success: false, message: `Masukkan jumlah yang valid! Contoh: *atm nabung 500*` };
            if (user.money < count) return { success: false, message: `Money tidak mencukupi untuk menabung!` };
            user.money -= count;
            user.bank += count;
            return { success: true, message: `-${count.toLocaleString('id-ID')} Money\n+${count.toLocaleString('id-ID')} ATM/Bank` };
        } else if (act === 'tarik' || act === 'withdraw') {
            const count = amountStr === 'all' ? user.bank : parseInt(amountStr);
            if (isNaN(count) || count <= 0) return { success: false, message: `Masukkan jumlah yang valid! Contoh: *atm tarik 500*` };
            if (user.bank < count) return { success: false, message: `Saldo di ATM/Bank tidak mencukupi!` };
            user.bank -= count;
            user.money += count;
            return { success: true, message: `+${count.toLocaleString('id-ID')} Money\n-${count.toLocaleString('id-ID')} ATM/Bank` };
        } else {
            return {
                success: true,
                message: `*「 ATM & BANK 」*
💹 *Money:* ${user.money.toLocaleString('id-ID')}
🏦 *Bank/ATM:* ${user.bank.toLocaleString('id-ID')}

*Perintah:*
• *atm nabung [jumlah/all]*
• *atm tarik [jumlah/all]*`
            };
        }
    },

    transfer(senderUser, receiverUser, typeRaw, amountRaw, receiverPushName) {
        initRpgUser(senderUser);
        initRpgUser(receiverUser);
        const type = (typeRaw || 'money').toLowerCase();
        const amount = parseInt(amountRaw);

        if (isNaN(amount) || amount <= 0) return { success: false, message: `Masukkan jumlah transfer yang valid!` };
        if (!['money', 'exp', 'diamond', 'potion'].includes(type)) {
            return { success: false, message: `Tipe transfer hanya: *money*, *exp*, *diamond*, *potion*!` };
        }
        if (senderUser[type] < amount) {
            return { success: false, message: `Saldo *${type}* kamu tidak mencukupi!` };
        }

        senderUser[type] -= amount;
        receiverUser[type] += amount;

        return {
            success: true,
            message: `Sukses mentransfer *${amount.toLocaleString('id-ID')} ${type}* kepada *${receiverPushName || 'User'}*!`
        };
    },

    createDuel(chatId, challengerJid, targetJid) {
        const sessionKey = `${chatId}`;
        if (challengerJid === targetJid) return { success: false, message: `Gak bisa duel sama diri sendiri!` };
        if (global.rpgDuelSessions[sessionKey]) return { success: false, message: `Masih ada sesi duel yang sedang berlangsung di chat ini!` };

        global.rpgDuelSessions[sessionKey] = {
            challengerJid,
            targetJid,
            timeout: setTimeout(() => {
                delete global.rpgDuelSessions[sessionKey];
            }, 60000)
        };

        return {
            success: true,
            message: `⚔️ *TANTANGAN DUEL RPG* ⚔️\n@${challengerJid.split('@')[0]} menantang @${targetJid.split('@')[0]} untuk bertarung di arena 1v1!\n\nKetik *dya* untuk menerima, atau *dno* untuk menolak.\n⏰ _Waktu merespons: 60 detik_`
        };
    },

    resolveDuel(chatId, responderJid, usersMap, action) {
        const sessionKey = `${chatId}`;
        const duel = global.rpgDuelSessions[sessionKey];
        if (!duel) return { success: false, message: `Tidak ada sesi duel aktif!` };

        if (duel.targetJid !== responderJid) {
            return { success: false, message: `Kamu bukan lawan yang ditantang dalam duel ini!` };
        }

        clearTimeout(duel.timeout);
        delete global.rpgDuelSessions[sessionKey];

        if (action === 'dno') {
            return {
                success: true,
                message: `@${duel.targetJid.split('@')[0]} Membatalkan ajakan duel.`
            };
        }

        const cUser = initRpgUser(usersMap[duel.challengerJid]);
        const tUser = initRpgUser(usersMap[duel.targetJid]);

        const cPower = Math.floor(Math.random() * 80) + (cUser.sword * 5) + (cUser.level * 2);
        const tPower = Math.floor(Math.random() * 80) + (tUser.sword * 5) + (tUser.level * 2);

        cUser.lastduel = Date.now();
        tUser.lastduel = Date.now();

        const prizeMoney = 2500;
        const prizeExp = 1200;

        if (cPower > tPower) {
            cUser.money += prizeMoney;
            cUser.exp += prizeExp;
            tUser.money = Math.max(0, tUser.money - prizeMoney);
            return {
                success: true,
                mentions: [duel.challengerJid, duel.targetJid],
                message: `]──❏ *HASIL DUEL ARENA* ❏──[
⚔️ • @${duel.challengerJid.split('@')[0]} ⚔️ @${duel.targetJid.split('@')[0]}
💥 • *Pertarungan:* @${duel.challengerJid.split('@')[0]} melancarkan kombinasi tebasan telak (Power: ${cPower} vs ${tPower})!
👑 • *Pemenang:* @${duel.challengerJid.split('@')[0]}
💰 • *Hadiah Taruhan:* +${prizeMoney.toLocaleString('id-ID')} Money & +${prizeExp} Exp`
            };
        } else if (cPower < tPower) {
            tUser.money += prizeMoney;
            tUser.exp += prizeExp;
            cUser.money = Math.max(0, cUser.money - prizeMoney);
            return {
                success: true,
                mentions: [duel.challengerJid, duel.targetJid],
                message: `]──❏ *HASIL DUEL ARENA* ❏──[
⚔️ • @${duel.challengerJid.split('@')[0]} ⚔️ @${duel.targetJid.split('@')[0]}
💥 • *Pertarungan:* @${duel.targetJid.split('@')[0]} menangkis serangan dan membalikkan keadaan (Power: ${tPower} vs ${cPower})!
👑 • *Pemenang:* @${duel.targetJid.split('@')[0]}
💰 • *Hadiah Taruhan:* +${prizeMoney.toLocaleString('id-ID')} Money & +${prizeExp} Exp`
            };
        } else {
            cUser.money += 500;
            tUser.money += 500;
            return {
                success: true,
                mentions: [duel.challengerJid, duel.targetJid],
                message: `]──❏ *HASIL DUEL ARENA* ❏──[
⚔️ • Pertarungan berakhir *SERI*! Kedua petarung saling menghormati dan berbagi +500 Money masing-masing.`
            };
        }
    },

    petstore(user, petType) {
        initRpgUser(user);
        const type = (petType || '').toLowerCase();
        const prices = {
            cat: { cost: 2, name: 'Cat' },
            dog: { cost: 2, name: 'Dog' },
            horse: { cost: 4, name: 'Horse' },
            fox: { cost: 6, name: 'Fox' },
            petfood: { costMoney: 950, name: 'Pet Food' }
        };

        if (!prices[type]) {
            return {
                success: false,
                message: `*「 PET STORE 」*

🐈 • *cat:* 2 Pet Token🔖
🐕 • *dog:* 2 Pet Token🔖
🐎 • *horse:* 4 Pet Token🔖
🦊 • *fox:* 6 Pet Token🔖
🍖 • *petfood:* 950 Money 💹

*Contoh:* petshop cat`
            };
        }

        const p = prices[type];
        if (type === 'petfood') {
            if (user.money < 950) return { success: false, message: `Money kamu tidak cukup!` };
            user.money -= 950;
            user.petFood += 1;
            return { success: true, message: `Sukses membeli 1 Pet Food!` };
        } else {
            if (user.pet < p.cost) return { success: false, message: `Pet Token kamu kurang! Butuh *${p.cost} Pet Token*.` };
            if (user[type] > 0) return { success: false, message: `Kamu sudah memiliki ${p.name}!` };
            user.pet -= p.cost;
            user[type] = 1;
            return { success: true, message: `Sukses mengadopsi ${p.name}! Beri makan dengan mengetik *feed ${type}*.` };
        }
    },

    feed(user, petType) {
        initRpgUser(user);
        const type = (petType || '').toLowerCase();
        if (!['cat', 'dog', 'fox', 'horse'].includes(type)) {
            return {
                success: false,
                message: `*LIST PET:*\n🐈 • cat\n🐕 • dog\n🦊 • fox\n🐎 • horse\n\n*Contoh:* feed cat`
            };
        }
        if (user[type] <= 0) return { success: false, message: `Kamu belum memiliki pet ${type}!` };
        if (user.petFood <= 0) return { success: false, message: `Pet Food kamu habis! Beli di *petshop petfood*.` };

        const pesan = pickRandom(['ɴʏᴜᴍᴍᴍ~', 'ᴛʜᴀɴᴋs', 'ᴛʜᴀɴᴋʏᴏᴜ ^-^', '...', 'ᴛʜᴀɴᴋ ʏᴏᴜ~', 'ᴀʀɪɢᴀᴛᴏᴜ ^-^']);
        user.petFood -= 1;
        const expKey = `${type}exp`;
        user[expKey] = (user[expKey] || 0) + 40;

        let lvlUp = '';
        if (user[expKey] >= user[type] * 100) {
            user[expKey] = 0;
            user[type] += 1;
            lvlUp = `\n🎉 *Pet ${type} kamu naik ke Level ${user[type]}!*`;
        }

        return {
            success: true,
            message: `${pesan}\nSukses memberi makan pet ${type}! (+40 Exp)${lvlUp}`
        };
    },

    claim(user, period = 'daily') {
        initRpgUser(user);
        const now = Date.now();

        if (period === 'daily') {
            const cooldown = 86400000;
            if (now - user.lastclaim < cooldown) {
                return { success: false, message: `You have already claimed this daily claim!, wait for *${msToTime((user.lastclaim + cooldown) - now)}*` };
            }
            user.exp += 9999;
            user.money += 4999;
            user.potion += 5;
            user.lastclaim = now;
            return {
                success: true,
                message: `*––––––『 DAILY 』––––––*
*+9999* ✨exp
*+4999* 💹money
*+5* 🥤potion`
            };
        } else if (period === 'weekly') {
            const cooldown = 604800000;
            if (now - user.lastweekly < cooldown) {
                return { success: false, message: `You have already claimed this weekly claim!, wait for *${msToTime((user.lastweekly + cooldown) - now)}*` };
            }
            user.exp += 15000;
            user.money += 35999;
            user.potion += 9;
            user.lastweekly = now;
            return {
                success: true,
                message: `*––––––『 WEEKLY 』––––––*
*+15000* ✨exp
*+35999* 💹money
*+9* 🥤potion`
            };
        } else if (period === 'monthly') {
            const cooldown = 2592000000;
            if (now - user.lastmonthly < cooldown) {
                return { success: false, message: `You have already claimed this monthly claim, wait for *${msToTime((user.lastmonthly + cooldown) - now)}*` };
            }
            user.exp += 50000;
            user.money += 49999;
            user.potion += 10;
            user.mythic += 3;
            user.legendary += 1;
            user.lastmonthly = now;
            return {
                success: true,
                message: `*––––––『 MONTHLY 』––––––*
*+50000* ✨exp
*+49999* 💹money
*+10* 🥤potion
*+3* 🎁mythic
*+1* 🧰legendary`
            };
        }
    },

    selectSkill(user, skillName) {
        initRpgUser(user);
        const skillList = ["swordmaster", "necromancer", "witch", "archer", "magicswordmaster", "thief", "shadow"];
        const skil = (skillName || '').trim().toLowerCase();

        if (!skillList.includes(skil)) {
            return {
                success: false,
                message: `Select *skill🃏* what do you want/pilih skill apa yg kamu inginkan:\n\n${skillList.map(s => `› ${s}`).join('\n')}\n\nHow To use/Cara menggunakan:\nselectskill <nameskill>\n\nExample/Contoh:\nselectskill necromancer`
            };
        }

        if (user.skill && user.skill !== '') {
            return { success: false, message: `Anda Sudah Punya skill ${user.skill} Tidak bisa diganti` };
        }

        user.skill = skil;
        return {
            success: true,
            message: `Anda telah memilih Skill ${skil}`
        };
    },

    casino(user, amountStr) {
        initRpgUser(user);
        const count = amountStr === 'all' ? user.exp : parseInt(amountStr);
        if (isNaN(count) || count < 1) return { success: false, message: `Format salah! Contoh: *casino 100* atau *casino all*` };
        if (user.exp < count) return { success: false, message: `Exp kamu tidak cukup!` };

        const Aku = Math.floor(Math.random() * 101);
        const Kamu = Math.floor(Math.random() * 81);

        if (Kamu > Aku) {
            user.exp += count;
            return {
                success: true,
                message: `*CASINO RESULT*
*Kamu:* ${Kamu}
*Bot:* ${Aku}

Kamu *Menang*! Mendapatkan *+${count * 2} Exp* ✨`
            };
        } else if (Kamu < Aku) {
            user.exp = Math.max(0, user.exp - count);
            return {
                success: true,
                message: `*CASINO RESULT*
*Kamu:* ${Kamu}
*Bot:* ${Aku}

Kamu *Kalah*! Kehilangan *-${count} Exp* 💀`
            };
        } else {
            return {
                success: true,
                message: `*CASINO RESULT*
*Kamu:* ${Kamu}
*Bot:* ${Aku}

*Seri*! Exp dikembalikan.`
            };
        }
    },

    slot(user, amountStr) {
        initRpgUser(user);
        const count = Math.max(1, parseInt(amountStr) || 1);
        if (user.money < count) return { success: false, message: `Money kamu tidak cukup!` };

        user.money -= count;
        const icons = ['1', '2', '3', '4', '5'];
        const s1 = pickRandom(icons);
        const s2 = pickRandom(icons);
        const s3 = pickRandom(icons);

        const emoMap = { '1': '🍇', '2': '🍉', '3': '🍊', '4': '🍎', '5': '💎' };
        const display = `[ ${emoMap[s1]} | ${emoMap[s2]} | ${emoMap[s3]} ]`;

        if (s1 === s2 && s2 === s3) {
            const win = count * (s1 === '5' ? 10 : 5);
            user.money += win;
            return {
                success: true,
                message: `🎰 *SLOTS WIN JACKPOT!* 🎰\n${display}\n\nSelamat kamu menang *+${win.toLocaleString('id-ID')} Money*!`
            };
        } else if (s1 === s2 || s2 === s3 || s1 === s3) {
            const win = Math.floor(count * 1.5);
            user.money += win;
            return {
                success: true,
                message: `🎰 *SLOTS WIN!* 🎰\n${display}\n\nKamu menang *+${win.toLocaleString('id-ID')} Money*!`
            };
        } else {
            return {
                success: true,
                message: `🎰 *SLOTS LOSE!* 🎰\n${display}\n\nKamu kalah *-${count.toLocaleString('id-ID')} Money*!`
            };
        }
    },

    merampok(user, targetUser, targetPushName) {
        initRpgUser(user);
        initRpgUser(targetUser);
        const timeout = 3600000;
        const now = Date.now();
        if (now - user.lastrob < timeout) {
            const timers = clockString(timeout - (now - user.lastrob));
            return { success: false, message: `Kamu masih dalam pengawasan polisi! Tunggu selama *${timers}* lagi.` };
        }
        if (targetUser.money < 10000) {
            return { success: false, message: `Target tidak memiliki cukup uang cash (Minimal 10.000 Money)! Target miskin.` };
        }

        if (targetUser.dog > 0 && Math.random() > 0.6) {
            user.lastrob = now;
            user.health = Math.max(0, user.health - 25);
            return {
                success: false,
                message: `🚨 *PERAMPOKAN GAGAL!* 🚨\nAnjing penjaga 🐕 milik *${targetPushName || 'Target'}* menggonggong keras dan menyerangmu! Kamu kabur dengan luka (-25 HP).`
            };
        }

        const maxSteal = Math.min(targetUser.money, 75000);
        const dapat = Math.floor(Math.random() * maxSteal) + 5000;
        targetUser.money = Math.max(0, targetUser.money - dapat);
        user.money += dapat;
        user.lastrob = now;

        const thiefBonus = user.skill === 'thief' ? "\n🥷 *[Skill: Thief]* Berhasil melarikan diri tanpa meninggalkan jejak sidik jari!" : "";

        return {
            success: true,
            message: `]──❏ *AKSI PERAMPOKAN BERHASIL* ❏──[
🎭 • *Aksi:* Berhasil menyelinap dan merampok dompet cash *${targetPushName || 'Target'}*!${thiefBonus}
💰 • *Hasil Jarahan:* +${dapat.toLocaleString('id-ID')} Money 💹`
        };
    },

    maling(user) {
        initRpgUser(user);
        const timeout = 604800000;
        const now = Date.now();
        if (now - user.lastmaling < timeout) {
            return { success: false, message: `Brankas kota masih diperketat keamanannya! Tunggu *${msToTime((user.lastmaling + timeout) - now)}* lagi.` };
        }

        const money = Math.floor(Math.random() * 45000) + 15000;
        const exp = Math.floor(Math.random() * 2000) + 1000;
        const kardus = Math.floor(Math.random() * 500) + 100;
        const diamond = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;

        user.money += money;
        user.exp += exp;
        user.kardus += kardus;
        if (diamond > 0) user.diamond += diamond;
        user.lastmaling = now;

        let diamondText = diamond > 0 ? `\n> ◦ 💎 Diamond Langka: +${diamond}` : '';

            return {
                success: true,
                message: `\`⌜ Pembobolan Brankas Sukses ⌟\`
> ◦ *Target :* Brankas Kota Berhasil Dibobol!
> ◦ *Aksi :* Berhasil meretas alarm keamanan bank dan membawa kabur peti uang brankas!

\`⌜ Harta Curian ⌟\`
> ◦ 💹 Money : +${money.toLocaleString('id-ID')}
> ◦ ✨ Exp : +${exp.toLocaleString('id-ID')}
> ◦ 📦 Kardus : +${kardus}${diamondText}`
            };
    },

    leaderboard(usersObj, typeKey = 'level') {
        const key = (typeKey || 'level').toLowerCase();
        const validKeys = ['level', 'exp', 'money', 'bank', 'diamond', 'iron', 'gold', 'emerald', 'potion', 'trash', 'wood', 'rock', 'string', 'common', 'uncommon', 'mythic', 'legendary', 'pet'];
        const sortKey = validKeys.includes(key) ? key : 'level';

        const list = Object.entries(usersObj || {})
            .filter(([jid, u]) => jid && !jid.includes('@newsletter') && !jid.includes('@g.us') && !jid.includes('broadcast') && (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@lid')))
            .map(([jid, u]) => {
                initRpgUser(u);
                return { jid, val: u[sortKey] || 0 };
            })
            .filter(item => item.val > 0)
            .sort((a, b) => b.val - a.val)
            .slice(0, 10);

        if (list.length === 0) {
            return {
                mentions: [],
                text: `\`⌜ Leaderboard (${sortKey.toUpperCase()}) ⌟\`\n> ◦ _Belum ada player yang memiliki ${sortKey}._`
            };
        }

        const mentions = [];
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const lines = list.map((item, i) => {
            mentions.push(item.jid);
            const medal = medals[i] || `${i + 1}.`;
            return `${medal} • @${item.jid.split('@')[0]} ➔ *${item.val.toLocaleString('id-ID')} ${sortKey.toUpperCase()}*`;
        });

        return {
            mentions,
            text: `\`⌜ Leaderboard (${sortKey.toUpperCase()}) ⌟\`\n\n${lines.join('\n')}`
        };
    }
};

module.exports = {
    HITORI_RPG,
    initRpgUser
};
