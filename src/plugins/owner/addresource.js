const RESOURCE_ALIASES = {
    money: { field: 'money', label: 'Money', icon: '💵', prefix: 'Rp ' },
    uang: { field: 'money', label: 'Money', icon: '💵', prefix: 'Rp ' },
    saldo: { field: 'money', label: 'Money', icon: '💵', prefix: 'Rp ' },
    bank: { field: 'bank', label: 'Bank', icon: '🏦', prefix: 'Rp ' },
    atm: { field: 'bank', label: 'Bank', icon: '🏦', prefix: 'Rp ' },
    exp: { field: 'exp', label: 'EXP', icon: '✨', prefix: '' },
    xp: { field: 'exp', label: 'EXP', icon: '✨', prefix: '' },
    level: { field: 'level', label: 'Level', icon: '🎖️', prefix: 'Lv.' },
    lvl: { field: 'level', label: 'Level', icon: '🎖️', prefix: 'Lv.' },
    health: { field: 'health', label: 'Health', icon: '❤️', prefix: '' },
    hp: { field: 'health', label: 'Health', icon: '❤️', prefix: '' },
    diamond: { field: 'diamond', label: 'Diamond', icon: '💎', prefix: '' },
    dm: { field: 'diamond', label: 'Diamond', icon: '💎', prefix: '' },
    gold: { field: 'gold', label: 'Gold', icon: '🪙', prefix: '' },
    emerald: { field: 'emerald', label: 'Emerald', icon: '❇️', prefix: '' },
    iron: { field: 'iron', label: 'Iron', icon: '⛓️', prefix: '' },
    wood: { field: 'wood', label: 'Wood', icon: '🪵', prefix: '' },
    kayu: { field: 'wood', label: 'Wood', icon: '🪵', prefix: '' },
    rock: { field: 'rock', label: 'Rock', icon: '🪨', prefix: '' },
    batu: { field: 'rock', label: 'Rock', icon: '🪨', prefix: '' },
    string: { field: 'string', label: 'String', icon: '🕸️', prefix: '' },
    potion: { field: 'potion', label: 'Potion', icon: '🥤', prefix: '' },
    upgrader: { field: 'upgrader', label: 'Upgrader', icon: '🔧', prefix: '' },
    common: { field: 'common', label: 'Common Crate', icon: '📦', prefix: '' },
    uncommon: { field: 'uncommon', label: 'Uncommon Crate', icon: '🛍️', prefix: '' },
    mythic: { field: 'mythic', label: 'Mythic Crate', icon: '🎁', prefix: '' },
    legendary: { field: 'legendary', label: 'Legendary Crate', icon: '🧰', prefix: '' },
    crate: { field: 'legendary', label: 'Legendary Crate', icon: '🧰', prefix: '' },
    pet: { field: 'pet', label: 'Pet Crate', icon: '🐾', prefix: '' },
    petfood: { field: 'petFood', label: 'Pet Food', icon: '🍖', prefix: '' },
    sword: { field: 'sword', label: 'Sword Lv', icon: '🗡️', prefix: '' },
    armor: { field: 'armor', label: 'Armor Lv', icon: '🥼', prefix: '' },
    pickaxe: { field: 'pickaxe', label: 'Pickaxe Lv', icon: '⛏️', prefix: '' },
    fishingrod: { field: 'fishingrod', label: 'Fishing Rod Lv', icon: '🎣', prefix: '' }
};

const CMD_PRESETS = {
    addmoney: { op: 'add', res: 'money' },
    tambahmoney: { op: 'add', res: 'money' },
    delmoney: { op: 'del', res: 'money' },
    kurangmoney: { op: 'del', res: 'money' },
    addbank: { op: 'add', res: 'bank' },
    delbank: { op: 'del', res: 'bank' },
    addexp: { op: 'add', res: 'exp' },
    addxp: { op: 'add', res: 'exp' },
    delexp: { op: 'del', res: 'exp' },
    addlevel: { op: 'add', res: 'level' },
    addlvl: { op: 'add', res: 'level' },
    setlevel: { op: 'set', res: 'level' },
    adddiamond: { op: 'add', res: 'diamond' },
    adddm: { op: 'add', res: 'diamond' },
    deldiamond: { op: 'del', res: 'diamond' },
    addgold: { op: 'add', res: 'gold' },
    delgold: { op: 'del', res: 'gold' },
    addemerald: { op: 'add', res: 'emerald' },
    addiron: { op: 'add', res: 'iron' },
    addpotion: { op: 'add', res: 'potion' },
    addcrate: { op: 'add', res: 'legendary' },
    addhealth: { op: 'add', res: 'health' },
    sethealth: { op: 'set', res: 'health' }
};

function parseShorthandAmount(raw) {
    if (raw === undefined || raw === null) return NaN;
    let s = String(raw).trim().toLowerCase().replace(/,/g, '.');
    if (!s) return NaN;
    let mult = 1;
    if (s.endsWith('b') || s.endsWith('miliar') || s.endsWith('milyar')) {
        mult = 1e9;
        s = s.replace(/(b|miliar|milyar)$/i, '');
    } else if (s.endsWith('m') || s.endsWith('jt') || s.endsWith('juta')) {
        mult = 1e6;
        s = s.replace(/(m|jt|juta)$/i, '');
    } else if (s.endsWith('k') || s.endsWith('rb') || s.endsWith('ribu')) {
        mult = 1e3;
        s = s.replace(/(k|rb|ribu)$/i, '');
    } else {
        // Handle Indonesian thousand separator like 100.000
        if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
            s = s.replace(/\./g, '');
        }
    }
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) return NaN;
    return Math.floor(n * mult);
}

function isPhoneToken(tok) {
    const clean = String(tok || '').replace(/[^0-9]/g, '');
    return /^62\d{8,14}$/.test(clean) || /^08\d{8,12}$/.test(clean);
}

module.exports = {
    name: 'addresource',
    category: 'owner',
    commands: [
        ...Object.keys(CMD_PRESETS),
        'additem', 'delitem', 'setitem'
    ],

    async execute(ctx) {
        const {
            m, command, args, isCreator, Reply, usedPrefix,
            getTargetNumber, getSenderNumber, HITORI_RPG, initRpgUser
        } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();

        let op = 'add';
        let resKey = '';
        let restArgs = [...args];

        if (CMD_PRESETS[cmd]) {
            op = CMD_PRESETS[cmd].op;
            resKey = CMD_PRESETS[cmd].res;
        } else {
            op = cmd === 'delitem' ? 'del' : (cmd === 'setitem' ? 'set' : 'add');
            resKey = String(restArgs.shift() || '').toLowerCase();
        }

        const resInfo = RESOURCE_ALIASES[resKey];
        if (!resInfo) {
            const avail = 'money, bank, exp, level, health, diamond, gold, emerald, iron, wood, rock, potion, common, uncommon, mythic, legendary, pet, petfood, upgrader';
            return Reply(
                `\`📌 OWNER RESOURCE MANAGER\`\n` +
                `> ◦ *Shortcut:* \`${pfx}addmoney @user 500k\`, \`${pfx}addexp @user 1000\`, \`${pfx}addlevel @user 5\`, \`${pfx}adddiamond @user 50\`\n` +
                `> ◦ *Universal:* \`${pfx}additem <item> [@user/nomor] <jumlah>\`\n` +
                `> ◦ *Kurangi/Set:* \`${pfx}delitem\`, \`${pfx}setitem\`, \`${pfx}delmoney\`, \`${pfx}setlevel\`\n\n` +
                `*Daftar Item Tersedia:*\n> ${avail}`
            );
        }

        const mentioned = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
        let targetNum = '';
        let amount = NaN;

        if (mentioned) {
            targetNum = getTargetNumber(m, mentioned);
            const amtTok = restArgs.find((a) => !a.startsWith('@') && !Number.isNaN(parseShorthandAmount(a)));
            amount = parseShorthandAmount(amtTok);
        } else {
            const filtered = restArgs.filter(Boolean);
            if (filtered.length >= 2 && (filtered[0].startsWith('@') || isPhoneToken(filtered[0]))) {
                targetNum = getTargetNumber(m, filtered[0]);
                amount = parseShorthandAmount(filtered[1]);
            } else if (filtered.length >= 2 && (filtered[1].startsWith('@') || isPhoneToken(filtered[1]))) {
                targetNum = getTargetNumber(m, filtered[1]);
                amount = parseShorthandAmount(filtered[0]);
            } else if (filtered.length === 1) {
                amount = parseShorthandAmount(filtered[0]);
                targetNum = getSenderNumber(m);
            }
        }

        const minVal = op === 'set' ? 0 : 1;
        if (!targetNum || Number.isNaN(amount) || amount < minVal) {
            return Reply(
                `📌 *Contoh Penggunaan:*\n` +
                `> ◦ \`${pfx}${cmd}${CMD_PRESETS[cmd] ? '' : ` ${resKey}`} @user 50k\`\n` +
                `> ◦ \`${pfx}${cmd}${CMD_PRESETS[cmd] ? '' : ` ${resKey}`} 628123456789 100000\`\n` +
                `> ◦ \`${pfx}${cmd}${CMD_PRESETS[cmd] ? '' : ` ${resKey}`} 100k\` _(otomatis ke akun sendiri)_`
            );
        }

        const targetJid = `${targetNum}@s.whatsapp.net`;
        if (!global.db.users) global.db.users = {};
        if (!global.db.users[targetJid]) global.db.users[targetJid] = {};
        const user = global.db.users[targetJid];
        try { initRpgUser(user); } catch (_) {}

        const field = resInfo.field;
        const before = Number(user[field] || 0);
        let after = before;
        if (op === 'add') after = before + amount;
        else if (op === 'del') after = Math.max(0, before - amount);
        else if (op === 'set') after = Math.max(0, amount);

        user[field] = after;

        // Sinkronisasi level & role jika mengubah exp atau level
        if (field === 'level' && HITORI_RPG) {
            try {
                if (typeof HITORI_RPG.getRoleByLevel === 'function') {
                    user.role = HITORI_RPG.getRoleByLevel(after);
                }
                if (typeof HITORI_RPG.xpRange === 'function') {
                    const rng = HITORI_RPG.xpRange(after);
                    if (rng && typeof rng.min === 'number' && (user.exp < rng.min || op === 'set')) {
                        user.exp = rng.min;
                    }
                }
            } catch (_) {}
        } else if (field === 'exp' && HITORI_RPG) {
            try {
                if (typeof HITORI_RPG.findLevel === 'function') {
                    const newLvl = HITORI_RPG.findLevel(after);
                    if (Number.isFinite(newLvl)) {
                        user.level = newLvl;
                        if (typeof HITORI_RPG.getRoleByLevel === 'function') {
                            user.role = HITORI_RPG.getRoleByLevel(newLvl);
                        }
                    }
                }
            } catch (_) {}
        }

        const fmtVal = (v) => `${resInfo.prefix}${Number(v).toLocaleString('id-ID')}`;
        const opLabel = op === 'add' ? 'Ditambahkan' : (op === 'del' ? 'Dikurangi' : 'Diatur');
        const opSign = op === 'add' ? '+' : (op === 'del' ? '-' : '=');

        return Reply(
            `\`${resInfo.icon} ${resInfo.label.toUpperCase()} ${opLabel.toUpperCase()}\`\n` +
            `> ◦ *Target :* @${targetNum}\n` +
            `> ◦ *Perubahan :* ${opSign}${fmtVal(amount)}\n` +
            `> ◦ *Sebelum :* ${fmtVal(before)}\n` +
            `> ◦ *Sekarang :* *${fmtVal(after)}*`,
            [targetJid]
        );
    }
};
