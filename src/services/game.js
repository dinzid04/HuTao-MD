const axios = require('axios');
const { addBonusLimit } = require('./limit');
const { getRandomQuizItem } = require('./quiz-bank');
const { initRpgUser, HITORI_RPG } = require('./rpg');

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function grantRandomGameReward(jid, multiplier = 1) {
    const money = Math.round(randInt(1500, 6000) * multiplier);
    const exp = Math.round(randInt(120, 420) * multiplier);
    const limit = Math.max(1, Math.round(randInt(1, 3) * Math.min(multiplier, 1.5)));
    let bonusLabel = '';
    let leveledUp = false;
    let newLevel = 0;

    try {
        if (global.db && global.db.users) {
            if (!global.db.users[jid]) global.db.users[jid] = {};
            const u = global.db.users[jid];
            initRpgUser(u);
            u.money = (u.money || 0) + money;
            u.exp = (u.exp || 0) + exp;
            u.gameWins = (u.gameWins || 0) + 1;

            const roll = Math.random();
            if (roll < 0.12) {
                u.common = (u.common || 0) + 1;
                bonusLabel = '+1 Common Crate 📦';
            } else if (roll < 0.24) {
                const g = randInt(1, 3);
                u.gold = (u.gold || 0) + g;
                bonusLabel = `+${g} Gold 🪙`;
            } else if (roll < 0.34) {
                u.potion = (u.potion || 0) + 1;
                bonusLabel = '+1 Potion 🧪';
            }

            if (HITORI_RPG && typeof HITORI_RPG.xpRange === 'function') {
                while (u.exp >= HITORI_RPG.xpRange(u.level || 0).max) {
                    u.level = (u.level || 0) + 1;
                    leveledUp = true;
                    newLevel = u.level;
                }
            }
        }
    } catch (_) {}

    try { addBonusLimit(jid, limit); } catch (_) {}

    const parts = [
        `+Rp ${money.toLocaleString('id-ID')} Money 💰`,
        `+${exp.toLocaleString('id-ID')} EXP ✨`,
        `+${limit} Limit 🎫`
    ];
    if (bonusLabel) parts.push(bonusLabel);
    if (leveledUp) parts.push(`Naik ke Lv.${newLevel} 🎉`);

    return { money, exp, limit, bonusLabel, leveledUp, newLevel, summary: parts.join('\n> ◦ ') };
}

global.gameSessions = global.gameSessions || {};

const gamesConfig = {
    asahotak: { title: 'Asah Otak', type: 'text', time: 60 },
    caklontong: { title: 'Cak Lontong', type: 'text', time: 60 },
    family100: { title: 'Family 100', type: 'family100', time: 90 },
    lengkapikalimat: { title: 'Lengkapi Kalimat', type: 'text', time: 60 },
    sambungkata: { title: 'Sambung Kata', type: 'text', time: 60 },
    siapakahaku: { title: 'Siapakah Aku', type: 'text', time: 60 },
    susunkata: { title: 'Susun Kata', type: 'text', time: 60 },
    tebakkata: { title: 'Tebak Kata', type: 'text', time: 60 },
    tebakkalimat: { title: 'Tebak Kalimat', type: 'text', time: 60 },
    tebakinggris: { title: 'Tebak Bahasa Inggris', type: 'text', time: 60 },
    tebakjorok: { title: 'Tebak Tebakan Jorok', type: 'text', time: 60 },
    tebaklirik: { title: 'Tebak Lirik', type: 'text', time: 60 },
    tebakhewan: { title: 'Tebak Hewan', type: 'text', time: 60 },
    tebakgambar: { title: 'Tebak Gambar', type: 'image', time: 60 },
    tebakbendera: { title: 'Tebak Bendera', type: 'image', time: 60 },
    tebaklogo: { title: 'Tebak Logo', type: 'image', time: 60 },
    tebakanime: { title: 'Tebak Anime', type: 'image', time: 60 },
    tebakgame: { title: 'Tebak Game', type: 'image', time: 60 },
    tebakhero: { title: 'Tebak Hero', type: 'image', time: 60 },
    tebakmakanan: { title: 'Tebak Makanan', type: 'image', time: 60 },
    tebakgenshin: { title: 'Tebak Genshin', type: 'image', time: 60 },
    tebaklagu: { title: 'Tebak Lagu', type: 'audio', time: 60 },
    kataacak: { title: 'Kata Acak', type: 'text', time: 60, offlineOnly: true },
    riddle: { title: 'Riddle Misteri', type: 'text', time: 60, offlineOnly: true },
    tekateki: { title: 'Teka Teki', type: 'text', time: 60, offlineOnly: true },
    tebakkimia: { title: 'Tebak Unsur Kimia', type: 'text', time: 60, offlineOnly: true },
    tebaknegara: { title: 'Tebak Negara', type: 'text', time: 60, offlineOnly: true },
    tebakprofesi: { title: 'Tebak Profesi', type: 'text', time: 60, offlineOnly: true },
    tebaktebakan: { title: 'Tebak Tebakan', type: 'text', time: 60, offlineOnly: true }
};

const makeClue = (ans) => {
    if (!ans) return '';
    return String(ans)
        .replace(/[a-zA-Z0-9]/g, (char, index) => (index % 2 === 0 ? char : '_'))
        .split('')
        .join(' ');
};

const similarity = (s1, s2) => {
    s1 = (s1 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    s2 = (s2 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const track = Array(s2.length + 1).fill(null).map(() =>
        Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

    for (let j = 1; j <= s2.length; j += 1) {
        for (let i = 1; i <= s1.length; i += 1) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1,
                track[j - 1][i] + 1,
                track[j - 1][i - 1] + indicator
            );
        }
    }
    const distance = track[s2.length][s1.length];
    return 1 - (distance / Math.max(s1.length, s2.length));
};

const getGameSessionKey = (Dinz, chatId) => {
    const prefix = (Dinz && Dinz.isJadibot && Dinz.jadibotNumber) ? `jb_${Dinz.jadibotNumber}_` : 'main_';
    return `${prefix}${chatId}`;
};

const startGame = async (Dinz, m, gameKey) => {
    const config = gamesConfig[gameKey];
    if (!config) return;

    const chatId = m.chat;
    const sessionKey = getGameSessionKey(Dinz, chatId);
    if (global.gameSessions[sessionKey]) {
        return Dinz.sendMessage(chatId, {
            text: `\`⌜ Game Sedang Berjalan ⌟\`\n> ◦ Masih ada sesi game *${global.gameSessions[sessionKey].title}* yang belum selesai!\n> ◦ Ketik jawabannya langsung di chat, ketik *clue* untuk bantuan, atau ketik *nyerah* untuk menyerah.`
        }, { quoted: m });
    }

    const baseUrl = global.apiDinz;
    const apiKey = global.ApikeyDinz;

    let randomItem = null;
    if (config.offlineOnly) {
        randomItem = getRandomQuizItem(gameKey);
    } else {
        try {
            const res = await axios.get(`${baseUrl}/game/${gameKey}?apikey=${apiKey}`, { timeout: 12000 });
            randomItem = res.data?.result;
        } catch (e) {
            console.error('[GAME API ERROR]', e.message);
        }
        if (!randomItem) {
            randomItem = getRandomQuizItem(gameKey);
        }
    }

    if (!randomItem) {
        return Dinz.sendMessage(chatId, { text: `❌ Gagal mengambil soal game *${config.title}* dari server API.` }, { quoted: m });
    }

    let soal = randomItem.soal || randomItem.pertanyaan || '';
    let jawaban = randomItem.jawaban || randomItem.name || randomItem.judul || '';
    let deskripsi = randomItem.deskripsi || randomItem.desk || '';
    let imageUrl = randomItem.img || randomItem.image || randomItem.fullimg || null;
    let audioUrl = randomItem.soal && randomItem.soal.startsWith('http') ? randomItem.soal : (randomItem.audio || null);
    let extraInfo = '';

    if (gameKey === 'susunkata' && randomItem.tipe) {
        extraInfo = `\n> ◦ *Tipe :* ${randomItem.tipe}`;
    }
    if (gameKey === 'tebaklagu' && randomItem.artis) {
        extraInfo = `\n> ◦ *Artis :* ${randomItem.artis}`;
    }

    let sessionObj = {
        key: gameKey,
        title: config.title,
        type: config.type,
        soal: soal,
        jawaban: jawaban,
        deskripsi: deskripsi,
        answeredList: [],
        allAnswers: Array.isArray(jawaban) ? jawaban.map(v => String(v).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")) : [],
        messageId: null,
        timeoutId: null
    };

    const timeoutSec = config.time || 60;
    sessionObj.timeoutId = setTimeout(async () => {
        if (global.gameSessions[sessionKey]) {
            const currentSession = global.gameSessions[sessionKey];
            delete global.gameSessions[sessionKey];
            const answerDisplay = Array.isArray(currentSession.jawaban)
                ? currentSession.jawaban.join(', ')
                : currentSession.jawaban;
            let endMsg = `\`⌜ Waktu Game Habis ⏰ ⌟\`\n> ◦ *Game :* ${currentSession.title}\n> ◦ *Jawaban :* *${answerDisplay}*`;
            if (currentSession.deskripsi) {
                endMsg += `\n> ◦ *Penjelasan :* ${currentSession.deskripsi}`;
            }
            endMsg += `\n\n💡 *Ketik ${gameKey} untuk bermain kembali*`;
            await Dinz.sendMessage(chatId, { text: endMsg }).catch(() => {});
        }
    }, timeoutSec * 1000);

    global.gameSessions[sessionKey] = sessionObj;

    const header = `\`⌜ Game ${config.title} ⌟\``;
    const clueText = Array.isArray(jawaban) ? `${jawaban.length} Jawaban Tersedia` : (randomItem.clue || makeClue(jawaban));
    const petunjukFooter = `\n\n💡 *Ketik jawabanmu langsung di chat, ketik clue untuk bantuan, atau ketik nyerah*`;
    let sentMsg = null;

    if (config.type === 'family100') {
        const textMsg = `${header}\n> ◦ *Soal :* ${soal}\n> ◦ *Tersedia :* ${jawaban.length} Jawaban\n> ◦ *Waktu :* ${timeoutSec} Detik${petunjukFooter}`;
        sentMsg = await Dinz.sendMessage(chatId, { text: textMsg }, { quoted: m });
    } else if (config.type === 'image' && imageUrl) {
        const captionMsg = `${header}\n> ◦ *Soal :* ${soal || 'Tebak gambar di atas'}${extraInfo}\n> ◦ *Clue :* \`${clueText}\`\n> ◦ *Waktu :* ${timeoutSec} Detik${petunjukFooter}`;
        try {
            sentMsg = await Dinz.sendMessage(chatId, { image: { url: imageUrl }, caption: captionMsg }, { quoted: m });
        } catch (e) {
            sentMsg = await Dinz.sendMessage(chatId, { text: captionMsg }, { quoted: m });
        }
    } else if (config.type === 'audio' && audioUrl) {
        const captionMsg = `${header}\n> ◦ *Soal :* Dengarkan audio di bawah ini!${extraInfo}\n> ◦ *Clue :* \`${clueText}\`\n> ◦ *Waktu :* ${timeoutSec} Detik${petunjukFooter}`;
        await Dinz.sendMessage(chatId, { text: captionMsg }, { quoted: m });
        sentMsg = await Dinz.sendMessage(chatId, { audio: { url: audioUrl }, mimetype: 'audio/mpeg', ptt: false }, { quoted: m });
    } else {
        const textMsg = `${header}\n> ◦ *Soal :* ${soal}${extraInfo}\n> ◦ *Clue :* \`${clueText}\`\n> ◦ *Waktu :* ${timeoutSec} Detik${petunjukFooter}`;
        sentMsg = await Dinz.sendMessage(chatId, { text: textMsg }, { quoted: m });
    }

    if (sentMsg && sentMsg.key) {
        sessionObj.messageId = sentMsg.key.id;
    }
    return sentMsg;
};

const handleGameAnswer = async (Dinz, m, bodyText, isCmd = false, command = '') => {
    if (!m.chat || !bodyText) return false;
    const sessionKey = getGameSessionKey(Dinz, m.chat);
    const session = global.gameSessions[sessionKey];
    if (!session) return false;

    const rawInput = String(bodyText).trim();

    if (/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^/]/i.test(rawInput)) {
        return false;
    }

    const trimmed = rawInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (trimmed === 'nyerah' || trimmed === 'surrender') {
        clearTimeout(session.timeoutId);
        delete global.gameSessions[sessionKey];
        const answerDisplay = Array.isArray(session.jawaban) ? session.jawaban.join(', ') : session.jawaban;
        let surrenderMsg = `\`⌜ Game Berakhir (Menyerah) 🏳️ ⌟\`\n> ◦ *Game :* ${session.title}\n> ◦ *Jawaban :* *${answerDisplay}*`;
        if (session.deskripsi) {
            surrenderMsg += `\n> ◦ *Penjelasan :* ${session.deskripsi}`;
        }
        surrenderMsg += `\n\n💡 *Ketik ${session.key} untuk bermain lagi*`;
        await Dinz.sendMessage(m.chat, { text: surrenderMsg }, { quoted: m });
        return true;
    }

    if (trimmed === 'clue' || trimmed === 'bantuan') {
        if (Array.isArray(session.jawaban)) {
            const remaining = session.jawaban.filter(j => !session.answeredList.includes(j.toLowerCase()));
            await Dinz.sendMessage(m.chat, {
                text: `\`⌜ Clue Family 100 ⌟\`\n> ◦ *Tersisa ${remaining.length} Jawaban:*\n> ◦ ${remaining.map(r => makeClue(r)).join('\n> ◦ ')}`
            }, { quoted: m });
        } else {
            await Dinz.sendMessage(m.chat, {
                text: `\`⌜ Clue Bantuan ⌟\`\n> ◦ *Clue :* \`${makeClue(session.jawaban)}\``
            }, { quoted: m });
        }
        return true;
    }

    const knownGeneralCommands = [
        'menu', 'allmenu', 'help', 'ping', 'owner', 'creator', 'info',
        'tiktok', 'tt', 'tiktokmp3', 'ttmp3', 'ig', 'instagram', 'play', 'playmusic',
        'yts', 'ytsearch', 'pinterest', 'pin', 'ai', 'gemini', 'bananaai', 'brat',
        'hd', 'remini', 'removebg', 'tofigure', 'tobotak', 'tohitam', 'fakeff',
        'artinama', 'artimimpi', 'jodohnama', 'ramalanjodoh', 'weton', 'haribaik', 'rejekiweton'
    ];
    if (knownGeneralCommands.includes(trimmed)) {
        return false;
    }

    if (session.type === 'family100') {
        let matchedIndex = -1;
        for (let i = 0; i < session.jawaban.length; i++) {
            const cleanAns = String(session.jawaban[i]).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (trimmed === cleanAns || similarity(trimmed, cleanAns) >= 0.85) {
                if (!session.answeredList.includes(cleanAns)) {
                    matchedIndex = i;
                    break;
                }
            }
        }

        if (matchedIndex !== -1) {
            const matchedAnswer = session.jawaban[matchedIndex];
            session.answeredList.push(String(matchedAnswer).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
            const stepReward = grantRandomGameReward(m.sender, 0.6);

            const remaining = session.jawaban.length - session.answeredList.length;
            if (remaining === 0) {
                clearTimeout(session.timeoutId);
                delete global.gameSessions[sessionKey];
                const finalReward = grantRandomGameReward(m.sender, 1.5);

                let finishMsg = `\`⌜ Family 100 Selesai! 🎉 ⌟\`\n> ◦ *Hebat! Semua jawaban berhasil ditebak!*\n> ◦ Penebak Terakhir : *@${m.sender.split('@')[0]}*\n> ◦ *Hadiah Bonus Random :*\n> ◦ ${finalReward.summary}\n\n> ◦ *Semua Jawaban:*\n${session.jawaban.map((j, i) => `> ${i + 1}. ${j}`).join('\n')}`;
                await Dinz.sendMessage(m.chat, { text: finishMsg, mentions: [m.sender] }, { quoted: m });
                return true;
            } else {
                let correctMsg = `\`⌜ Jawaban Benar! ✨ ⌟\`\n> ◦ *@${m.sender.split('@')[0]}* berhasil menebak: *${matchedAnswer}*\n> ◦ *Hadiah :* +Rp ${stepReward.money.toLocaleString('id-ID')} | +${stepReward.exp} EXP | +${stepReward.limit} Limit\n> ◦ Tersisa *${remaining}* jawaban lagi!\n\n> ◦ *Terjawab:* ${session.answeredList.join(', ')}`;
                await Dinz.sendMessage(m.chat, { text: correctMsg, mentions: [m.sender] }, { quoted: m });
                return true;
            }
        }
        return false;
    }

    const targetJawaban = String(session.jawaban).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const score = similarity(trimmed, targetJawaban);

    if (trimmed === targetJawaban || score >= 0.90) {
        clearTimeout(session.timeoutId);
        delete global.gameSessions[sessionKey];
        const reward = grantRandomGameReward(m.sender, 1);

        let winMsg = `\`⌜ Jawaban Benar! 🎉 ⌟\`
> ◦ *Game :* ${session.title}
> ◦ *Pemenang :* @${m.sender.split('@')[0]}
> ◦ *Jawaban :* *${session.jawaban}*
> ◦ *Hadiah Random :*
> ◦ ${reward.summary}`;

        if (session.deskripsi) {
            winMsg += `\n> ◦ *Penjelasan :* ${session.deskripsi}`;
        }
        winMsg += `\n\n💡 *Ketik ${session.key} untuk bermain lagi*`;

        await Dinz.sendMessage(m.chat, { text: winMsg, mentions: [m.sender] }, { quoted: m });
        return true;
    } else if (score >= 0.70) {
        await Dinz.sendMessage(m.chat, { text: `\`⌜ Dikit Lagi! 🤏 ⌟\`\n> ◦ Jawabanmu sudah hampir benar, coba lagi!` }, { quoted: m });
        return true;
    }

    return false;
};

module.exports = {
    gamesConfig,
    startGame,
    handleGameAnswer,
    grantRandomGameReward
};
