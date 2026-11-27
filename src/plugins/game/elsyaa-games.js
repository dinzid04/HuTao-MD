const activeGames = new Map();

const HANGMAN_WORDS = [
    { word: 'INDONESIA', hint: 'Negara kepulauan terbesar di Asia Tenggara' },
    { word: 'WHATSAPP', hint: 'Aplikasi chat populer warna hijau' },
    { word: 'KOMPUTER', hint: 'Perangkat elektronik untuk mengolah data' },
    { word: 'ALGORITMA', hint: 'Urutan langkah logis dalam pemrograman' },
    { word: 'ASTRONOT', hint: 'Orang yang pergi ke luar angkasa' },
    { word: 'DINOSAURUS', hint: 'Hewan purba raksasa yang sudah punah' },
    { word: 'PERPUSTAKAAN', hint: 'Tempat menyimpan dan meminjam banyak buku' },
    { word: 'PELANGI', hint: 'Lengkungan warna-warni setelah hujan' },
    { word: 'GUNUNG', hint: 'Bentang alam sangat tinggi menjulang' },
    { word: 'SAMUDRA', hint: 'Lautan yang sangat luas' },
    { word: 'BINTANG', hint: 'Benda langit yang memancarkan cahaya sendiri' },
    { word: 'ROBOTIKA', hint: 'Ilmu yang merancang dan membuat robot' },
    { word: 'NUSANTARA', hint: 'Sebutan kepulauan Indonesia sejak zaman dulu' },
    { word: 'MATEMATIKA', hint: 'Ilmu tentang angka, rumus, dan logika' },
    { word: 'FOTOGRAFI', hint: 'Seni mengambil gambar dengan kamera' },
    { word: 'CHOCOLATE', hint: 'Makanan manis berbahan dasar kakao' },
    { word: 'TELEVISI', hint: 'Media elektronik penampil siaran gambar & suara' },
    { word: 'KUPUKUPU', hint: 'Serangga bersayap indah hasil metamorfosis ulat' }
];

const EMOJI_QUIZZES = [
    { emoji: '🔥🦊', answer: 'firefox', hint: 'Browser web terkenal' },
    { emoji: '🍎📱', answer: 'iphone', hint: 'HP buatan Apple' },
    { emoji: '🌧️🌈', answer: 'pelangi', hint: 'Muncul setelah hujan' },
    { emoji: '🕷️🧑', answer: 'spiderman', hint: 'Superhero laba-laba' },
    { emoji: '🦇🧑', answer: 'batman', hint: 'Superhero kelelawar Gotham' },
    { emoji: '⚽🏆', answer: 'piala dunia', hint: 'Turnamen sepak bola terbesar' },
    { emoji: '🍜🌶️', answer: 'mie pedas', hint: 'Makanan berkuah/goreng berasa cabai' },
    { emoji: '☕📖', answer: 'ngopi santai', hint: 'Minum kopi sambil baca' },
    { emoji: '🐉⚽', answer: 'dragon ball', hint: 'Anime Goku mencari bola naga' },
    { emoji: '🏴‍☠️👒', answer: 'one piece', hint: 'Anime bajak laut topi jerami' },
    { emoji: '⚡🐭', answer: 'pikachu', hint: 'Pokemon listrik warna kuning' },
    { emoji: '🧊🚢', answer: 'titanic', hint: 'Film kapal tenggelam nabrak gunung es' },
    { emoji: '👻🏠', answer: 'rumah hantu', hint: 'Wahana seram di pasar malam' },
    { emoji: '🌙⭐', answer: 'malam hari', hint: 'Waktu setelah matahari terbenam' },
    { emoji: '🎮🏆', answer: 'esports', hint: 'Kompetisi game profesional' }
];

function grantReward(jid, money = 1500, exp = 80) {
    if (!global.db?.users) return;
    const u = global.db.users[jid] || (global.db.users[jid] = {});
    u.money = (Number(u.money) || 0) + money;
    u.exp = (Number(u.exp) || 0) + exp;
}

function clearGame(chatId) {
    const g = activeGames.get(chatId);
    if (g?.timer) clearTimeout(g.timer);
    activeGames.delete(chatId);
}

function setGame(chatId, session, ttlMs, onTimeout) {
    clearGame(chatId);
    session.timer = setTimeout(() => {
        activeGames.delete(chatId);
        if (typeof onTimeout === 'function') onTimeout();
    }, ttlMs);
    if (typeof session.timer.unref === 'function') session.timer.unref();
    activeGames.set(chatId, session);
}

function renderBombBoard(s) {
    const nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
    const cells = nums.map((n, i) => (s.opened.has(i) ? '💎' : n));
    return (
        `\`💣 TEBAK BOM (3x3)\`\n` +
        `${cells.slice(0, 3).join(' ')}\n` +
        `${cells.slice(3, 6).join(' ')}\n` +
        `${cells.slice(6, 9).join(' ')}\n\n` +
        `> ◦ Kotak aman dibuka : *${s.opened.size}/8*\n` +
        `> ◦ Hadiah terkumpul : *Rp ${s.pot.toLocaleString('id-ID')}*\n` +
        `> 💡 Ketik angka *1–9* untuk buka kotak, atau ketik *cashout* untuk ambil hadiah!`
    );
}

function renderHangman(s) {
    const masked = [...s.word].map((ch) => (s.guessed.has(ch) ? ch : '_')).join(' ');
    return (
        `\`🔤 HANGMAN — TEBAK KATA\`\n` +
        `> ◦ Kata : \`${masked}\`\n` +
        `> ◦ Petunjuk : _${s.hint}_\n` +
        `> ◦ Nyawa : ${'❤️'.repeat(s.lives)}${'🖤'.repeat(Math.max(0, 6 - s.lives))} (${s.lives}/6)\n` +
        `> ◦ Huruf dicoba : ${[...s.guessed].join(', ') || '-'}\n` +
        `> 💡 Ketik *1 huruf* (A-Z) atau langsung *tebak seluruh kata*!`
    );
}

function generateMath(level = 'medium') {
    const lvl = ['easy', 'medium', 'hard'].includes(level) ? level : 'medium';
    let a, b, op, ans;
    if (lvl === 'easy') {
        a = Math.floor(Math.random() * 30) + 5;
        b = Math.floor(Math.random() * 25) + 3;
        op = Math.random() < 0.5 ? '+' : '-';
        ans = op === '+' ? a + b : a - b;
    } else if (lvl === 'hard') {
        a = Math.floor(Math.random() * 45) + 12;
        b = Math.floor(Math.random() * 19) + 6;
        const c = Math.floor(Math.random() * 40) + 5;
        ans = a * b + c;
        return { expr: `(${a} × ${b}) + ${c}`, ans, reward: 4000, lvl };
    } else {
        a = Math.floor(Math.random() * 20) + 4;
        b = Math.floor(Math.random() * 15) + 3;
        op = ['+', '-', '×'][Math.floor(Math.random() * 3)];
        ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
    }
    return { expr: `${a} ${op} ${b}`, ans, reward: lvl === 'easy' ? 1200 : 2500, lvl };
}

async function handleElsyaaGameReply(Dinz, m, body, Reply) {
    const s = activeGames.get(m.chat);
    if (!s || m.isBaileys || !body) return false;
    const raw = String(body).trim();
    const low = raw.toLowerCase();

    if (s.type === 'bomb') {
        if (low === 'cashout' || low === 'ambil') {
            if (s.opened.size === 0) return false;
            const win = s.pot;
            clearGame(m.chat);
            grantReward(m.sender, win, 60);
            await Reply(`💰 *CASHOUT BERHASIL!*\n> Kamu membawa pulang *Rp ${win.toLocaleString('id-ID')}* + *60 EXP*! 🎉`);
            return true;
        }
        if (!/^[1-9]$/.test(raw)) return false;
        const idx = parseInt(raw, 10) - 1;
        if (s.opened.has(idx)) {
            await Reply('⚠️ Kotak itu sudah terbuka! Pilih angka lain (1–9).');
            return true;
        }
        if (idx === s.bombIndex) {
            clearGame(m.chat);
            await Reply(`💥 *BOOM!!* Kotak *${raw}* berisi BOM!\n> Permainan berakhir, hadiah hangus.`);
            return true;
        }
        s.opened.add(idx);
        s.pot += 750;
        if (s.opened.size >= 8) {
            const bonus = s.pot + 2000;
            clearGame(m.chat);
            grantReward(m.sender, bonus, 150);
            await Reply(`🏆 *JACKPOT SEMUA KOTAK AMAN!*\n> Kamu memenangkan *Rp ${bonus.toLocaleString('id-ID')}* + *150 EXP*! 🎉`);
            return true;
        }
        await Reply(renderBombBoard(s));
        return true;
    }

    if (s.type === 'hangman') {
        if (!/^[a-zA-Z]+$/.test(raw)) return false;
        const up = raw.toUpperCase();
        if (up.length === 1) {
            if (s.guessed.has(up)) {
                await Reply(`⚠️ Huruf *${up}* sudah pernah ditebak!`);
                return true;
            }
            s.guessed.add(up);
            if (!s.word.includes(up)) s.lives--;
        } else if (up === s.word) {
            for (const c of s.word) s.guessed.add(c);
        } else if (up.length === s.word.length) {
            s.lives--;
        } else {
            return false;
        }

        const won = [...s.word].every((c) => s.guessed.has(c));
        if (won) {
            clearGame(m.chat);
            grantReward(m.sender, 2500, 100);
            await Reply(`🎉 *BENAR!* Katanya adalah *${s.word}*!\n> Hadiah: *+Rp 2.500* & *+100 EXP*`);
            return true;
        }
        if (s.lives <= 0) {
            clearGame(m.chat);
            await Reply(`💀 *GAME OVER!* Nyawa habis.\n> Jawaban yang benar: *${s.word}*`);
            return true;
        }
        await Reply(renderHangman(s));
        return true;
    }

    if (s.type === 'mathquiz') {
        if (!/^-?\d+$/.test(raw)) return false;
        const guess = parseInt(raw, 10);
        if (guess === s.ans) {
            clearGame(m.chat);
            grantReward(m.sender, s.reward, 90);
            await Reply(`✅ *TEPAT SEKALI!* Jawaban: *${s.ans}*\n> Hadiah: *+Rp ${s.reward.toLocaleString('id-ID')}* & *+90 EXP*!`);
            return true;
        }
        return false;
    }

    if (s.type === 'tebakangka') {
        if (!/^\d{1,3}$/.test(raw)) return false;
        const num = parseInt(raw, 10);
        if (num < 1 || num > 100) return false;
        s.tries++;
        if (num === s.secret) {
            const reward = Math.max(800, 3500 - s.tries * 250);
            clearGame(m.chat);
            grantReward(m.sender, reward, 100);
            await Reply(`🎯 *TEPAT!* Angka rahasianya adalah *${s.secret}* (${s.tries} percobaan)!\n> Hadiah: *+Rp ${reward.toLocaleString('id-ID')}* & *+100 EXP*`);
            return true;
        }
        const diff = Math.abs(num - s.secret);
        const radar = diff <= 5 ? '🔥 Sangat Panas!' : diff <= 15 ? '♨️ Hangat' : '❄️ Dingin';
        const dir = num < s.secret ? '⬆️ Lebih BESAR' : '⬇️ Lebih KECIL';
        if (s.tries >= 10) {
            clearGame(m.chat);
            await Reply(`💀 Kesempatan habis (10/10)! Angka rahasianya adalah *${s.secret}*.`);
            return true;
        }
        await Reply(`> ${dir} | ${radar} *(Percobaan ${s.tries}/10)*`);
        return true;
    }

    if (s.type === 'tebakemoji') {
        if (low === s.answer || low.replace(/\s+/g, '') === s.answer.replace(/\s+/g, '')) {
            clearGame(m.chat);
            grantReward(m.sender, 2000, 90);
            await Reply(`🎉 *BENAR!* ${s.emoji} = *${s.answer.toUpperCase()}*\n> Hadiah: *+Rp 2.000* & *+90 EXP*!`);
            return true;
        }
        return false;
    }

    return false;
}

module.exports = {
    name: 'elsyaa-games',
    category: 'game',
    commands: ['bomb', 'tebakbom', 'hangman', 'mathquiz', 'kuismtk', 'tebakangka', 'tebakemoji', 'stopgame'],
    handleElsyaaGameReply,

    async execute(ctx) {
        const { Dinz, m, command, args, Reply, usedPrefix } = ctx;
        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();

        if (cmd === 'stopgame') {
            if (!activeGames.has(m.chat)) {
                return Reply('ℹ️ Tidak ada sesi mini-game (bomb/hangman/mathquiz/tebakangka/tebakemoji) yang sedang aktif di chat ini.');
            }
            const g = activeGames.get(m.chat);
            clearGame(m.chat);
            return Reply(`🛑 Sesi game *${g.type}* dihentikan.`);
        }

        if (activeGames.has(m.chat)) {
            const g = activeGames.get(m.chat);
            return Reply(`⏳ Masih ada game *${g.type}* yang berjalan di chat ini! Ketik \`${pfx}stopgame\` untuk menghentikan.`);
        }

        if (cmd === 'bomb' || cmd === 'tebakbom') {
            const session = { type: 'bomb', bombIndex: Math.floor(Math.random() * 9), opened: new Set(), pot: 0 };
            setGame(m.chat, session, 120000, () => Dinz.sendMessage(m.chat, { text: '⏰ Waktu *Tebak Bom* habis!' }).catch(() => {}));
            return Reply(renderBombBoard(session));
        }

        if (cmd === 'hangman') {
            const pick = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)];
            const session = { type: 'hangman', word: pick.word, hint: pick.hint, guessed: new Set(), lives: 6 };
            setGame(m.chat, session, 120000, () => Dinz.sendMessage(m.chat, { text: `⏰ Waktu *Hangman* habis! Jawabannya: *${pick.word}*` }).catch(() => {}));
            return Reply(renderHangman(session));
        }

        if (cmd === 'mathquiz' || cmd === 'kuismtk') {
            const lvl = (args[0] || 'medium').toLowerCase();
            const q = generateMath(lvl);
            const session = { type: 'mathquiz', ...q };
            setGame(m.chat, session, 45000, () => Dinz.sendMessage(m.chat, { text: `⏰ Waktu *Math Quiz* habis! Jawabannya: *${q.ans}*` }).catch(() => {}));
            return Reply(
                `\`🧮 MATH QUIZ (${q.lvl.toUpperCase()})\`\n` +
                `> ◦ Hitung cepat: *${q.expr} = ?*\n` +
                `> ◦ Waktu : *45 detik* | Hadiah : *Rp ${q.reward.toLocaleString('id-ID')}*\n` +
                `> 💡 Langsung ketik angka jawabannya!`
            );
        }

        if (cmd === 'tebakangka') {
            const secret = Math.floor(Math.random() * 100) + 1;
            const session = { type: 'tebakangka', secret, tries: 0 };
            setGame(m.chat, session, 120000, () => Dinz.sendMessage(m.chat, { text: `⏰ Waktu *Tebak Angka* habis! Angkanya: *${secret}*` }).catch(() => {}));
            return Reply(
                `\`🎯 TEBAK ANGKA (1–100)\`\n` +
                `> ◦ Aku memikirkan satu angka rahasia dari *1* sampai *100*!\n` +
                `> ◦ Kesempatan : *10 percobaan* | Waktu : *2 menit*\n` +
                `> 💡 Langsung ketik angka tebakanmu!`
            );
        }

        if (cmd === 'tebakemoji') {
            const pick = EMOJI_QUIZZES[Math.floor(Math.random() * EMOJI_QUIZZES.length)];
            const session = { type: 'tebakemoji', ...pick };
            setGame(m.chat, session, 60000, () => Dinz.sendMessage(m.chat, { text: `⏰ Waktu *Tebak Emoji* habis! Jawabannya: *${pick.answer.toUpperCase()}*` }).catch(() => {}));
            return Reply(
                `\`🧩 TEBAK EMOJI\`\n` +
                `> ◦ Emoji : ${pick.emoji}\n` +
                `> ◦ Petunjuk : _${pick.hint}_\n` +
                `> ◦ Waktu : *60 detik* | Hadiah : *Rp 2.000*\n` +
                `> 💡 Langsung ketik jawabannya di chat!`
            );
        }

        return true;
    }
};
