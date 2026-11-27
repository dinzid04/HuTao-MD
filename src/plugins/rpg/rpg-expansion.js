const COINS = {
    BTC: { name: 'Bitcoin', base: 1080000000 },
    ETH: { name: 'Ethereum', base: 42000000 },
    SOL: { name: 'Solana', base: 2800000 },
    BNB: { name: 'BNB', base: 9800000 },
    TON: { name: 'Toncoin', base: 85000 },
    DOGE: { name: 'Dogecoin', base: 3200 }
};

const STOCKS = {
    BBCA: { name: 'Bank Central Asia', base: 10200 },
    BBRI: { name: 'Bank Rakyat Indonesia', base: 4850 },
    TLKM: { name: 'Telkom Indonesia', base: 3150 },
    GOTO: { name: 'GoTo Gojek Tokopedia', base: 72 },
    ASII: { name: 'Astra International', base: 5100 }
};

const WAIFU_POOL = [
    { name: 'Hu Tao', rarity: 'SSR 🌟', bonus: 25000 },
    { name: 'Furina', rarity: 'SSR 🌟', bonus: 25000 },
    { name: 'Raiden Shogun', rarity: 'SSR 🌟', bonus: 25000 },
    { name: 'Frieren', rarity: 'SR ✨', bonus: 10000 },
    { name: 'Firefly', rarity: 'SSR 🌟', bonus: 25000 },
    { name: 'Kafka', rarity: 'SR ✨', bonus: 10000 },
    { name: 'Kamisato Ayaka', rarity: 'SR ✨', bonus: 10000 },
    { name: 'Keqing', rarity: 'R 🔹', bonus: 3500 },
    { name: 'March 7th', rarity: 'R 🔹', bonus: 3500 },
    { name: 'Barbara', rarity: 'R 🔹', bonus: 3500 }
];

function getSimPrice(basePrice, symbol) {
    // Fluktuasi deterministik per 5 menit (+/- 14%) agar seru untuk trading RPG
    const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
    let seed = bucket;
    for (const ch of symbol) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const wave = Math.sin(seed * 0.73) * 0.12 + Math.cos(seed * 0.29) * 0.04;
    return Math.max(10, Math.round(basePrice * (1 + wave)));
}

function fmt(n) {
    return Math.round(Number(n) || 0).toLocaleString('id-ID');
}

function ensureUserExt(jid, initRpgUser) {
    if (!global.db.users) global.db.users = {};
    const u = global.db.users[jid] || (global.db.users[jid] = {});
    if (typeof initRpgUser === 'function') initRpgUser(u);
    u.money = Number(u.money || 0);
    u.bank = Number(u.bank || 0);
    u.exp = Number(u.exp || 0);
    u.level = Number(u.level || 1);
    u.potion = Number(u.potion || 0);
    u.diamond = Number(u.diamond || 0);
    if (!u.crypto || typeof u.crypto !== 'object') u.crypto = {};
    if (!u.stocks || typeof u.stocks !== 'object') u.stocks = {};
    if (!u.cooldownExt || typeof u.cooldownExt !== 'object') u.cooldownExt = {};
    if (!Array.isArray(u.waifus)) u.waifus = [];
    return u;
}

function checkCd(u, key, ms) {
    const now = Date.now();
    const prev = u.cooldownExt[key] || 0;
    if (now - prev < ms) {
        const rem = Math.ceil((ms - (now - prev)) / 1000);
        const m = Math.floor(rem / 60);
        const s = rem % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    }
    u.cooldownExt[key] = now;
    return null;
}

module.exports = {
    name: 'rpg-expansion',
    category: 'rpg',
    commands: [
        'cryptoprice', 'cryptobuy', 'cryptosell', 'cryptoportfolio', 'saham',
        'createyt', 'akunyt', 'liveyt', 'creatett', 'akuntt', 'livett', 'endorse', 'sawer',
        'warnet', 'warteg', 'cafe', 'berdagang', 'freelance', 'polisi', 'crime',
        'bansos', 'gajian', 'hourly', 'dailybox', 'redeem',
        'arena', 'bossfight', 'dragonraid', 'bounty',
        'blacksmith', 'alchemy', 'cook', 'enchant',
        'gacha', 'waifugacha', 'prestige', 'reincarnate', 'bankcek', 'buykoin'
    ],

    async execute(ctx) {
        const { m, command, text, args, Reply, initRpgUser, usedPrefix } = ctx;
        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();
        const u = ensureUserExt(m.sender, initRpgUser);

        // ================= CRYPTO & SAHAM SIMULATOR =================
        if (cmd === 'cryptoprice') {
            const rows = Object.entries(COINS).map(([sym, info]) => {
                const p = getSimPrice(info.base, sym);
                const diffPct = (((p - info.base) / info.base) * 100).toFixed(2);
                return `> ◦ *${sym}* (${info.name}) : *Rp ${fmt(p)}* (${diffPct >= 0 ? '📈 +' : '📉 '}${diffPct}%)`;
            });
            return Reply(`\`💹 BURSA CRYPTO RPG (UPDATE TIAP 5 MENIT)\`\n\n${rows.join('\n')}\n\n💡 Beli: \`${pfx}cryptobuy BTC 50000\` | Jual: \`${pfx}cryptosell BTC all\``);
        }

        if (cmd === 'cryptobuy') {
            const sym = String(args[0] || '').toUpperCase();
            const spend = Math.floor(Number(args[1]) || 0);
            if (!COINS[sym] || spend < 1000) return Reply(`💹 Format: \`${pfx}cryptobuy <BTC/ETH/SOL/BNB/TON/DOGE> <nominal Rp>\`\n> Contoh: \`${pfx}cryptobuy BTC 50000\``);
            if (u.money < spend) return Reply(`❌ Uangmu kurang! Saldo: *Rp ${fmt(u.money)}*`);
            const price = getSimPrice(COINS[sym].base, sym);
            const qty = spend / price;
            u.money -= spend;
            u.crypto[sym] = (Number(u.crypto[sym]) || 0) + qty;
            return Reply(`✅ Berhasil membeli *${qty.toFixed(6)} ${sym}* senilai *Rp ${fmt(spend)}*!`);
        }

        if (cmd === 'cryptosell') {
            const sym = String(args[0] || '').toUpperCase();
            const owned = Number(u.crypto[sym] || 0);
            if (!COINS[sym] || owned <= 0) return Reply(`❌ Kamu tidak memiliki koin *${sym || '-'}*. Cek \`${pfx}cryptoportfolio\`.`);
            const sellQty = String(args[1] || 'all').toLowerCase() === 'all' ? owned : Math.min(owned, parseFloat(args[1]) || 0);
            if (sellQty <= 0) return Reply('❌ Jumlah jual tidak valid.');
            const price = getSimPrice(COINS[sym].base, sym);
            const got = Math.round(sellQty * price);
            u.crypto[sym] = Math.max(0, owned - sellQty);
            if (u.crypto[sym] < 1e-8) delete u.crypto[sym];
            u.money += got;
            return Reply(`💰 Berhasil menjual *${sellQty.toFixed(6)} ${sym}* dan menerima **Rp ${fmt(got)}**!`);
        }

        if (cmd === 'cryptoportfolio') {
            const entries = Object.entries(u.crypto).filter(([, q]) => q > 0);
            if (!entries.length) return Reply(`💼 Portofolio crypto kamu masih kosong.\n> Cek harga: \`${pfx}cryptoprice\``);
            let total = 0;
            const rows = entries.map(([sym, qty]) => {
                const val = Math.round(qty * getSimPrice(COINS[sym]?.base || 1000, sym));
                total += val;
                return `> ◦ *${sym}* : ${Number(qty).toFixed(6)} (≈ *Rp ${fmt(val)}*)`;
            });
            return Reply(`\`💼 PORTOFOLIO CRYPTO KAMU\`\n${rows.join('\n')}\n\n> 💰 *Total Nilai Aset :* **Rp ${fmt(total)}**`);
        }

        if (cmd === 'saham') {
            const sub = (args[0] || '').toLowerCase();
            const code = String(args[1] || '').toUpperCase();
            const lot = Math.max(1, parseInt(args[2], 10) || 1);
            if (sub === 'beli' && STOCKS[code]) {
                const cost = getSimPrice(STOCKS[code].base, code) * 100 * lot;
                if (u.money < cost) return Reply(`❌ Butuh *Rp ${fmt(cost)}* untuk beli ${lot} lot *${code}*.`);
                u.money -= cost;
                u.stocks[code] = (u.stocks[code] || 0) + lot;
                return Reply(`📈 Berhasil membeli *${lot} lot ${code}* seharga *Rp ${fmt(cost)}*!`);
            }
            if (sub === 'jual' && STOCKS[code]) {
                const curLot = u.stocks[code] || 0;
                if (curLot < lot) return Reply(`❌ Kamu hanya punya *${curLot} lot ${code}*.`);
                const val = getSimPrice(STOCKS[code].base, code) * 100 * lot;
                u.stocks[code] -= lot;
                u.money += val;
                return Reply(`💰 Berhasil menjual *${lot} lot ${code}* dan menerima *Rp ${fmt(val)}*!`);
            }
            const list = Object.entries(STOCKS).map(([k, s]) => {
                const p = getSimPrice(s.base, k);
                const myLot = u.stocks[k] || 0;
                return `> ◦ *${k}* (${s.name}) : Rp ${fmt(p)}/lbr *(Rp ${fmt(p * 100)}/lot)*${myLot ? ` — Punya: *${myLot} lot*` : ''}`;
            });
            return Reply(`\`📊 BURSA SAHAM RPG\`\n${list.join('\n')}\n\n💡 \`${pfx}saham beli BBCA 2\` / \`${pfx}saham jual BBCA 1\``);
        }

        // ================= CONTENT CREATOR / STREAMER SIMULATOR =================
        if (cmd === 'createyt' || cmd === 'creatett') {
            const isYt = cmd === 'createyt';
            const field = isYt ? 'ytChannel' : 'ttAccount';
            const name = String(text || '').trim().slice(0, 28);
            if (!name) return Reply(`${isYt ? '▶️' : '🎵'} Contoh: \`${pfx}${cmd} ${m.pushName || 'GamingID'}\``);
            u[field] = u[field] || { name, subs: 0, views: 0, videos: 0 };
            u[field].name = name;
            return Reply(`✅ ${isYt ? 'Channel YouTube' : 'Akun TikTok'} **${name}** siap digunakan! Mulai live dengan \`${pfx}${isYt ? 'liveyt' : 'livett'}\`.`);
        }

        if (cmd === 'akunyt' || cmd === 'akuntt') {
            const isYt = cmd === 'akunyt';
            const acc = isYt ? u.ytChannel : u.ttAccount;
            if (!acc) return Reply(`❌ Kamu belum buat akun! Ketik \`${pfx}${isYt ? 'createyt' : 'creatett'} <nama>\`.`);
            return Reply(
                `\`${isYt ? '▶️ YOUTUBE CHANNEL' : '🎵 TIKTOK CREATOR'}\`\n` +
                `> ◦ *Nama :* ${acc.name}\n` +
                `> ◦ *Followers/Subs :* ${fmt(acc.subs)}\n` +
                `> ◦ *Total Views :* ${fmt(acc.views)}\n` +
                `> ◦ *Total Live :* ${acc.videos}x`
            );
        }

        if (cmd === 'liveyt' || cmd === 'livett') {
            const isYt = cmd === 'liveyt';
            const acc = isYt ? u.ytChannel : u.ttAccount;
            if (!acc) return Reply(`❌ Buat akun dulu pakai \`${pfx}${isYt ? 'createyt' : 'creatett'} <nama>\`!`);
            const wait = checkCd(u, cmd, 8 * 60 * 1000);
            if (wait) return Reply(`⏳ Istirahat dulu sebelum live lagi (*${wait}*).`);
            const newSubs = Math.floor(Math.random() * 450) + 50;
            const views = newSubs * (Math.floor(Math.random() * 18) + 6);
            const adsMoney = Math.round(views * 2.4) + 3500;
            acc.subs += newSubs;
            acc.views += views;
            acc.videos += 1;
            u.money += adsMoney;
            u.exp += 120;
            return Reply(
                `🔴 *LIVE ${isYt ? 'YOUTUBE' : 'TIKTOK'} SELESAI!*\n` +
                `> ◦ *Channel :* ${acc.name}\n` +
                `> ◦ *Penonton :* +${fmt(views)} views (+${fmt(newSubs)} subs)\n` +
                `> ◦ *AdSense & Gift :* **+Rp ${fmt(adsMoney)}** & **+120 EXP**`
            );
        }

        if (cmd === 'endorse') {
            const totalSubs = (u.ytChannel?.subs || 0) + (u.ttAccount?.subs || 0);
            if (totalSubs < 200) return Reply(`📢 Minimal total *200 subscribers/followers* dari \`${pfx}liveyt\` / \`${pfx}livett\` untuk menerima Endorse! (Saat ini: ${fmt(totalSubs)})`);
            const wait = checkCd(u, 'endorse', 15 * 60 * 1000);
            if (wait) return Reply(`⏳ Menunggu tawaran brand berikutnya (*${wait}*).`);
            const fee = Math.min(250000, 12000 + Math.round(totalSubs * 4.5));
            u.money += fee;
            return Reply(`🤝 *ENDORSE BRAND SUKSES!*\n> Brand membayar **Rp ${fmt(fee)}** ke saldo kamu!`);
        }

        if (cmd === 'sawer') {
            const target = (m.mentionedJid && m.mentionedJid[0]) || m.quoted?.sender;
            const amt = Math.floor(Number(args[1] || args[0]) || 0);
            if (!target || target === m.sender || amt < 500) return Reply(`💸 Contoh: \`${pfx}sawer @user 5000\``);
            if (u.money < amt) return Reply(`❌ Saldo kurang! Uangmu: *Rp ${fmt(u.money)}*`);
            const tUser = ensureUserExt(target, initRpgUser);
            u.money -= amt;
            tUser.money += amt;
            return Reply(`🎉 Kamu menyawer @${target.split('@')[0]} sebesar **Rp ${fmt(amt)}**!`, [target]);
        }

        // ================= JOBS, USAHA & REWARDS =================
        const SIMPLE_JOBS = {
            warnet: { icon: '🖥️', title: 'Jaga Warnet', cd: 6 * 60000, min: 4000, max: 11000, xp: 85 },
            warteg: { icon: '🍛', title: 'Buka Warteg', cd: 6 * 60000, min: 4500, max: 12000, xp: 90 },
            cafe: { icon: '☕', title: 'Barista Cafe', cd: 6 * 60000, min: 5000, max: 13000, xp: 95 },
            berdagang: { icon: '🛒', title: 'Berdagang Pasar', cd: 8 * 60000, min: 6000, max: 16000, xp: 110 },
            freelance: { icon: '💻', title: 'Proyek Freelance', cd: 10 * 60000, min: 8000, max: 22000, xp: 140 },
            polisi: { icon: '🚓', title: 'Patroli Polisi', cd: 8 * 60000, min: 6500, max: 15500, xp: 120 }
        };
        if (SIMPLE_JOBS[cmd]) {
            const j = SIMPLE_JOBS[cmd];
            const wait = checkCd(u, cmd, j.cd);
            if (wait) return Reply(`⏳ Selesai kerja *${j.title}*, istirahat dulu *${wait}*.`);
            const earn = Math.floor(Math.random() * (j.max - j.min + 1)) + j.min;
            u.money += earn;
            u.exp += j.xp;
            return Reply(`${j.icon} *${j.title} Selesai!*\n> ◦ Upah : **+Rp ${fmt(earn)}**\n> ◦ Pengalaman : **+${j.xp} EXP**`);
        }

        if (cmd === 'crime' || cmd === 'bansos') {
            const wait = checkCd(u, cmd, 15 * 60 * 1000);
            if (wait) return Reply(`⏳ Polisi masih berjaga, tunggu *${wait}* lagi!`);
            const success = Math.random() < 0.52;
            if (success) {
                const loot = Math.floor(Math.random() * 28000) + 12000;
                u.money += loot;
                return Reply(`🕶️ *Aksi ${cmd === 'bansos' ? 'Korupsi Bansos' : 'Bobol Brankas'} Berhasil!*\n> Kamu kabur membawa **+Rp ${fmt(loot)}**!`);
            } else {
                const fine = Math.min(u.money, Math.floor(Math.random() * 10000) + 4000);
                u.money -= fine;
                return Reply(`🚔 *TERTANGKAP!* Kamu didenda **-Rp ${fmt(fine)}**.`);
            }
        }

        if (cmd === 'hourly' || cmd === 'gajian' || cmd === 'dailybox') {
            const cfgMap = {
                hourly: { cd: 3600 * 1000, money: 5000, xp: 100, label: 'Klaim Per Jam' },
                gajian: { cd: 6 * 3600 * 1000, money: 25000, xp: 300, label: 'Gajian Bulanan RPG' },
                dailybox: { cd: 24 * 3600 * 1000, money: 35000, xp: 450, potion: 3, label: 'Kotak Hadiah Harian' }
            };
            const c = cfgMap[cmd];
            const wait = checkCd(u, cmd, c.cd);
            if (wait) return Reply(`⏳ *${c.label}* baru bisa diklaim lagi dalam *${wait}*.`);
            u.money += c.money;
            u.exp += c.xp;
            if (c.potion) u.potion += c.potion;
            return Reply(`🎁 *${c.label} Diklaim!*\n> ◦ **+Rp ${fmt(c.money)}** | **+${c.xp} EXP**${c.potion ? ` | **+${c.potion} Potion**` : ''}`);
        }

        if (cmd === 'redeem') {
            const code = String(args[0] || '').trim().toUpperCase();
            if (!code) return Reply(`🎟️ Contoh: \`${pfx}redeem HUTAOMD\``);
            const CODES = {
                HUTAOMD: { money: 30000, exp: 500, diamond: 3 },
                STARLIGHT: { money: 20000, exp: 350, diamond: 2 }
            };
            if (!CODES[code]) return Reply('❌ Kode redeem tidak valid atau sudah kedaluwarsa.');
            u.redeemed = Array.isArray(u.redeemed) ? u.redeemed : [];
            if (u.redeemed.includes(code)) return Reply('⚠️ Kamu sudah pernah mengklaim kode redeem tersebut!');
            u.redeemed.push(code);
            const r = CODES[code];
            u.money += r.money;
            u.exp += r.exp;
            u.diamond += r.diamond;
            return Reply(`🎉 *REDEEM BERHASIL (${code})!*\n> +Rp ${fmt(r.money)} • +${r.exp} EXP • +${r.diamond} Diamond 💎`);
        }

        // ================= COMBAT, CRAFTING, GACHA & PRESTIGE =================
        if (cmd === 'arena' || cmd === 'bossfight' || cmd === 'dragonraid' || cmd === 'bounty') {
            const wait = checkCd(u, cmd, 10 * 60 * 1000);
            if (wait) return Reply(`⏳ Pulihkan tenagamu dulu selama *${wait}*.`);
            const mult = cmd === 'dragonraid' ? 3 : cmd === 'bossfight' ? 2.2 : 1.5;
            const win = Math.random() < 0.72;
            if (!win) {
                u.exp += 60;
                return Reply(`⚔️ Pertarungan *${cmd.toUpperCase()}* sengit namun kamu kalah tipis! Tetap dapat *+60 EXP*.`);
            }
            const gold = Math.round((9000 + u.level * 1200) * mult);
            const xp = Math.round(180 * mult);
            u.money += gold;
            u.exp += xp;
            return Reply(`🏆 *KEMENANGAN ${cmd.toUpperCase()}!*\n> ◦ Hadiah : **+Rp ${fmt(gold)}** & **+${xp} EXP**!`);
        }

        if (cmd === 'blacksmith' || cmd === 'alchemy' || cmd === 'cook' || cmd === 'enchant') {
            const cost = 5000;
            if (u.money < cost) return Reply(`❌ Butuh biaya bahan *Rp ${fmt(cost)}*.`);
            u.money -= cost;
            if (cmd === 'alchemy' || cmd === 'cook') {
                u.potion += 3;
                u.exp += 80;
                return Reply(`🧪 *${cmd === 'cook' ? 'Memasak Hidangan' : 'Meracik Ramuan'} Berhasil!*\n> Kamu memperoleh **+3 Potion** & **+80 EXP**.`);
            }
            u.weaponPower = (Number(u.weaponPower) || 0) + 5;
            u.exp += 110;
            return Reply(`⚒️ *${cmd === 'enchant' ? 'Enchant Senjata' : 'Tempa Senjata'} Berhasil!*\n> Kekuatan tempur meningkat (**+${u.weaponPower} ATK**) & **+110 EXP**!`);
        }

        if (cmd === 'gacha' || cmd === 'waifugacha') {
            const cost = 10000;
            if (u.money < cost) return Reply(`🎰 Butuh *Rp ${fmt(cost)}* untuk 1x Gacha! (Saldo: Rp ${fmt(u.money)})`);
            u.money -= cost;
            const pick = WAIFU_POOL[Math.floor(Math.random() * WAIFU_POOL.length)];
            if (!u.waifus.includes(pick.name)) u.waifus.push(pick.name);
            u.money += pick.bonus;
            return Reply(
                `\`🎰 GACHA PULL RESULT\`\n` +
                `> ◦ Karakter : **${pick.name}** [${pick.rarity}]\n` +
                `> ◦ Cashback Bonus : **+Rp ${fmt(pick.bonus)}**\n` +
                `> ◦ Koleksi Kamu : *${u.waifus.length}/${WAIFU_POOL.length}* karakter`
            );
        }

        if (cmd === 'prestige' || cmd === 'reincarnate') {
            if (u.level < 50) return Reply(`🌟 Minimal mencapai **Level 50** untuk *${cmd}*! (Level kamu saat ini: Lv.${u.level})`);
            u.prestige = (Number(u.prestige) || 0) + 1;
            u.level = 1;
            u.exp = 0;
            const bonus = u.prestige * 150000;
            u.money += bonus;
            u.diamond += 10;
            return Reply(`🌌 *REINKARNASI / PRESTIGE #${u.prestige} BERHASIL!*\n> Kamu memperoleh **+Rp ${fmt(bonus)}** & **+10 Diamond**!`);
        }

        if (cmd === 'bankcek') {
            return Reply(
                `\`🏦 RINGKASAN KEUANGAN RPG\`\n` +
                `> ◦ *Dompet Tunai :* Rp ${fmt(u.money)}\n` +
                `> ◦ *Saldo Bank :* Rp ${fmt(u.bank)}\n` +
                `> ◦ *Diamond :* 💎 ${fmt(u.diamond)}\n` +
                `> ◦ *Potion :* 🧪 ${fmt(u.potion)}\n` +
                `> ◦ *Prestige :* 🌟 ${u.prestige || 0}`
            );
        }

        if (cmd === 'buykoin') {
            const xpSpend = Math.max(100, parseInt(args[0], 10) || 0);
            if (!args[0] || u.exp < xpSpend) return Reply(`🔄 Tukar EXP menjadi uang RPG (1 EXP = Rp 25)!\n> Contoh: \`${pfx}buykoin 500\` *(EXP kamu: ${fmt(u.exp)})*`);
            const got = xpSpend * 25;
            u.exp -= xpSpend;
            u.money += got;
            return Reply(`✅ Berhasil menukar *${fmt(xpSpend)} EXP* menjadi **Rp ${fmt(got)}**!`);
        }

        return true;
    }
};
