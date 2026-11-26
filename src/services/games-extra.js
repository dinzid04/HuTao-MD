const { formatCard, formatNumber } = require('../utils/formatter');
const { addBonusLimit } = require('./limit');

global.tttGames = global.tttGames || {};
global.suitGames = global.suitGames || {};
global.bjGames = global.bjGames || new Map();
global.wwGames = global.wwGames || {};
global.utGames = global.utGames || {};
global.dungeonCooldowns = global.dungeonCooldowns || {};

function cleanNum(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function getUserRecord(jid) {
    if (!global.db) global.db = { users: {}, groups: {} };
    if (!global.db.users) global.db.users = {};
    if (!global.db.users[jid] || typeof global.db.users[jid] !== 'object') {
        global.db.users[jid] = {};
    }
    const u = global.db.users[jid];
    if (typeof u.money !== 'number') u.money = 0;
    if (typeof u.exp !== 'number') u.exp = 0;
    return u;
}

function addReward(jid, { money = 0, exp = 0, limit = 0 } = {}) {
    const u = getUserRecord(jid);
    u.money = Math.max(0, (u.money || 0) + money);
    u.exp = Math.max(0, (u.exp || 0) + exp);
    if (money > 0 || exp > 0) u.gameWins = (u.gameWins || 0) + 1;
    if (limit > 0) {
        try { addBonusLimit(jid, limit); } catch (_) {}
    }
    return u;
}

const TTT_CELLS = { X: '❌', O: '⭕', 1: '1️⃣', 2: '2️⃣', 3: '3️⃣', 4: '4️⃣', 5: '5️⃣', 6: '6️⃣', 7: '7️⃣', 8: '8️⃣', 9: '9️⃣' };
const TTT_WINS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function renderTttBoard(board) {
    const c = board.map((v, i) => TTT_CELLS[v || (i + 1)]);
    return `┌───┬───┬───┐\n│ ${c[0]} │ ${c[1]} │ ${c[2]} │\n├───┼───┼───┤\n│ ${c[3]} │ ${c[4]} │ ${c[5]} │\n├───┼───┼───┤\n│ ${c[6]} │ ${c[7]} │ ${c[8]} │\n└───┴───┴───┘`;
}

function checkTttWinner(board) {
    for (const [a, b, c] of TTT_WINS) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
}

async function handleTicTacToeCmd(Dinz, m, text, usedPrefix) {
    if (!m.isGroup) return Dinz.sendMessage(m.chat, { text: global.mess.group }, { quoted: m });
    const existing = Object.values(global.tttGames).find(
        (r) => r.chat === m.chat && (r.playerX === m.sender || r.playerO === m.sender)
    );
    if (existing) {
        return Dinz.sendMessage(m.chat, {
            text: `❌ Kamu masih berada di room Tic-Tac-Toe!\nKetik *nyerah* untuk keluar dari permainan.`
        }, { quoted: m });
    }

    const roomName = (text || '').trim();
    const waiting = Object.values(global.tttGames).find(
        (r) => r.chat === m.chat && r.state === 'WAITING' && (!roomName || r.name === roomName)
    );

    if (waiting) {
        waiting.playerO = m.sender;
        waiting.state = 'PLAYING';
        waiting.turn = waiting.playerX;
        const msg = formatCard({
            icon: '🎮',
            title: 'TIC-TAC-TOE DIMULAI',
            body: `❌ @${cleanNum(waiting.playerX)}  vs  ⭕ @${cleanNum(waiting.playerO)}\n\n${renderTttBoard(waiting.board)}\n\n🎯 Giliran: @${cleanNum(waiting.turn)}\nKetik angka *1-9* langsung di chat, atau *nyerah* untuk menyerah.`
        });
        return Dinz.sendMessage(m.chat, { text: msg, mentions: [waiting.playerX, waiting.playerO] }, { quoted: m });
    }

    const id = `ttt_${Date.now()}`;
    global.tttGames[id] = {
        id,
        chat: m.chat,
        name: roomName,
        playerX: m.sender,
        playerO: null,
        board: Array(9).fill(null),
        turn: m.sender,
        state: 'WAITING',
        createdAt: Date.now()
    };
    setTimeout(() => {
        if (global.tttGames[id]?.state === 'WAITING') delete global.tttGames[id];
    }, 5 * 60000).unref?.();

    const msg = formatCard({
        icon: '🎮',
        title: 'ROOM TIC-TAC-TOE',
        body: `Host: @${cleanNum(m.sender)}\nStatus: Menunggu lawan...\n\nKetik \`${usedPrefix}tictactoe${roomName ? ' ' + roomName : ''}\` untuk bergabung!`
    });
    return Dinz.sendMessage(m.chat, { text: msg, mentions: [m.sender] }, { quoted: m });
}

async function handleTicTacToeMove(Dinz, m, rawText) {
    const room = Object.values(global.tttGames).find(
        (r) => r.chat === m.chat && (r.playerX === m.sender || r.playerO === m.sender)
    );
    if (!room) return false;

    const lower = rawText.trim().toLowerCase();
    if (lower === 'nyerah' || lower === 'surrender') {
        delete global.tttGames[room.id];
        if (room.state === 'WAITING') {
            await Dinz.sendMessage(m.chat, { text: '🏳️ Room Tic-Tac-Toe dibatalkan.' }, { quoted: m });
            return true;
        }
        const winner = m.sender === room.playerX ? room.playerO : room.playerX;
        addReward(winner, { money: 1000, exp: 150, limit: 1 });
        await Dinz.sendMessage(m.chat, {
            text: `🏳️ @${cleanNum(m.sender)} menyerah!\n🏆 @${cleanNum(winner)} menang (+Rp 1.000, +150 EXP, +1 Limit)`,
            mentions: [m.sender, winner]
        }, { quoted: m });
        return true;
    }

    if (room.state !== 'PLAYING') return false;
    if (!/^[1-9]$/.test(lower)) return false;

    if (room.turn !== m.sender) {
        await Dinz.sendMessage(m.chat, { text: '⏳ Bukan giliranmu!' }, { quoted: m });
        return true;
    }

    const idx = parseInt(lower, 10) - 1;
    if (room.board[idx]) {
        await Dinz.sendMessage(m.chat, { text: '❌ Kotak tersebut sudah terisi!' }, { quoted: m });
        return true;
    }

    const symbol = m.sender === room.playerX ? 'X' : 'O';
    room.board[idx] = symbol;
    const winSym = checkTttWinner(room.board);

    if (winSym) {
        const winner = winSym === 'X' ? room.playerX : room.playerO;
        addReward(winner, { money: 2000, exp: 300, limit: 2 });
        delete global.tttGames[room.id];
        const msg = formatCard({
            icon: '🏆',
            title: 'TIC-TAC-TOE SELESAI',
            body: `${renderTttBoard(room.board)}\n\n🎉 Pemenang: @${cleanNum(winner)} (${TTT_CELLS[winSym]})\n🎁 Hadiah: +Rp 2.000 | +300 EXP | +2 Limit`
        });
        await Dinz.sendMessage(m.chat, { text: msg, mentions: [room.playerX, room.playerO] }, { quoted: m });
        return true;
    }

    if (room.board.every(Boolean)) {
        delete global.tttGames[room.id];
        const msg = formatCard({
            icon: '🤝',
            title: 'TIC-TAC-TOE SERI',
            body: `${renderTttBoard(room.board)}\n\nPermainan berakhir seri!`
        });
        await Dinz.sendMessage(m.chat, { text: msg, mentions: [room.playerX, room.playerO] }, { quoted: m });
        return true;
    }

    room.turn = room.turn === room.playerX ? room.playerO : room.playerX;
    const msg = formatCard({
        icon: '🎮',
        title: 'TIC-TAC-TOE',
        body: `${renderTttBoard(room.board)}\n\n🎯 Giliran: @${cleanNum(room.turn)}`
    });
    await Dinz.sendMessage(m.chat, { text: msg, mentions: [room.turn] }, { quoted: m });
    return true;
}

const SUIT_EMOJI = { batu: '✊', gunting: '✌️', kertas: '✋' };

async function handleSuitPvpCmd(Dinz, m, usedPrefix) {
    if (!m.isGroup) return Dinz.sendMessage(m.chat, { text: global.mess.group }, { quoted: m });
    const active = Object.values(global.suitGames).find((r) => r.p1 === m.sender || r.p2 === m.sender);
    if (active) return Dinz.sendMessage(m.chat, { text: '❌ Kamu masih dalam sesi Suit PvP!' }, { quoted: m });

    const target = m.mentionedJid?.[0] || m.quoted?.sender;
    if (!target) {
        return Dinz.sendMessage(m.chat, {
            text: formatCard({
                icon: '✊',
                title: 'SUIT PVP',
                body: `Tag atau reply lawan untuk menantang Suit (Batu Gunting Kertas)!\nContoh: \`${usedPrefix}suit @user\``
            })
        }, { quoted: m });
    }
    if (target === m.sender) return Dinz.sendMessage(m.chat, { text: '❌ Tidak bisa menantang diri sendiri!' }, { quoted: m });
    if (Object.values(global.suitGames).some((r) => r.p1 === target || r.p2 === target)) {
        return Dinz.sendMessage(m.chat, { text: '❌ Lawan sedang bermain Suit dengan orang lain.' }, { quoted: m });
    }

    const id = `suit_${Date.now()}`;
    const room = {
        id,
        chat: m.chat,
        p1: m.sender,
        p2: target,
        status: 'waiting',
        c1: null,
        c2: null,
        timeout: setTimeout(() => {
            if (global.suitGames[id]) {
                delete global.suitGames[id];
                Dinz.sendMessage(m.chat, {
                    text: `⏱️ Tantangan Suit untuk @${cleanNum(target)} kedaluwarsa.`,
                    mentions: [target]
                }).catch(() => {});
            }
        }, 90000)
    };
    if (room.timeout.unref) room.timeout.unref();
    global.suitGames[id] = room;

    const msg = formatCard({
        icon: '✊',
        title: 'TANTANGAN SUIT PVP',
        body: `@${cleanNum(m.sender)} menantang @${cleanNum(target)} adu Suit!\n\n✅ Ketik *terima* / *gas* untuk menerima\n❌ Ketik *tolak* untuk menolak\n⏱️ Batas waktu: 90 detik`
    });
    return Dinz.sendMessage(m.chat, { text: msg, mentions: [m.sender, target] }, { quoted: m });
}

async function handleSuitAnswer(Dinz, m, rawText) {
    const lower = rawText.trim().toLowerCase();
    const room = Object.values(global.suitGames).find(
        (r) => (r.chat === m.chat || !m.isGroup) && (r.p1 === m.sender || r.p2 === m.sender)
    );
    if (!room) return false;

    if (room.status === 'waiting' && m.chat === room.chat && m.sender === room.p2) {
        if (/^(terima|acc|accept|gas|ok|oke|iya|yoi)$/.test(lower)) {
            clearTimeout(room.timeout);
            room.status = 'playing';
            await Dinz.sendMessage(room.chat, {
                text: `✊✌️✋ *SUIT DIMULAI!*\n@${cleanNum(room.p1)} vs @${cleanNum(room.p2)}\n\n📩 Cek *Private Chat* bot lalu ketik *batu*, *gunting*, atau *kertas*!`,
                mentions: [room.p1, room.p2]
            }, { quoted: m });

            const pmText = `✊✌️✋ *SUIT PVP - PILIH JAWABAN*\nKetik salah satu:\n◦ *batu* ✊\n◦ *gunting* ✌️\n◦ *kertas* ✋`;
            await Dinz.sendMessage(room.p1, { text: pmText }).catch(() => {});
            await Dinz.sendMessage(room.p2, { text: pmText }).catch(() => {});

            room.timeout = setTimeout(() => {
                if (!global.suitGames[room.id]) return;
                delete global.suitGames[room.id];
                Dinz.sendMessage(room.chat, { text: '⏱️ Waktu memilih Suit habis, permainan dibatalkan.' }).catch(() => {});
            }, 90000);
            if (room.timeout.unref) room.timeout.unref();
            return true;
        }
        if (/^(tolak|gamau|no|tidak|gabisa)$/.test(lower)) {
            clearTimeout(room.timeout);
            delete global.suitGames[room.id];
            await Dinz.sendMessage(room.chat, {
                text: `❌ @${cleanNum(room.p2)} menolak tantangan Suit.`,
                mentions: [room.p2]
            }, { quoted: m });
            return true;
        }
    }

    if (room.status === 'playing' && !m.isGroup && /^(batu|gunting|kertas)$/.test(lower)) {
        if (m.sender === room.p1 && !room.c1) {
            room.c1 = lower;
            await Dinz.sendMessage(m.chat, { text: `✅ Kamu memilih *${lower}* ${SUIT_EMOJI[lower]}. Menunggu lawan...` }, { quoted: m });
        } else if (m.sender === room.p2 && !room.c2) {
            room.c2 = lower;
            await Dinz.sendMessage(m.chat, { text: `✅ Kamu memilih *${lower}* ${SUIT_EMOJI[lower]}. Menunggu lawan...` }, { quoted: m });
        } else {
            return false;
        }

        if (room.c1 && room.c2) {
            clearTimeout(room.timeout);
            delete global.suitGames[room.id];

            let winner = null;
            if (room.c1 !== room.c2) {
                const p1Wins = (room.c1 === 'batu' && room.c2 === 'gunting')
                    || (room.c1 === 'gunting' && room.c2 === 'kertas')
                    || (room.c1 === 'kertas' && room.c2 === 'batu');
                winner = p1Wins ? room.p1 : room.p2;
                addReward(winner, { money: 1500, exp: 200, limit: 1 });
            }

            const resultBody = `@${cleanNum(room.p1)} : ${SUIT_EMOJI[room.c1]} *${room.c1}*\n@${cleanNum(room.p2)} : ${SUIT_EMOJI[room.c2]} *${room.c2}*\n\n`
                + (winner ? `🏆 Pemenang: @${cleanNum(winner)}\n🎁 Hadiah: +Rp 1.500 | +200 EXP | +1 Limit` : '🤝 Hasil: *SERI!*');
            await Dinz.sendMessage(room.chat, {
                text: formatCard({ icon: '✊', title: 'HASIL SUIT PVP', body: resultBody }),
                mentions: [room.p1, room.p2]
            });
        }
        return true;
    }

    return false;
}

const BJ_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const BJ_SUITS = ['♠', '♥', '♦', '♣'];

function newBjShoe() {
    const deck = [];
    for (let d = 0; d < 4; d++) {
        for (const r of BJ_RANKS) for (const s of BJ_SUITS) deck.push({ r, s });
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function bjValue(cards) {
    let total = 0;
    let aces = 0;
    for (const c of cards) {
        if (c.r === 'A') { aces++; total += 11; }
        else if (['J', 'Q', 'K'].includes(c.r)) total += 10;
        else total += Number(c.r);
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

function bjTableText(game, reveal = false) {
    const fmt = (c) => `${c.r}${c.s}`;
    const dealerStr = reveal
        ? `${game.dealer.map(fmt).join(' ')} = *${bjValue(game.dealer)}*`
        : `${fmt(game.dealer[0])} 🂠`;
    const cur = game.players[game.turn];
    const rows = game.players.map((p) => {
        const mark = !reveal && p === cur && p.state === 'play' ? '▸' : '•';
        const tag = p.state === 'bust' ? ' 💥 BUST' : p.state === 'bj' ? ' 🌟 BJ' : p.state === 'stand' ? ' ✋ STAND' : '';
        return `${mark} @${cleanNum(p.jid)}: ${p.cards.map(fmt).join(' ')} = *${bjValue(p.cards)}*${tag}${p.doubled ? ' (x2)' : ''}`;
    }).join('\n');

    return formatCard({
        icon: '🃏',
        title: 'BLACKJACK TABLE',
        rows: [
            { label: 'Taruhan', value: `Rp ${formatNumber(game.bet)}` },
            { label: 'Dealer', value: dealerStr }
        ],
        body: rows
    });
}

function dropBj(game) {
    if (game.timer) clearTimeout(game.timer);
    if (game.lobbyTimer) clearTimeout(game.lobbyTimer);
    if (global.bjGames.get(game.jid) === game) global.bjGames.delete(game.jid);
}

async function finishBj(game) {
    if (game.timer) clearTimeout(game.timer);
    const dealerNat = game.dealer.length === 2 && bjValue(game.dealer) === 21;
    if (game.players.some((p) => p.state !== 'bust') && !dealerNat) {
        while (bjValue(game.dealer) < 17) game.dealer.push(game.shoe.pop());
    }
    const dv = bjValue(game.dealer);
    const dBust = dv > 21;

    const lines = [];
    for (const p of game.players) {
        const pv = bjValue(p.cards);
        let res = 'lose';
        if (p.state === 'bust') res = 'lose';
        else if (p.state === 'bj') res = dealerNat ? 'push' : 'bj';
        else if (dealerNat) res = 'lose';
        else if (dBust || pv > dv) res = 'win';
        else if (pv === dv) res = 'push';

        let delta = 0;
        if (res === 'bj') delta = Math.floor(p.bet * 1.5);
        else if (res === 'win') delta = p.bet;
        else if (res === 'lose') delta = -p.bet;

        addReward(p.jid, { money: delta, exp: delta > 0 ? 150 : 20 });
        const label = { bj: '🌟 Blackjack', win: '✅ Menang', push: '🤝 Seri', lose: p.state === 'bust' ? '💥 Bust' : '❌ Kalah' }[res];
        lines.push(`${label} @${cleanNum(p.jid)}: ${delta >= 0 ? '+' : ''}Rp ${formatNumber(delta)}`);
    }

    const txt = `${bjTableText(game, true)}\n\n${dealerNat ? '🃏 Dealer Blackjack!' : dBust ? '🃏 Dealer Bust!' : `🃏 Dealer berhenti di ${dv}`}\n${lines.join('\n')}`;
    const mentions = game.players.map((p) => p.jid);
    dropBj(game);
    return game.Dinz.sendMessage(game.jid, { text: txt, mentions }).catch(() => {});
}

async function nextBjTurn(game) {
    if (game.timer) clearTimeout(game.timer);
    const idx = game.players.findIndex((p) => p.state === 'play');
    if (idx === -1) return finishBj(game);

    game.turn = idx;
    const p = game.players[idx];
    const canDouble = p.cards.length === 2 && !p.doubled;
    const opts = canDouble ? '`bj hit`, `bj stand`, `bj double`' : '`bj hit`, `bj stand`';

    await game.Dinz.sendMessage(game.jid, {
        text: `${bjTableText(game)}\n\n👉 Giliran @${cleanNum(p.jid)} | Ketik: ${opts} (60 dtk)`,
        mentions: game.players.map((x) => x.jid)
    }).catch(() => {});

    game.timer = setTimeout(() => {
        if (global.bjGames.get(game.jid) !== game || game.turn !== idx || p.state !== 'play') return;
        p.state = 'stand';
        nextBjTurn(game).catch(() => {});
    }, 60000);
    if (game.timer.unref) game.timer.unref();
}

async function handleBlackjackCmd(Dinz, m, command, args, usedPrefix, isCreator) {
    if (!m.isGroup) return Dinz.sendMessage(m.chat, { text: global.mess.group }, { quoted: m });
    let sub = (args[0] || '').toLowerCase();
    if (command.startsWith('bj-')) sub = command.slice(3);

    const game = global.bjGames.get(m.chat);
    const canManage = (g) => m.isAdmin || isCreator || g.host === m.sender;

    if (!sub || sub === 'help') {
        return Dinz.sendMessage(m.chat, {
            text: formatCard({
                icon: '🃏',
                title: 'BLACKJACK MULTIPLAYER',
                body: `Kalahkan bandar mendekati 21 tanpa lewat!\n\n◦ \`${usedPrefix}bj <taruhan>\` - Buka meja (100 - 500.000)\n◦ \`${usedPrefix}bj join\` - Ikut meja (maks 6 orang)\n◦ \`${usedPrefix}bj start\` - Mulai ronde\n◦ \`${usedPrefix}bj hit\` - Ambil kartu\n◦ \`${usedPrefix}bj stand\` - Tahan kartu\n◦ \`${usedPrefix}bj double\` - Taruhan x2 + 1 kartu\n◦ \`${usedPrefix}bj stop\` - Batalkan meja`
            })
        }, { quoted: m });
    }

    if (!['join', 'start', 'hit', 'stand', 'double', 'stop'].includes(sub)) {
        if (game) {
            return Dinz.sendMessage(m.chat, {
                text: `🃏 Meja Blackjack sudah aktif (${game.status.toUpperCase()}).\nKetik \`${usedPrefix}bj join\` atau \`${usedPrefix}bj start\`.`
            }, { quoted: m });
        }
        const bet = parseInt(sub.replace(/[^0-9]/g, ''), 10);
        if (!bet || bet < 100 || bet > 500000) {
            return Dinz.sendMessage(m.chat, { text: `❌ Taruhan harus antara Rp 100 sampai Rp 500.000. Contoh: \`${usedPrefix}bj 1000\`` }, { quoted: m });
        }
        const u = getUserRecord(m.sender);
        if (u.money < bet) {
            return Dinz.sendMessage(m.chat, { text: `❌ Saldo RPG tidak cukup! Saldomu: Rp ${formatNumber(u.money)}` }, { quoted: m });
        }

        const g = {
            jid: m.chat,
            Dinz,
            bet,
            host: m.sender,
            status: 'lobby',
            turn: 0,
            dealer: [],
            shoe: [],
            players: [{ jid: m.sender, cards: [], bet, state: 'play', doubled: false }]
        };
        g.lobbyTimer = setTimeout(() => {
            if (global.bjGames.get(m.chat) === g && g.status === 'lobby') {
                dropBj(g);
                Dinz.sendMessage(m.chat, { text: '⏰ Meja Blackjack ditutup otomatis (timeout 5 menit).' }).catch(() => {});
            }
        }, 5 * 60000);
        if (g.lobbyTimer.unref) g.lobbyTimer.unref();
        global.bjGames.set(m.chat, g);

        return Dinz.sendMessage(m.chat, {
            text: formatCard({
                icon: '🃏',
                title: 'MEJA BLACKJACK DIBUKA',
                rows: [
                    { label: 'Host', value: `@${cleanNum(m.sender)}` },
                    { label: 'Taruhan', value: `Rp ${formatNumber(bet)}` }
                ],
                body: `Ketik \`${usedPrefix}bj join\` untuk ikut, atau \`${usedPrefix}bj start\` untuk mulai.`
            }),
            mentions: [m.sender]
        }, { quoted: m });
    }

    if (!game) return Dinz.sendMessage(m.chat, { text: `❌ Belum ada meja Blackjack. Ketik \`${usedPrefix}bj 1000\` untuk membuka.` }, { quoted: m });

    if (sub === 'stop') {
        if (!canManage(game)) return Dinz.sendMessage(m.chat, { text: '❌ Hanya host atau admin yang bisa menutup meja.' }, { quoted: m });
        dropBj(game);
        return Dinz.sendMessage(m.chat, { text: '🛑 Meja Blackjack dibatalkan.' }, { quoted: m });
    }

    if (sub === 'join') {
        if (game.status !== 'lobby') return Dinz.sendMessage(m.chat, { text: '❌ Ronde sedang berjalan.' }, { quoted: m });
        if (game.players.some((p) => p.jid === m.sender)) return Dinz.sendMessage(m.chat, { text: '❌ Kamu sudah bergabung.' }, { quoted: m });
        if (game.players.length >= 6) return Dinz.sendMessage(m.chat, { text: '❌ Meja penuh (maks 6 pemain).' }, { quoted: m });
        const u = getUserRecord(m.sender);
        if (u.money < game.bet) return Dinz.sendMessage(m.chat, { text: `❌ Saldo kurang! Butuh Rp ${formatNumber(game.bet)}.` }, { quoted: m });
        game.players.push({ jid: m.sender, cards: [], bet: game.bet, state: 'play', doubled: false });
        return Dinz.sendMessage(m.chat, {
            text: `✅ @${cleanNum(m.sender)} bergabung ke meja Blackjack (${game.players.length}/6).`,
            mentions: [m.sender]
        }, { quoted: m });
    }

    if (sub === 'start') {
        if (game.status !== 'lobby') return Dinz.sendMessage(m.chat, { text: '❌ Ronde sudah dimulai.' }, { quoted: m });
        if (!canManage(game)) return Dinz.sendMessage(m.chat, { text: '❌ Hanya host atau admin yang bisa memulai.' }, { quoted: m });
        if (game.lobbyTimer) clearTimeout(game.lobbyTimer);
        game.status = 'play';
        game.shoe = newBjShoe();
        game.dealer = [game.shoe.pop(), game.shoe.pop()];
        for (const p of game.players) {
            p.cards = [game.shoe.pop(), game.shoe.pop()];
            p.state = bjValue(p.cards) === 21 ? 'bj' : 'play';
        }
        if (bjValue(game.dealer) === 21) {
            for (const p of game.players) if (p.state === 'play') p.state = 'stand';
            return finishBj(game);
        }
        return nextBjTurn(game);
    }

    if (['hit', 'stand', 'double'].includes(sub)) {
        if (game.status !== 'play') return Dinz.sendMessage(m.chat, { text: '❌ Ronde belum dimulai.' }, { quoted: m });
        const cur = game.players[game.turn];
        if (!cur || cur.jid !== m.sender) return Dinz.sendMessage(m.chat, { text: '⏳ Belum giliranmu!' }, { quoted: m });

        if (sub === 'double') {
            if (cur.cards.length !== 2 || cur.doubled) return Dinz.sendMessage(m.chat, { text: '❌ Double hanya bisa di 2 kartu pertama.' }, { quoted: m });
            if (getUserRecord(m.sender).money < cur.bet * 2) return Dinz.sendMessage(m.chat, { text: '❌ Saldo tidak cukup untuk Double!' }, { quoted: m });
            cur.bet *= 2;
            cur.doubled = true;
        }
        if (sub === 'hit' || sub === 'double') {
            cur.cards.push(game.shoe.pop());
            const v = bjValue(cur.cards);
            if (v > 21) cur.state = 'bust';
            else if (v === 21 || sub === 'double') cur.state = 'stand';
        } else {
            cur.state = 'stand';
        }
        return nextBjTurn(game);
    }
}

const WW_ROLES = {
    werewolf: { emoji: '🐺', name: 'Werewolf', team: 'wolf', cmd: 'wwkill' },
    seer: { emoji: '🔮', name: 'Seer', team: 'village', cmd: 'wwsee' },
    guardian: { emoji: '🛡️', name: 'Guardian', team: 'village', cmd: 'wwprotect' },
    sorcerer: { emoji: '🧙', name: 'Sorcerer', team: 'wolf', cmd: 'wwsorcerer' },
    villager: { emoji: '👨‍🌾', name: 'Villager', team: 'village', cmd: null }
};

function assignWwRoles(count) {
    const roles = ['werewolf', 'seer', 'guardian'];
    if (count >= 6) roles.push('werewolf');
    if (count >= 9) roles.push('sorcerer');
    while (roles.length < count) roles.push('villager');
    for (let i = roles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    return roles;
}

function checkWwWinner(game) {
    const alive = game.players.filter((p) => p.alive);
    const wolves = alive.filter((p) => p.role === 'werewolf').length;
    const villagers = alive.length - wolves;
    if (wolves === 0) return 'village';
    if (wolves >= villagers) return 'wolf';
    return null;
}

async function endWwGame(game, winTeam) {
    if (game.timer) clearTimeout(game.timer);
    delete global.wwGames[game.chat];
    const winners = game.players.filter((p) => WW_ROLES[p.role].team === winTeam);
    for (const w of winners) addReward(w.jid, { money: 4000, exp: 800, limit: 2 });

    const roster = game.players
        .map((p, i) => `${i + 1}. ${WW_ROLES[p.role].emoji} @${cleanNum(p.jid)} (${WW_ROLES[p.role].name}) ${p.alive ? '💚' : '💀'}`)
        .join('\n');

    const title = winTeam === 'village' ? 'WARGA DESA MENANG!' : 'WEREWOLF MENANG!';
    await game.Dinz.sendMessage(game.chat, {
        text: formatCard({
            icon: winTeam === 'village' ? '🎉' : '🐺',
            title,
            body: `${roster}\n\n🎁 Pemenang mendapat +Rp 4.000 | +800 EXP | +2 Limit!`
        }),
        mentions: game.players.map((p) => p.jid)
    }).catch(() => {});
}

async function startWwNight(game) {
    game.phase = 'night';
    game.round += 1;
    game.nightActions = { kill: null, protect: null, seerUsed: false, sorcererUsed: false };

    const aliveList = game.players
        .map((p, i) => `${i + 1}. @${cleanNum(p.jid)} ${p.alive ? '💚' : '💀'}`)
        .join('\n');

    await game.Dinz.sendMessage(game.chat, {
        text: formatCard({
            icon: '🌙',
            title: `MALAM KE-${game.round} TIBA`,
            body: `Semua warga tidur. Peran khusus silakan kirim aksi lewat *PM Bot* dalam 55 detik!\n\n${aliveList}`
        }),
        mentions: game.players.map((p) => p.jid)
    }).catch(() => {});

    for (const p of game.players) {
        if (!p.alive) continue;
        const r = WW_ROLES[p.role];
        if (!r.cmd) continue;
        const targets = game.players
            .map((x, i) => (x.alive ? `${i + 1}. @${cleanNum(x.jid)}` : null))
            .filter(Boolean)
            .join('\n');
        await game.Dinz.sendMessage(p.jid, {
            text: `🌙 *MALAM KE-${game.round} (${r.emoji} ${r.name})*\nKetik \`${game.prefix}${r.cmd} <nomor>\` di sini!\n\n${targets}`,
            mentions: game.players.map((x) => x.jid)
        }).catch(() => {});
    }

    if (game.timer) clearTimeout(game.timer);
    game.timer = setTimeout(() => resolveWwNight(game).catch(() => {}), 55000);
    if (game.timer.unref) game.timer.unref();
}

async function resolveWwNight(game) {
    if (global.wwGames[game.chat] !== game) return;
    let morningReport = '☀️ Tidak ada korban jiwa malam ini!';
    const mentions = [];

    if (game.nightActions.kill !== null) {
        const victim = game.players[game.nightActions.kill];
        if (victim && victim.alive) {
            if (game.nightActions.protect === game.nightActions.kill) {
                morningReport = `🛡️ Guardian berhasil menyelamatkan @${cleanNum(victim.jid)} dari serangan Werewolf!`;
                mentions.push(victim.jid);
            } else {
                victim.alive = false;
                morningReport = `🩸 @${cleanNum(victim.jid)} (${WW_ROLES[victim.role].emoji} ${WW_ROLES[victim.role].name}) ditemukan tewas diterkam Werewolf!`;
                mentions.push(victim.jid);
            }
        }
    }

    const winner = checkWwWinner(game);
    if (winner) {
        await game.Dinz.sendMessage(game.chat, { text: morningReport, mentions }).catch(() => {});
        return endWwGame(game, winner);
    }

    game.phase = 'day';
    game.votes = {};
    const aliveList = game.players
        .map((p, i) => (p.alive ? `${i + 1}. @${cleanNum(p.jid)}` : `${i + 1}. ~@${cleanNum(p.jid)}~ 💀`))
        .join('\n');

    await game.Dinz.sendMessage(game.chat, {
        text: formatCard({
            icon: '☀️',
            title: `PAGI KE-${game.round} - DISKUSI & VOTE`,
            body: `${morningReport}\n\n${aliveList}\n\n🗳️ Ketik \`${game.prefix}ww vote <nomor>\` untuk mengeksekusi tersangka (75 dtk)!`
        }),
        mentions: game.players.map((p) => p.jid)
    }).catch(() => {});

    if (game.timer) clearTimeout(game.timer);
    game.timer = setTimeout(() => resolveWwVote(game).catch(() => {}), 75000);
    if (game.timer.unref) game.timer.unref();
}

async function resolveWwVote(game) {
    if (global.wwGames[game.chat] !== game) return;
    const tally = {};
    for (const targetIdx of Object.values(game.votes || {})) {
        tally[targetIdx] = (tally[targetIdx] || 0) + 1;
    }
    const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    let report = '⚖️ Tidak ada yang divote keluar hari ini.';
    const mentions = [];

    if (entries.length > 0 && (entries.length === 1 || entries[0][1] > entries[1][1])) {
        const idx = Number(entries[0][0]);
        const target = game.players[idx];
        if (target && target.alive) {
            target.alive = false;
            report = `⚖️ Warga memutuskan mengeksekusi @${cleanNum(target.jid)} (${entries[0][1]} suara).\nPerannya adalah: *${WW_ROLES[target.role].emoji} ${WW_ROLES[target.role].name}*!`;
            mentions.push(target.jid);
        }
    }

    await game.Dinz.sendMessage(game.chat, { text: report, mentions }).catch(() => {});
    const winner = checkWwWinner(game);
    if (winner) return endWwGame(game, winner);
    return startWwNight(game);
}

async function handleWerewolfCmd(Dinz, m, args, usedPrefix, isCreator) {
    if (!m.isGroup) return Dinz.sendMessage(m.chat, { text: global.mess.group }, { quoted: m });
    const sub = (args[0] || '').toLowerCase();
    const game = global.wwGames[m.chat];

    if (!sub || sub === 'help') {
        return Dinz.sendMessage(m.chat, {
            text: formatCard({
                icon: '🐺',
                title: 'WEREWOLF GAME',
                body: `Game deduksi sosial seru bersama grup (4 - 15 pemain).\n\n◦ \`${usedPrefix}ww create\` - Buat room baru\n◦ \`${usedPrefix}ww join\` - Gabung ke room\n◦ \`${usedPrefix}ww start\` - Mulai permainan\n◦ \`${usedPrefix}ww vote <no>\` - Vote saat siang\n◦ \`${usedPrefix}ww player\` - Daftar pemain\n◦ \`${usedPrefix}ww exit\` - Keluar dari room\n◦ \`${usedPrefix}ww delete\` - Hapus room (host/admin)`
            })
        }, { quoted: m });
    }

    if (sub === 'create') {
        if (game) return Dinz.sendMessage(m.chat, { text: '❌ Sudah ada room Werewolf di grup ini.' }, { quoted: m });
        global.wwGames[m.chat] = {
            chat: m.chat,
            Dinz,
            prefix: usedPrefix,
            host: m.sender,
            phase: 'waiting',
            round: 0,
            players: [{ jid: m.sender, role: null, alive: true }],
            votes: {},
            nightActions: {},
            timer: null
        };
        return Dinz.sendMessage(m.chat, {
            text: formatCard({
                icon: '🐺',
                title: 'ROOM WEREWOLF DIBUAT',
                rows: [
                    { label: 'Host', value: `@${cleanNum(m.sender)}` },
                    { label: 'Pemain', value: '1/15 (Min 4)' }
                ],
                body: `Ketik \`${usedPrefix}ww join\` untuk bergabung!`
            }),
            mentions: [m.sender]
        }, { quoted: m });
    }

    if (!game) return Dinz.sendMessage(m.chat, { text: `❌ Belum ada room Werewolf. Ketik \`${usedPrefix}ww create\`.` }, { quoted: m });

    if (sub === 'join') {
        if (game.phase !== 'waiting') return Dinz.sendMessage(m.chat, { text: '❌ Game sudah berjalan!' }, { quoted: m });
        if (game.players.some((p) => p.jid === m.sender)) return Dinz.sendMessage(m.chat, { text: '❌ Kamu sudah bergabung.' }, { quoted: m });
        if (game.players.length >= 15) return Dinz.sendMessage(m.chat, { text: '❌ Room penuh (maks 15 pemain).' }, { quoted: m });
        game.players.push({ jid: m.sender, role: null, alive: true });
        return Dinz.sendMessage(m.chat, {
            text: `✅ @${cleanNum(m.sender)} bergabung! Total pemain: *${game.players.length}/15*${game.players.length >= 4 ? ` (Siap mulai: \`${usedPrefix}ww start\`)` : ''}`,
            mentions: [m.sender]
        }, { quoted: m });
    }

    if (sub === 'exit') {
        if (game.phase !== 'waiting') return Dinz.sendMessage(m.chat, { text: '❌ Tidak bisa keluar saat game sudah dimulai.' }, { quoted: m });
        const idx = game.players.findIndex((p) => p.jid === m.sender);
        if (idx === -1) return Dinz.sendMessage(m.chat, { text: '❌ Kamu tidak terdaftar di room.' }, { quoted: m });
        game.players.splice(idx, 1);
        if (game.players.length === 0) delete global.wwGames[m.chat];
        else if (game.host === m.sender) game.host = game.players[0].jid;
        return Dinz.sendMessage(m.chat, { text: `🚪 @${cleanNum(m.sender)} keluar dari room Werewolf.`, mentions: [m.sender] }, { quoted: m });
    }

    if (sub === 'delete' || sub === 'stop') {
        if (game.host !== m.sender && !m.isAdmin && !isCreator) {
            return Dinz.sendMessage(m.chat, { text: '❌ Hanya host atau admin yang dapat menghapus room.' }, { quoted: m });
        }
        if (game.timer) clearTimeout(game.timer);
        delete global.wwGames[m.chat];
        return Dinz.sendMessage(m.chat, { text: '🛑 Room Werewolf dihapus.' }, { quoted: m });
    }

    if (sub === 'player' || sub === 'players' || sub === 'list') {
        const list = game.players.map((p, i) => `${i + 1}. @${cleanNum(p.jid)} ${p.alive ? '💚' : '💀'}`).join('\n');
        return Dinz.sendMessage(m.chat, {
            text: formatCard({ icon: '👥', title: `PEMAIN WEREWOLF (${game.phase.toUpperCase()})`, body: list }),
            mentions: game.players.map((p) => p.jid)
        }, { quoted: m });
    }

    if (sub === 'start') {
        if (game.phase !== 'waiting') return Dinz.sendMessage(m.chat, { text: '❌ Game sudah dimulai.' }, { quoted: m });
        if (game.host !== m.sender && !m.isAdmin && !isCreator) return Dinz.sendMessage(m.chat, { text: '❌ Hanya host/admin yang bisa memulai.' }, { quoted: m });
        if (game.players.length < 4) return Dinz.sendMessage(m.chat, { text: '❌ Minimal 4 pemain untuk memulai Werewolf!' }, { quoted: m });

        const roles = assignWwRoles(game.players.length);
        game.players.forEach((p, i) => { p.role = roles[i]; });

        for (const p of game.players) {
            const r = WW_ROLES[p.role];
            await Dinz.sendMessage(p.jid, {
                text: `🎭 *PERAN WEREWOLF KAMU*\nPeran: *${r.emoji} ${r.name}*\nTim: *${r.team === 'wolf' ? 'Werewolf' : 'Warga Desa'}*${r.cmd ? `\nPerintah malam: \`${usedPrefix}${r.cmd} <nomor>\`` : '\nDiskusikan dan vote Werewolf saat siang hari!'}`
            }).catch(() => {});
        }
        return startWwNight(game);
    }

    if (sub === 'vote') {
        if (game.phase !== 'day') return Dinz.sendMessage(m.chat, { text: '❌ Voting hanya bisa dilakukan saat siang hari!' }, { quoted: m });
        const voter = game.players.find((p) => p.jid === m.sender && p.alive);
        if (!voter) return Dinz.sendMessage(m.chat, { text: '❌ Hanya pemain yang masih hidup yang bisa vote.' }, { quoted: m });
        const targetIdx = parseInt(args[1], 10) - 1;
        const target = game.players[targetIdx];
        if (!target || !target.alive) return Dinz.sendMessage(m.chat, { text: '❌ Nomor target tidak valid atau sudah mati.' }, { quoted: m });

        game.votes[m.sender] = targetIdx;
        await Dinz.sendMessage(m.chat, {
            text: `🗳️ @${cleanNum(m.sender)} memilih @${cleanNum(target.jid)}!`,
            mentions: [m.sender, target.jid]
        }, { quoted: m });

        const aliveCount = game.players.filter((p) => p.alive).length;
        if (Object.keys(game.votes).length >= aliveCount) {
            return resolveWwVote(game);
        }
    }
}

async function handleWerewolfNightAction(Dinz, m, command, args) {
    const game = Object.values(global.wwGames).find(
        (g) => g.phase === 'night' && g.players.some((p) => p.jid === m.sender && p.alive)
    );
    if (!game) return Dinz.sendMessage(m.chat, { text: '❌ Kamu tidak sedang dalam fase malam Werewolf.' }, { quoted: m });
    const player = game.players.find((p) => p.jid === m.sender);
    const targetIdx = parseInt(args[0], 10) - 1;
    const target = game.players[targetIdx];
    if (!target || !target.alive) return Dinz.sendMessage(m.chat, { text: '❌ Nomor pemain tidak valid atau sudah gugur.' }, { quoted: m });

    if (command === 'wwkill') {
        if (player.role !== 'werewolf') return Dinz.sendMessage(m.chat, { text: '❌ Hanya Werewolf yang bisa memakai wwkills.' }, { quoted: m });
        game.nightActions.kill = targetIdx;
        return Dinz.sendMessage(m.chat, { text: `🐺 Target serangan malam ini ditetapkan ke #${targetIdx + 1} (@${cleanNum(target.jid)}).`, mentions: [target.jid] }, { quoted: m });
    }
    if (command === 'wwprotect') {
        if (player.role !== 'guardian') return Dinz.sendMessage(m.chat, { text: '❌ Hanya Guardian yang bisa melindungi pemain.' }, { quoted: m });
        game.nightActions.protect = targetIdx;
        return Dinz.sendMessage(m.chat, { text: `🛡️ Kamu melindungi #${targetIdx + 1} (@${cleanNum(target.jid)}) malam ini.`, mentions: [target.jid] }, { quoted: m });
    }
    if (command === 'wwsee') {
        if (player.role !== 'seer') return Dinz.sendMessage(m.chat, { text: '❌ Hanya Seer yang bisa menerawang peran.' }, { quoted: m });
        if (game.nightActions.seerUsed) return Dinz.sendMessage(m.chat, { text: '❌ Kamu sudah menggunakan penerawangan malam ini.' }, { quoted: m });
        game.nightActions.seerUsed = true;
        const r = WW_ROLES[target.role];
        return Dinz.sendMessage(m.chat, { text: `🔮 Hasil terawangan #${targetIdx + 1} (@${cleanNum(target.jid)}): *${r.emoji} ${r.name}*!`, mentions: [target.jid] }, { quoted: m });
    }
    if (command === 'wwsorcerer') {
        if (player.role !== 'sorcerer') return Dinz.sendMessage(m.chat, { text: '❌ Hanya Sorcerer yang bisa memakai skill ini.' }, { quoted: m });
        if (game.nightActions.sorcererUsed) return Dinz.sendMessage(m.chat, { text: '❌ Kamu sudah memakai skill malam ini.' }, { quoted: m });
        game.nightActions.sorcererUsed = true;
        const isSeer = target.role === 'seer';
        return Dinz.sendMessage(m.chat, { text: `🧙 Hasil ramalan #${targetIdx + 1}: ${isSeer ? '*Dia adalah SEER! 🔮*' : 'Bukan Seer.'}` }, { quoted: m });
    }
}

const UT_SNAKES_LADDERS = {
    4: 25, 13: 46, 33: 49, 42: 63, 50: 69, 62: 81, 74: 92,
    27: 5, 40: 3, 43: 18, 54: 31, 66: 45, 76: 58, 89: 53, 99: 41
};
const UT_COLORS = ['#ef4444', '#eab308', '#22c55e', '#3b82f6'];
const UT_EMOJIS = ['🔴', '🟡', '🟢', '🔵'];

function cellCenter(pos, size = 60, pad = 20) {
    const row = Math.floor((pos - 1) / 10);
    const col = row % 2 === 0 ? (pos - 1) % 10 : 9 - ((pos - 1) % 10);
    return { x: pad + col * size + size / 2, y: pad + (9 - row) * size + size / 2 };
}

function renderUlarTanggaBoard(players) {
    try {
        const { createCanvas } = require('canvas');
        const cell = 60;
        const pad = 20;
        const canvas = createCanvas(cell * 10 + pad * 2, cell * 10 + pad * 2);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let pos = 1; pos <= 100; pos++) {
            const row = Math.floor((pos - 1) / 10);
            const col = row % 2 === 0 ? (pos - 1) % 10 : 9 - ((pos - 1) % 10);
            const x = pad + col * cell;
            const y = pad + (9 - row) * cell;
            ctx.fillStyle = (row + col) % 2 === 0 ? '#1e293b' : '#334155';
            ctx.fillRect(x, y, cell, cell);
            ctx.strokeStyle = '#475569';
            ctx.strokeRect(x, y, cell, cell);

            ctx.fillStyle = '#cbd5e1';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText(String(pos), x + 5, y + 16);
        }

        for (const [fromStr, to] of Object.entries(UT_SNAKES_LADDERS)) {
            const from = Number(fromStr);
            const a = cellCenter(from, cell, pad);
            const b = cellCenter(to, cell, pad);
            const isLadder = to > from;
            ctx.strokeStyle = isLadder ? '#22c55e' : '#f43f5e';
            ctx.lineWidth = isLadder ? 5 : 4;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }

        const offsets = [[-12, -10], [12, -10], [-12, 12], [12, 12]];
        players.forEach((p, idx) => {
            const pt = cellCenter(p.pos, cell, pad);
            const [ox, oy] = offsets[idx % 4];
            ctx.beginPath();
            ctx.arc(pt.x + ox, pt.y + oy, 11, 0, Math.PI * 2);
            ctx.fillStyle = UT_COLORS[idx % 4];
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`P${idx + 1}`, pt.x + ox, pt.y + oy + 4);
            ctx.textAlign = 'left';
        });

        return canvas.toBuffer('image/png');
    } catch {
        return null;
    }
}

async function handleUlarTanggaCmd(Dinz, m, args, usedPrefix, isCreator) {
    if (!m.isGroup) return Dinz.sendMessage(m.chat, { text: global.mess.group }, { quoted: m });
    const sub = (args[0] || '').toLowerCase();
    const room = global.utGames[m.chat];

    if (!sub || sub === 'help') {
        return Dinz.sendMessage(m.chat, {
            text: formatCard({
                icon: '🎲',
                title: 'ULAR TANGGA VISUAL',
                body: `Main ular tangga hingga 4 pemain dengan papan visual!\n\n◦ \`${usedPrefix}ut create\` - Buat room\n◦ \`${usedPrefix}ut join\` - Gabung (maks 4)\n◦ \`${usedPrefix}ut start\` - Mulai game\n◦ Ketik *kocok* saat giliranmu untuk lempar dadu\n◦ \`${usedPrefix}ut delete\` - Hapus room`
            })
        }, { quoted: m });
    }

    if (sub === 'create') {
        if (room) return Dinz.sendMessage(m.chat, { text: '❌ Sudah ada room Ular Tangga aktif di grup ini.' }, { quoted: m });
        global.utGames[m.chat] = {
            chat: m.chat,
            host: m.sender,
            status: 'WAITING',
            turn: 0,
            players: [{ jid: m.sender, pos: 1 }]
        };
        return Dinz.sendMessage(m.chat, {
            text: formatCard({
                icon: '🎲',
                title: 'ROOM ULAR TANGGA',
                body: `Host: 🔴 @${cleanNum(m.sender)}\nPemain: 1/4\n\nKetik \`${usedPrefix}ut join\` untuk ikut, lalu \`${usedPrefix}ut start\`!`
            }),
            mentions: [m.sender]
        }, { quoted: m });
    }

    if (!room) return Dinz.sendMessage(m.chat, { text: `❌ Belum ada room Ular Tangga. Ketik \`${usedPrefix}ut create\`.` }, { quoted: m });

    if (sub === 'join') {
        if (room.status !== 'WAITING') return Dinz.sendMessage(m.chat, { text: '❌ Game sudah berjalan!' }, { quoted: m });
        if (room.players.some((p) => p.jid === m.sender)) return Dinz.sendMessage(m.chat, { text: '❌ Kamu sudah di room.' }, { quoted: m });
        if (room.players.length >= 4) return Dinz.sendMessage(m.chat, { text: '❌ Room penuh (maks 4 pemain).' }, { quoted: m });
        room.players.push({ jid: m.sender, pos: 1 });
        const list = room.players.map((p, i) => `${UT_EMOJIS[i]} @${cleanNum(p.jid)}`).join('\n');
        return Dinz.sendMessage(m.chat, {
            text: `✅ @${cleanNum(m.sender)} bergabung!\n\n${list}\n\nKetik \`${usedPrefix}ut start\` untuk mulai.`,
            mentions: room.players.map((p) => p.jid)
        }, { quoted: m });
    }

    if (sub === 'start') {
        if (room.status !== 'WAITING') return Dinz.sendMessage(m.chat, { text: '❌ Game sudah berjalan!' }, { quoted: m });
        if (room.host !== m.sender && !m.isAdmin && !isCreator) return Dinz.sendMessage(m.chat, { text: '❌ Hanya host/admin yang bisa memulai.' }, { quoted: m });
        if (room.players.length < 2) return Dinz.sendMessage(m.chat, { text: '❌ Minimal 2 pemain untuk mulai!' }, { quoted: m });
        room.status = 'PLAYING';
        room.turn = 0;

        const list = room.players.map((p, i) => `${UT_EMOJIS[i]} @${cleanNum(p.jid)} (Petak ${p.pos})`).join('\n');
        const caption = formatCard({
            icon: '🎲',
            title: 'ULAR TANGGA DIMULAI',
            body: `${list}\n\n🎯 Giliran: @${cleanNum(room.players[0].jid)}\nKetik *kocok* untuk melempar dadu!`
        });
        const img = renderUlarTanggaBoard(room.players);
        const mentions = room.players.map((p) => p.jid);
        return Dinz.sendMessage(m.chat, img ? { image: img, caption, mentions } : { text: caption, mentions }, { quoted: m });
    }

    if (sub === 'delete' || sub === 'stop') {
        if (room.host !== m.sender && !m.isAdmin && !isCreator) return Dinz.sendMessage(m.chat, { text: '❌ Hanya host/admin yang bisa menghapus.' }, { quoted: m });
        delete global.utGames[m.chat];
        return Dinz.sendMessage(m.chat, { text: '🛑 Room Ular Tangga dihapus.' }, { quoted: m });
    }
}

async function handleUlarTanggaRoll(Dinz, m, rawText) {
    const room = global.utGames[m.chat];
    if (!room || room.status !== 'PLAYING') return false;
    const lower = rawText.trim().toLowerCase();
    if (lower !== 'kocok' && lower !== 'roll' && lower !== 'dadu') return false;

    const cur = room.players[room.turn % room.players.length];
    if (cur.jid !== m.sender) {
        await Dinz.sendMessage(m.chat, { text: `⏳ Sekarang giliran @${cleanNum(cur.jid)}!`, mentions: [cur.jid] }, { quoted: m });
        return true;
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    const oldPos = cur.pos;
    let nextPos = oldPos + dice;
    if (nextPos > 100) nextPos = 100 - (nextPos - 100);

    let eventMsg = '';
    if (UT_SNAKES_LADDERS[nextPos]) {
        const dest = UT_SNAKES_LADDERS[nextPos];
        eventMsg = dest > nextPos
            ? `\n🪜 Naik tangga dari *${nextPos}* ke *${dest}*!`
            : `\n🐍 Digigit ular! Turun dari *${nextPos}* ke *${dest}*!`;
        nextPos = dest;
    }
    cur.pos = nextPos;

    const img = renderUlarTanggaBoard(room.players);
    const mentions = room.players.map((p) => p.jid);

    if (cur.pos === 100) {
        delete global.utGames[m.chat];
        addReward(cur.jid, { money: 3000, exp: 600, limit: 2 });
        const caption = formatCard({
            icon: '🏆',
            title: 'ULAR TANGGA SELESAI',
            body: `🎲 Dadu: *${dice}*\n🎉 @${cleanNum(cur.jid)} mencapai petak 100 dan MENANG!\n🎁 Hadiah: +Rp 3.000 | +600 EXP | +2 Limit`
        });
        await Dinz.sendMessage(m.chat, img ? { image: img, caption, mentions } : { text: caption, mentions }, { quoted: m });
        return true;
    }

    if (dice !== 6) room.turn = (room.turn + 1) % room.players.length;
    const nextPlayer = room.players[room.turn];
    const boardList = room.players.map((p, i) => `${UT_EMOJIS[i]} @${cleanNum(p.jid)}: *${p.pos}*`).join('\n');
    const caption = formatCard({
        icon: '🎲',
        title: `DADU: ${dice}`,
        body: `@${cleanNum(cur.jid)} maju *${oldPos} -> ${cur.pos}*${eventMsg}${dice === 6 ? '\n✨ Dapat angka 6! Lempar lagi!' : ''}\n\n${boardList}\n\n🎯 Giliran: @${cleanNum(nextPlayer.jid)} (ketik *kocok*)`
    });
    await Dinz.sendMessage(m.chat, img ? { image: img, caption, mentions } : { text: caption, mentions }, { quoted: m });
    return true;
}

const DUNGEON_TIERS = {
    easy: { name: 'Goblin Cave', boss: 'Goblin King', hp: 120, atk: 18, money: [1200, 2500], exp: [250, 450] },
    normal: { name: 'Cursed Crypt', boss: 'Shadow Lich', hp: 260, atk: 34, money: [3000, 6000], exp: [600, 1100] },
    hard: { name: 'Dragon Lair', boss: 'Crimson Wyrm', hp: 480, atk: 55, money: [7500, 15000], exp: [1500, 2600] }
};

async function handleDungeonCmd(Dinz, m, args, usedPrefix) {
    const tierKey = (args[0] || 'easy').toLowerCase();
    const tier = DUNGEON_TIERS[tierKey];
    if (!tier) {
        return Dinz.sendMessage(m.chat, {
            text: formatCard({
                icon: '⚔️',
                title: 'DUNGEON RAID',
                body: `Pilih tingkat kesulitan:\n◦ \`${usedPrefix}dungeon easy\` (Goblin Cave)\n◦ \`${usedPrefix}dungeon normal\` (Cursed Crypt)\n◦ \`${usedPrefix}dungeon hard\` (Dragon Lair)`
            })
        }, { quoted: m });
    }

    const lastRun = global.dungeonCooldowns[m.sender] || 0;
    const waitLeft = 180000 - (Date.now() - lastRun);
    if (waitLeft > 0) {
        return Dinz.sendMessage(m.chat, { text: `⏳ Tunggu *${Math.ceil(waitLeft / 1000)} detik* sebelum masuk Dungeon lagi.` }, { quoted: m });
    }
    global.dungeonCooldowns[m.sender] = Date.now();

    const u = getUserRecord(m.sender);
    const level = Math.max(1, Number(u.level || 1));
    const playerPower = 90 + level * 22 + Math.floor(Math.random() * 80);
    const bossPower = Math.floor(tier.hp * 0.45 + tier.atk * 2.2);
    const won = playerPower >= bossPower * 0.72;

    if (won) {
        const rewardMoney = tier.money[0] + Math.floor(Math.random() * (tier.money[1] - tier.money[0]));
        const rewardExp = tier.exp[0] + Math.floor(Math.random() * (tier.exp[1] - tier.exp[0]));
        addReward(m.sender, { money: rewardMoney, exp: rewardExp, limit: tierKey === 'hard' ? 2 : 1 });
        return Dinz.sendMessage(m.chat, {
            text: formatCard({
                icon: '⚔️',
                title: `DUNGEON CLEARED - ${tier.name.toUpperCase()}`,
                rows: [
                    { label: 'Adventurer', value: `@${cleanNum(m.sender)} (Lv.${level})` },
                    { label: 'Boss Dikalahkan', value: tier.boss },
                    { label: 'Power', value: `${playerPower} vs ${bossPower}` },
                    { label: 'Hadiah', value: `+Rp ${formatNumber(rewardMoney)} | +${formatNumber(rewardExp)} EXP` }
                ]
            }),
            mentions: [m.sender]
        }, { quoted: m });
    }

    const consolationExp = Math.floor(tier.exp[0] * 0.25);
    addReward(m.sender, { exp: consolationExp });
    return Dinz.sendMessage(m.chat, {
        text: formatCard({
            icon: '💀',
            title: `DUNGEON GAGAL - ${tier.name.toUpperCase()}`,
            rows: [
                { label: 'Boss', value: tier.boss },
                { label: 'Power', value: `${playerPower} vs ${bossPower}` },
                { label: 'EXP Hiburan', value: `+${consolationExp} EXP` }
            ],
            footer: 'Tingkatkan level RPG kamu lalu coba lagi!'
        }),
        mentions: [m.sender]
    }, { quoted: m });
}

async function handleExtraGameMessage(Dinz, m, bodyText) {
    if (!bodyText || typeof bodyText !== 'string') return false;
    if (await handleTicTacToeMove(Dinz, m, bodyText)) return true;
    if (await handleSuitAnswer(Dinz, m, bodyText)) return true;
    if (await handleUlarTanggaRoll(Dinz, m, bodyText)) return true;
    return false;
}

module.exports = {
    handleTicTacToeCmd,
    handleSuitPvpCmd,
    handleBlackjackCmd,
    handleWerewolfCmd,
    handleWerewolfNightAction,
    handleUlarTanggaCmd,
    handleDungeonCmd,
    handleExtraGameMessage
};
