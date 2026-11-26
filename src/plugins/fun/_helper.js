const { formatCard } = require('../../utils/formatter');
const { QUIZ_BANK } = require('../../services/quiz-bank');

function cleanNum(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function getCouplesState(botCtx, Dinz) {
    const couples = botCtx.getSection('couples', Dinz) || {};
    const saveCouples = () => botCtx.setSection('couples', couples, Dinz);
    return { couples, saveCouples };
}

const SENJA_QUOTES = [
    'Senja selalu mengajarkan bahwa perpisahan pun bisa terasa indah.',
    'Di balik jingga senja, ada doa yang pelan-pelan naik ke langit.',
    'Jangan takut gelap, karena bintang hanya muncul saat matahari tenggelam.',
    'Kadang yang paling menenangkan adalah diam sambil menatap langit sore.',
    'Senja tidak pernah menjanjikan untuk tinggal lama, tapi selalu datang kembali.'
];

const FAKTA_UNIK = [
    'Madu murni tidak pernah basi meskipun disimpan ribuan tahun.',
    'Gurita memiliki tiga jantung dan darah berwarna biru.',
    'Pisang secara botani termasuk buah beri, sedangkan stroberi bukan.',
    'Sehari di planet Venus lebih lama daripada satu tahunnya sendiri.',
    'Sidik jari koala hampir tidak bisa dibedakan dengan sidik jari manusia.',
    'Otak manusia menghasilkan sekitar 20 watt listrik saat terjaga.'
];

const GOMBAL_LIST = [
    'Kamu tahu bedanya kamu sama WiFi? Kalau WiFi nyambung ke HP, kalau kamu nyambung ke hati.',
    'Kopi aja butuh gula biar manis, tapi hariku cuma butuh senyum kamu.',
    'Aku bukan fotografer, tapi aku bisa lihat masa depan kita bersama.',
    'Kalau mencintaimu adalah kesalahan, biar aku salah setiap hari.'
];

const CEK_TRAITS = {
    cekbucin: { title: 'CEK TINGKAT BUCIN', emoji: '💘', low: 'Masih aman, belum bucin.', mid: 'Lumayan bucin nih!', high: 'Bucin akut tingkat dewa!' },
    cekgabut: { title: 'CEK TINGKAT GABUT', emoji: '🥱', low: 'Produktif banget!', mid: 'Setengah gabut, cari kegiatan gih.', high: 'Gabut maksimal, rebahan terus!' },
    cekhoki: { title: 'CEK HOKI HARI INI', emoji: '🍀', low: 'Sabar ya, coba lagi besok.', mid: 'Cukup beruntung hari ini!', high: 'Hoki parah! Gacha pasti wangi!' },
    cekimut: { title: 'CEK TINGKAT IMUT', emoji: '🎀', low: 'Lebih ke garang daripada imut.', mid: 'Imut-imut gemesin!', high: 'Overload keimutan!' },
    cekjomblo: { title: 'CEK AURA JOMBLO', emoji: '💔', low: 'Bentaran lagi taken nih!', mid: 'Masih betah sendiri.', high: 'Jomblo legendaris abadi!' },
    cekgamer: { title: 'CEK SKILL GAMER', emoji: '🎮', low: 'Masih latihan lawan bot.', mid: 'Lumayan jago, cocok diajak mabar!', high: 'Pro player sejati, MVP terus!' },
    ceksigma: { title: 'CEK LEVEL SIGMA', emoji: '🗿', low: 'Belum cukup mewing.', mid: 'Aura sigma mulai terasa.', high: 'True Sigma Male/Female 100%!' },
    ceknolep: { title: 'CEK TINGKAT NOLEP', emoji: '🖥️', low: 'Sering nyentuh rumput.', mid: 'Setengah anak kamar.', high: 'Penghuni abadi kamar gelap!' },
    ceksetia: { title: 'CEK KESETIAAN', emoji: '💍', low: 'Hati-hati, gampang oleng!', mid: 'Cukup setia asal dijaga.', high: 'Setia sampai akhir hayat!' }
};

async function runCekTrait(ctx, traitKey) {
    const { m, command, text, Reply } = ctx;
    const cfg = CEK_TRAITS[traitKey || command];
    const targetName = text.trim() || (m.mentionedJid?.[0] ? `@${cleanNum(m.mentionedJid[0])}` : m.pushName);
    const pct = Math.floor(Math.random() * 101);
    const desc = pct < 35 ? cfg.low : pct < 75 ? cfg.mid : cfg.high;
    return Reply(formatCard({
        icon: cfg.emoji,
        title: cfg.title,
        rows: [
            { label: 'Target', value: targetName },
            { label: 'Persentase', value: `*${pct}%*` },
            { label: 'Hasil', value: desc }
        ]
    }), m.mentionedJid || []);
}

module.exports = {
    formatCard,
    QUIZ_BANK,
    cleanNum,
    getCouplesState,
    SENJA_QUOTES,
    FAKTA_UNIK,
    GOMBAL_LIST,
    CEK_TRAITS,
    runCekTrait
};
