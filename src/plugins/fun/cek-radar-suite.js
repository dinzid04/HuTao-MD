const { formatCard, toMono } = require('../../utils/formatter');

const CEK_TRAITS = {
    cekalay: { icon: '🤪', label: 'Kadar Alay', low: 'Kalem & elegan banget!', mid: 'Sesekali alay dikit biar seru.', high: 'Ketikannya udah mulai c4mpur aNgk4 nih!', max: 'RAJA ALAY SEJATI! Status WA titik-titik semua!' },
    cekbahagia: { icon: '😊', label: 'Tingkat Bahagia', low: 'Lagi butuh pelukan & es krim nih.', mid: 'Cukup tenang walau banyak pikiran.', high: 'Senyum terus, aura positifnya nular!', max: 'FULL SENYUM 100%! Hidupnya secerah matahari pagi!' },
    cekbijak: { icon: '🦉', label: 'Tingkat Kebijaksanaan', low: 'Masih suka gegabah ambil keputusan.', mid: 'Lumayan dewasa kalau lagi serius.', high: 'Tempat curhat andalan tongkrongan!', max: 'SUHU KEHIDUPAN! Kata-katanya layak masuk buku motivasi!' },
    cekcerdas: { icon: '🧠', label: 'Tingkat Kecerdasan', low: 'Otak lagi mode hemat baterai.', mid: 'Cerdas di saat kepepet deadline!', high: 'Otak encer, cepat tangkap masalah!', max: 'JENIUS LEVEL ALBERT EINSTEIN!' },
    cekcreative: { icon: '🎨', label: 'Kreativitas', low: 'Lagi mentok ide (writer block).', mid: 'Punya ide unik kalau lagi santai.', high: 'Idenya selalu out of the box!', max: 'MASTER KREATIF! Apa aja jadi karya keren!' },
    cekdermawan: { icon: '🤲', label: 'Kedermawanan', low: 'Dompetnya dikunci gembok baja.', mid: 'Suka nraktir kalau habis gajian.', high: 'Ringan tangan & suka berbagi!', max: 'SULTAN DERMAWAN! Suka bagi-bagi rezeki tanpa pamrih!' },
    cekgacha: { icon: '🎰', label: 'Hoki Gacha Hari Ini', low: 'Awas rungkad! Ampas melulu hari ini.', mid: 'Lumayan dapet item ungu.', high: 'Pity rendah langsung dapet SSR!', max: 'DEWA GACHA! Sekali pull langsung karakter bintang 5!' },
    cekgalak: { icon: '😠', label: 'Tingkat Kegalakan', low: 'Lembut banget, marah aja senyum.', mid: 'Galak kalau lapar doang.', high: 'Tatapannya bikin ciut nyali!', max: 'MODE NAGA MENYALA! Jangan coba-coba bikin kesel!' },
    cekhumoris: { icon: '😂', label: 'Selera Humor', low: 'Jokes bapak-bapak garing.', mid: 'Receh tapi lumayan menghibur.', high: 'Tongkrongan sepi kalau gak ada dia!', max: 'KOMIKA STANDUP! Ngomong dikit satu grup ngakak!' },
    cekintrovert: { icon: '🎧', label: 'Kadar Introvert', low: 'Ekstrovert sejati, baterai sosial penuh!', mid: 'Ambivert, bisa rame bisa menyendiri.', high: 'Lebih betah di kamar sambil rebahan.', max: 'INTROVERT MURNI! Keluar kamar cuma buat ambil paket!' },
    cekiq: { icon: '📐', label: 'Estimasi IQ Fun', mode: 'iq' },
    cekjago: { icon: '🏆', label: 'Tingkat Kejagoan', low: 'Masih tutorial pemula nih.', mid: 'Lumayan bisa gendong tim sesekali.', high: 'Pro player andalan mabar!', max: 'TOP GLOBAL! Lawan auto kena mental!' },
    cekjenius: { icon: '🔬', label: 'Kadar Jenius', low: 'Santai aja, jenius butuh istirahat.', mid: 'Punya bakat terpendam!', high: 'Strateginya selalu 5 langkah di depan!', max: 'OTAK SUPERKOMPUTER 9000 IQ!' },
    cekjujur: { icon: '⚖️', label: 'Tingkat Kejujuran', low: 'Hmm, suka ngeles dikit nih.', mid: 'Jujur pada tempatnya.', high: 'Polos & anti bohong!', max: 'JUJUR 100% MURNI TANPA PENGAWET!' },
    cekjulid: { icon: '👀', label: 'Kadar Julid', low: 'Adem ayem, gak suka gosip.', mid: 'Sesekali nyimak drama lewat.', high: 'Radar gosipnya tajam banget!', max: 'KETUA LAMBE TURAH CABANG GRUP!' },
    cekkarismatik: { icon: '✨', label: 'Aura Karisma', low: 'Masih malu-malu kucing.', mid: 'Punya pesona kalem.', high: 'Baru muncul di grup langsung disapa!', max: 'AURA MAIN CHARACTER ANIME!' },
    cekkarma: { icon: '☯️', label: 'Skor Karma Baik', low: 'Yuk perbanyak berbuat baik hari ini.', mid: 'Seimbang seperti yin & yang.', high: 'Banyak tabungan kebaikan!', max: 'KARMA EMAS! Hal baik bakal segera menghampirimu!' },
    cekkaya: { icon: '💰', label: 'Potensi Kekayaan', low: 'Pejuang tanggal tua sejati.', mid: 'Tabungan aman terkendali.', high: 'Asetnya mulai menggurita!', max: 'CALON TRILIUNER FORBES!' },
    cekkece: { icon: '😎', label: 'Tingkat Kekece-an', low: 'Simpel apa adanya.', mid: 'OOTD-nya lumayan rapi!', high: 'Gaya keren maksimal!', max: 'KECE BADAI DARI LAHIR!' },
    cekkepo: { icon: '🔍', label: 'Kadar Kepo', low: 'Cuek bebek urusan orang.', mid: 'Penasaran kalau topiknya seru.', high: 'Stalker handal tanpa jejak!', max: 'INTELEJEN GRUP! Semua rahasia dia tahu!' },
    cekkepribadian: { icon: '🪪', label: 'Tipe Kepribadian', mode: 'mbti' },
    cekkeren: { icon: '🔥', label: 'Tingkat Keren', low: 'Santai tapi tetap asik.', mid: 'Lumayan cool!', high: 'Kerennya gak ada obat!', max: 'COOL OVERLOAD 1000%!' },
    cekkocak: { icon: '🤣', label: 'Kadar Kekocakan', low: 'Mode serius aktif.', mid: 'Suka nyeletuk lucu.', high: 'Tingkahnya selalu bikin ngakak!', max: 'BADUT PENGHIBUR TERBAIK SEJAGAT WA!' },
    cekkpopers: { icon: '🫰', label: 'Kadar K-Popers', low: 'Cuma tahu lagu yang viral di TikTok.', mid: 'Hafal beberapa bias terkenal.', high: 'Playlist penuh lagu Korea & rajin streaming!', max: 'STAN GARIS KERAS! Koleksi photocard selemari!' },
    cekkuat: { icon: '💪', label: 'Tingkat Kekuatan', low: 'Angkat galon aja ngos-ngosan.', mid: 'Cukup kuat menghadapi kenyataan.', high: 'Mental & fisik baja!', max: 'SAITAMA ONE PUNCH LEVEL!' },
    ceklapar: { icon: '🍜', label: 'Tingkat Kelaparan', low: 'Masih kenyang banget.', mid: 'Mulai pengen nyemil nih.', high: 'Perut udah konser keroncongan!', max: 'DARURAT MIE INSTAN + TELUR SEKARANG JUGA!' },
    ceklebay: { icon: '🎭', label: 'Kadar Lebay', low: 'Lempeng & realistis.', mid: 'Bumbu cerita dikit biar seru.', high: 'Dramatis kayak sinetron prime time!', max: 'RATU/RAJA DRAMA PEMENANG PIALA CITRA!' },
    ceklemot: { icon: '🐢', label: 'Tingkat Lemot', low: 'Respons secepat kilat 5G!', mid: 'Kadang buffering 2 detik.', high: 'Sinyal otak lagi EDGE (E) nih.', max: 'LOADING 99% DARI KEMARIN BELUM KELAR!' },
    ceklucu: { icon: '🐣', label: 'Kadar Kelucuan', low: 'Wibawa keren.', mid: 'Gemesin dikit!', high: 'Lucu & bikin gemes satu grup!', max: 'GEMES MAKSIMAL PENGEN CUBIT PIPI!' },
    cekmalas: { icon: '🦥', label: 'Kadar Kemalasan', low: 'Produktif & rajin gerak!', mid: 'Rebahan seperlunya.', high: 'Kasur punya gaya gravitasi 10x lipat!', max: 'DUTABESAR KAUM REBAHAN INTERNASIONAL!' },
    cekmiskin: { icon: '🪙', label: 'Kadar Tanggal Tua', low: 'Dompet tebal aman sentosa!', mid: 'Mulai hitung promo diskon.', high: 'Saldo tinggal kenangan manis.', max: 'DOMPET BERDEBU MENUNGGU GAJIAN!' },
    cekngantuk: { icon: '🥱', label: 'Tingkat Ngantuk', low: 'Segar bugar siap begadang!', mid: 'Mulai nguap tipis-tipis.', high: 'Mata udah tinggal 5 watt!', max: 'TIDUR SAMBIL PEGANG HP!' },
    ceknoob: { icon: '🎮', label: 'Kadar Noob', low: 'Bukan noob, ini suhu nyamar!', mid: 'Kadang blunder dikit wajar.', high: 'Sering maju sendiri lupa map!', max: 'BEBAN TIM TERSERTIFIKASI!' },
    cekotaku: { icon: '🍥', label: 'Kadar Otaku', low: 'Nonton anime musiman aja.', mid: 'Tahu banyak referensi anime.', high: 'Maraton 24 episode sehari!', max: 'OTAKU SEJATI PENGHUNI ISEKAI!' },
    cekpemberani: { icon: '🦁', label: 'Tingkat Keberanian', low: 'Liat kecoa terbang langsung kabur!', mid: 'Berani kalau ada temennya.', high: 'Mental pemberani pantang mundur!', max: 'SINGA TEMPUR TANPA RASA TAKUT!' },
    cekrajin: { icon: '📚', label: 'Tingkat Kerajinan', low: 'Sistem Kebut Semalam (SKS) garis keras.', mid: 'Rajin kalau mood bagus.', high: 'Disiplin & selalu tepat waktu!', max: 'TELADAN PANUTAN SEMUA ORANG!' },
    cekramah: { icon: '🌸', label: 'Keramahan', low: 'Singkat, padat, jelas.', mid: 'Sopan & enak diajak ngobrol.', high: 'Ramah banget ke semua member!', max: 'DUTABESAR PERSAHABATAN PALING HANGAT!' },
    cekrezeki: { icon: '🍀', label: 'Aura Rezeki Hari Ini', low: 'Sabar & tetap semangat berusaha!', mid: 'Ada rezeki kecil tak terduga.', high: 'Pintu rezeki terbuka lebar hari ini!', max: 'HUJAN BERKAH & REZEKI NOMPLOK!' },
    cekromantis: { icon: '🌹', label: 'Kadar Romantis', low: 'Cuek tapi sebenarnya perhatian.', mid: 'Manis lewat tindakan kecil.', high: 'Puitis & jago bikin baper!', max: 'PAKAR ROMANTISME BIKIN MELELEH!' },
    ceksabar: { icon: '🧘', label: 'Tingkat Kesabaran', low: 'Sumbu pendek, gampang meledak!', mid: 'Masih bisa tarik napas dalam-dalam.', high: 'Sabar menghadapi ujian hidup.', max: 'KESABARAN SELUAS SAMUDRA HINDIA!' },
    ceksadboy: { icon: '🌧️', label: 'Kadar Sadboy', low: 'Hati ceria bebas galau!', mid: 'Kadang kangen masa lalu jam 12 malam.', high: 'Playlist Spotify isinya lagu galau semua!', max: 'PRESIDEN SADBOY GALAU AKUT!' },
    ceksadgirl: { icon: '🥀', label: 'Kadar Sadgirl', low: 'Strong & happy girl!', mid: 'Sesekali overthinking sebelum tidur.', high: 'Curhat panjang sambil denger lagu Hindia/Tulus.', max: 'RATU GALAU MELANKOLIS 24/7!' },
    ceksopan: { icon: '🙇', label: 'Tingkat Kesopanan', low: 'Santai kayak sama temen dekat.', mid: 'Tahu tata krama & etika.', high: 'Tutur katanya adem & santun!', max: 'MENANTU IDAMAN SEMUA MERTUA!' },
    ceksultan: { icon: '👑', label: 'Aura Sultan', low: 'Sultan dalam doa & usaha!', mid: 'Gaya elit ekonomi stabil.', high: 'Checkout keranjang tanpa liat harga!', max: 'SULTAN ANDARA CABANG WHATSAPP!' },
    cektampan: { icon: '🤵', label: 'Tingkat Ketampanan', low: 'Manis kalau dilihat lama-lama.', mid: 'Rapi & sedap dipandang!', high: 'Ganteng maksimal bikin salah tingkah!', max: 'VISUAL IDOL KELAS DUNIA!' },
    cektegas: { icon: '🫡', label: 'Ketegasan', low: 'Gak enakan sama orang.', mid: 'Bisa bilang tidak kalau perlu.', high: 'Tegas, lugas, dan berwibawa!', max: 'KOMANDAN JENDERAL BERWIBAWA!' },
    cektinggi: { icon: '📏', label: 'Tebak Tinggi Badan', mode: 'height' },
    cektoxic: { icon: '☣️', label: 'Kadar Toxic', low: 'Mulut bersih penuh doa baik!', mid: 'Keceplosan kalau kalah mabar doang.', high: 'Ketikannya pedas level cabai rawit!', max: 'RADIASI TOXIC TINGKAT TINGGI!' },
    cektsundere: { icon: '💢', label: 'Kadar Tsundere', low: 'Jujur sama perasaan sendiri.', mid: 'Jaim dikit padahal suka.', high: '"B-bukan berarti aku peduli sama kamu ya!"', max: 'TSUNDERE AKUT 100% GENGSINYA SETINGGI LANGIT!' },
    cektulus: { icon: '🤍', label: 'Ketulusan Hati', low: 'Masih penuh perhitungan.', mid: 'Baik & cukup peduli.', high: 'Tulus banget nolong teman!', max: 'HATI SEBERSIH KAPAS TANPA PAMRIH!' },
    cekyandere: { icon: '🔪', label: 'Kadar Posesif/Yandere', low: 'Santai & percaya pasangan.', mid: 'Cemburu wajar tanda sayang.', high: 'Harus lapor lokasi tiap 10 menit!', max: 'POSESIF AKUT: "KAMU CUMA BOLEH LIHAT AKU!"' },
    cekenergi: { icon: '⚡', label: 'Baterai Energi Hari Ini', low: 'Lowbat 5%, butuh cas kopi & tidur!', mid: 'Stabil 55%, siap jalanin hari.', high: 'Penuh 90%, semangat membara!', max: 'OVERCHARGE 100%! Siap taklukkan dunia!' }
};

const FUN_EXTRA_CMDS = ['bagaimana', 'berapa', 'mengapa', 'mimpi', 'sulap', 'jodoh', 'coba'];

function buildBar(pct) {
    const filled = Math.round(pct / 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
    name: 'cek-radar-suite',
    category: 'fun',
    commands: [...Object.keys(CEK_TRAITS), ...FUN_EXTRA_CMDS],

    async execute(ctx) {
        const { Dinz, m, command, text, Reply, usedPrefix } = ctx;
        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();

        // 1. CEK TRAITS (52 commands)
        if (CEK_TRAITS[cmd]) {
            const cfg = CEK_TRAITS[cmd];
            const targetJid = (m.mentionedJid && m.mentionedJid[0]) || m.quoted?.sender || m.sender;
            const cleanTag = targetJid.split('@')[0].split(':')[0];
            const customLabel = (!m.mentionedJid?.length && !m.quoted && text.trim()) ? text.trim() : `@${cleanTag}`;
            const mentions = customLabel.startsWith('@') ? [targetJid] : [];

            if (cfg.mode === 'iq') {
                const iq = Math.floor(75 + Math.random() * 90);
                const rank = iq >= 140 ? 'Jenius Langka 🌟' : iq >= 115 ? 'Di Atas Rata-Rata 🔥' : iq >= 95 ? 'Normal Cerdas 👍' : 'Mode Santai 💤';
                return Reply(formatCard({
                    icon: cfg.icon,
                    title: 'HASIL TES IQ FUN',
                    rows: [
                        { label: 'Target', value: customLabel },
                        { label: 'Skor IQ', value: `${iq} Poin` },
                        { label: 'Kategori', value: rank }
                    ]
                }), mentions);
            }

            if (cfg.mode === 'height') {
                const cm = Math.floor(148 + Math.random() * 42);
                const note = cm >= 180 ? 'Tinggi menjulang kayak model/atlet basket!' : cm >= 168 ? 'Tinggi ideal proporsional!' : cm >= 158 ? 'Pas & enak dipandang!' : 'Imut & minimalis gemesin!';
                return Reply(formatCard({
                    icon: cfg.icon,
                    title: 'TEBAK TINGGI BADAN',
                    rows: [
                        { label: 'Target', value: customLabel },
                        { label: 'Prediksi', value: `${cm} cm` }
                    ],
                    body: `💬 _"${note}"_`
                }), mentions);
            }

            if (cfg.mode === 'mbti') {
                const types = [
                    ['INTJ — Sang Arsitek', 'Visioner, mandiri, penuh strategi jangka panjang.'],
                    ['INTP — Sang Pemikir', 'Analitis, penasaran tinggi, suka memecahkan teka-teki rumit.'],
                    ['ENTJ — Sang Komandan', 'Pemimpin tegas, berani, selalu menemukan jalan keluar.'],
                    ['ENTP — Sang Pendebat', 'Cerdas, penuh ide liar, suka tantangan intelektual.'],
                    ['INFJ — Sang Advokat', 'Empati mendalam, idealis, pendengar yang luar biasa.'],
                    ['INFP — Sang Mediator', 'Puitis, tulus, imajinatif, dan setia pada nilai hati.'],
                    ['ENFJ — Sang Protagonis', 'Karismatik, hangat, suka menginspirasi orang sekitar.'],
                    ['ENFP — Sang Juru Kampanye', 'Antusias, kreatif, energik, mudah bergaul dengan siapa saja.'],
                    ['ISTJ — Sang Logistik', 'Disiplin, dapat diandalkan, sangat bertanggung jawab.'],
                    ['ISFJ — Sang Pembela', 'Perhatian, pelindung setia, selalu ingat detail kecil.'],
                    ['ESTP — Sang Pengusaha', 'Spontan, berani ambil risiko, gesit di situasi darurat.'],
                    ['ESFP — Sang Penghibur', 'Ceria, pencair suasana, bikin tongkrongan selalu hidup!']
                ];
                const [mbti, desc] = pickRandom(types);
                return Reply(formatCard({
                    icon: cfg.icon,
                    title: 'ANALISIS KEPRIBADIAN FUN',
                    rows: [
                        { label: 'Target', value: customLabel },
                        { label: 'Tipe', value: mbti }
                    ],
                    body: `💬 _"${desc}"_`
                }), mentions);
            }

            const pct = Math.floor(Math.random() * 101);
            const comment = pct >= 90 ? cfg.max : pct >= 60 ? cfg.high : pct >= 30 ? cfg.mid : cfg.low;
            return Reply(formatCard({
                icon: cfg.icon,
                title: cfg.label.toUpperCase(),
                rows: [
                    { label: 'Target', value: customLabel },
                    { label: 'Skor', value: `[${buildBar(pct)}] ${pct}%` }
                ],
                body: `💬 _"${comment}"_`
            }), mentions);
        }

        // 2. INTERACTIVE FUN Q&A / GAMES (7 commands)
        if (cmd === 'bagaimana') {
            if (!text.trim()) return Reply(`🔮 Contoh: ${toMono(`${pfx}bagaimana cara cepat kaya`)}`);
            const answers = [
                'Mulai dari niat kuat, konsisten tiap hari, dan kurangi rebahan 30%!',
                'Coba tanya hati kecilmu sambil minum air putih dingin.',
                'Pelan-pelan tapi pasti, kuncinya jangan menyerah di percobaan pertama!',
                'Minta doa orang tua, usaha maksimal, sisanya biar semesta bekerja!',
                'Rahasianya ada di ketekunan dan tidur tepat waktu.',
                'Langsung eksekusi sekarang, jangan tunggu mood datang!'
            ];
            return Reply(`\`🔮 BAGAIMANA\`\n> ❓ *Pertanyaan :* ${text.trim()}\n> 💡 *Jawaban :* ${pickRandom(answers)}`);
        }

        if (cmd === 'berapa') {
            if (!text.trim()) return Reply(`🔢 Contoh: ${toMono(`${pfx}berapa persen peluang dia suka aku`)}`);
            const isPercent = /persen|%|peluang/i.test(text);
            const val = isPercent ? `${Math.floor(Math.random() * 101)}%` : `${Math.floor(1 + Math.random() * 100)}`;
            return Reply(`\`🔢 BERAPA\`\n> ❓ *Pertanyaan :* ${text.trim()}\n> 🎯 *Hasil :* *${val}*`);
        }

        if (cmd === 'mengapa') {
            if (!text.trim()) return Reply(`🤔 Contoh: ${toMono(`${pfx}mengapa langit warna biru`)}`);
            const reasons = [
                'Karena memang sudah takdir semesta yang indah begitu adanya.',
                'Soalnya kalau nggak begitu, hidup bakal kurang seru!',
                'Ada hikmah tersembunyi yang baru kamu sadari nanti.',
                'Karena gravitasi kasur dan kopi malam sedang berkonspirasi!',
                'Semua itu terjadi supaya kamu jadi pribadi yang lebih tangguh.'
            ];
            return Reply(`\`🤔 MENGAPA\`\n> ❓ *Pertanyaan :* ${text.trim()}\n> 💬 *Alasan :* ${pickRandom(reasons)}`);
        }

        if (cmd === 'coba') {
            const opts = String(text || '').split('|').map((s) => s.trim()).filter(Boolean);
            if (opts.length < 2) {
                return Reply(`🎲 Bingung memilih? Biar bot pilihkan!\n> Contoh: ${toMono(`${pfx}coba Makan Bakso | Mie Ayam | Nasi Padang`)}`);
            }
            const chosen = pickRandom(opts);
            return Reply(`\`🎲 PILIHAN BOT\`\n> ◦ Opsi : ${opts.join(', ')}\n> ✅ *Pilihan Terbaik :* *${chosen}*!`);
        }

        if (cmd === 'sulap') {
            const cards = ['🂡 As Sekop', '🂱 As Hati', '🃁 As Wajik', '🃑 As Keriting', '🂾 Raja Hati', '🂭 Ratu Sekop', '🃏 Joker Spesial'];
            const tricks = [
                'Abrakadabra! Dari balik layar HP-mu muncul selembar kartu misterius...',
                'Simsalabim! Koin di tangan kiri berpindah menembus dimensi chat menjadi...',
                'Perhatikan baik-baik... dalam hitungan 3, 2, 1... TADAAA!'
            ];
            return Reply(`\`🎩 PERTUNJUKAN SULAP HUTAO\`\n${pickRandom(tricks)}\n\n✨ Hasil Sulap: *${pickRandom(cards)}*!`);
        }

        if (cmd === 'mimpi') {
            const themes = [
                'Malam ini kamu bermimpi terbang di atas kota penuh lampu neon bersama karakter favoritmu.',
                'Kamu bermimpi menemukan peti harta karun berisi tiket liburan keliling Jepang gratis!',
                'Dalam mimpimu, semua target dan cita-citamu tahun ini tercapai satu per satu.',
                'Kamu bermimpi diundang makan malam mewah di istana awan yang tenang dan damai.',
                'Mimpi seru: kamu jadi pahlawan utama yang menyelamatkan dunia dengan kekuatan elemen api!'
            ];
            return Reply(`\`🌙 PREDIKSI MIMPI MALAM INI\`\n> 💭 ${pickRandom(themes)}`);
        }

        if (cmd === 'jodoh') {
            if (!m.isGroup) return Reply(global.mess.group);
            const parts = (m.metadata?.participants || []).map((p) => p.jid || p.id).filter((j) => j && j.includes('@'));
            if (parts.length < 2) return Reply('❌ Anggota grup kurang dari 2 orang untuk diramal jodoh!');
            const p1 = m.mentionedJid?.[0] || m.sender;
            const pool = parts.filter((j) => j !== p1);
            const p2 = m.mentionedJid?.[1] || pickRandom(pool);
            const pct = Math.floor(45 + Math.random() * 56);
            return Reply(
                `\`💘 RADAR JODOH GRUP\`\n` +
                `> ❤️ Pasangan 1 : @${p1.split('@')[0]}\n` +
                `> 💞 Pasangan 2 : @${p2.split('@')[0]}\n` +
                `> 📊 Kecocokan  : *[${buildBar(pct)}] ${pct}%*\n\n` +
                `_${pct >= 80 ? 'Cocok banget! Ditunggu undangan makan-makannya ya!' : 'Lumayan serasi, coba sering-sering ngobrol di grup!'}_`,
                [p1, p2]
            );
        }

        return false;
    }
};
