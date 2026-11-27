const PUISI_LIST = [
    'Di bawah senja yang perlahan memudar,\nnamamu masih menetap seperti doa yang tak pernah usai,\nmengajarkanku bahwa jarak hanyalah ruang,\nsedang rindu adalah jembatan paling jujur.',
    'Langit malam tak pernah iri pada mentari,\nia tahu bintang-bintang kecil pun punya cahayanya sendiri.\nMaka melangkahlah pelan, tak perlu tergesa,\nsemua yang ditakdirkan untukmu takkan pernah salah alamat.',
    'Hujan jatuh bukan untuk mematahkan ranting,\nmelainkan mengingatkan akar agar makin kuat menggenggam bumi.\nBegitu pula lelah hari ini—\nia sedang menempa versi terbaik dari dirimu.',
    'Ada kata-kata yang lebih indah saat diam,\nada pula langkah yang lebih tenang saat sendiri.\nSemoga hatimu selalu menemukan rumah,\ndi setiap lelah yang singgah.'
];

const RENUNGAN_LIST = [
    'Jangan membandingkan bab 1 hidupmu dengan bab 20 orang lain. Fokus bertumbuh 1% lebih baik setiap hari.',
    'Terkadang pintu yang tertutup bukanlah penolakan, melainkan perlindungan menuju jalan yang jauh lebih baik.',
    'Ketenangan bukan berarti hidup tanpa masalah, melainkan kemampuan tetap teduh di tengah badai.',
    'Hal-hal besar selalu dimulai dari konsistensi kecil yang sering diremehkan orang lain.',
    'Bersyukur tidak mengubah masa lalu, tapi mengubah caramu melihat hari ini dan menatap hari esok.'
];

module.exports = {
    name: 'elsyaa-fun-user',
    category: 'fun',
    commands: ['birthday', 'setbirthday', 'birthdaylist', 'puisi', 'renungan', 'top5', 'rules', 'setrules'],

    async execute(ctx) {
        const { Dinz, m, command, text, args, isCreator, Reply, usedPrefix } = ctx;
        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();

        if (cmd === 'puisi') {
            const pick = PUISI_LIST[Math.floor(Math.random() * PUISI_LIST.length)];
            return Reply(`\`✒️ PUISI\`\n\n_${pick}_`);
        }

        if (cmd === 'renungan') {
            const pick = RENUNGAN_LIST[Math.floor(Math.random() * RENUNGAN_LIST.length)];
            return Reply(`\`🌿 RENUNGAN HARI INI\`\n\n> _"${pick}"_`);
        }

        if (cmd === 'top5') {
            if (!m.isGroup) return Reply(global.mess.group);
            const topic = String(text || '').trim();
            if (!topic) return Reply(`🏆 Contoh: \`${pfx}top5 paling ganteng\` atau \`${pfx}top5 paling rajin\``);
            const parts = (m.metadata?.participants || []).map((p) => p.jid || p.id).filter(Boolean);
            if (!parts.length) return Reply('❌ Gagal membaca daftar member grup.');
            const shuffled = [...parts].sort(() => Math.random() - 0.5).slice(0, 5);
            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
            const lines = shuffled.map((jid, i) => `> ${medals[i]} @${jid.split('@')[0].split(':')[0]}`);
            return Reply(`\`🏆 TOP 5 ${topic.toUpperCase()}\`\n\n${lines.join('\n')}`, shuffled);
        }

        if (cmd === 'setbirthday') {
            const raw = String(args[0] || '').trim();
            const match = raw.match(/^(\d{1,2})[-/](\d{1,2})(?:[-/](\d{4}))?$/);
            if (!match) return Reply(`🎂 Format: \`${pfx}setbirthday DD-MM\` atau \`${pfx}setbirthday DD-MM-YYYY\`\n> Contoh: \`${pfx}setbirthday 15-07-2005\``);
            const dd = parseInt(match[1], 10);
            const mm = parseInt(match[2], 10);
            if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return Reply('❌ Tanggal/bulan tidak valid.');
            if (!global.db.users) global.db.users = {};
            const u = global.db.users[m.sender] || (global.db.users[m.sender] = {});
            u.birthday = `${String(dd).padStart(2, '0')}-${String(mm).padStart(2, '0')}${match[3] ? `-${match[3]}` : ''}`;
            u.name = m.pushName || u.name || m.sender.split('@')[0];
            return Reply(`🎂 Tanggal ulang tahun kamu disimpan: *${u.birthday}*!`);
        }

        if (cmd === 'birthday') {
            const target = (m.mentionedJid && m.mentionedJid[0]) || m.quoted?.sender || m.sender;
            const u = global.db?.users?.[target] || {};
            const tag = `@${target.split('@')[0].split(':')[0]}`;
            if (!u.birthday) {
                return Reply(`🎂 ${tag} belum mengatur tanggal ulang tahun.\n> Set pakai \`${pfx}setbirthday DD-MM\``, [target]);
            }
            return Reply(`\`🎂 ULANG TAHUN\`\n> ◦ *User :* ${tag}\n> ◦ *Tanggal :* *${u.birthday}*`, [target]);
        }

        if (cmd === 'birthdaylist') {
            const entries = Object.entries(global.db?.users || {})
                .filter(([, u]) => u && u.birthday)
                .slice(0, 25);
            if (!entries.length) return Reply(`🎂 Belum ada member yang menyimpan tanggal ulang tahun.\n> Ketik \`${pfx}setbirthday DD-MM\``);
            const lines = entries.map(([jid, u], i) => `> *${i + 1}.* ${u.name || jid.split('@')[0]} — 🎂 *${u.birthday}*`);
            return Reply(`\`🎂 DAFTAR ULANG TAHUN (${entries.length})\`\n\n${lines.join('\n')}`);
        }

        if (cmd === 'setrules') {
            if (!isCreator) return Reply(global.mess.owner);
            const body = String(text || m.quoted?.text || '').trim();
            if (!body) return Reply(`📜 Format: \`${pfx}setrules <teks aturan bot>\``);
            global.db.settings.botRules = body;
            return Reply('✅ Aturan resmi bot (`rules`) berhasil diperbarui!');
        }

        if (cmd === 'rules') {
            const custom = global.db?.settings?.botRules;
            const botname = global.botname || 'HuTao - MD';
            const rulesText = custom || (
                `1. Dilarang spam command secara berlebihan.\n` +
                `2. Dilarang menelpon/VC nomor bot (risiko blokir otomatis).\n` +
                `3. Dilarang menyalahgunakan bot untuk konten ilegal/penipuan.\n` +
                `4. Gunakan fitur sewajarnya dan patuhi aturan grup masing-masing.\n` +
                `5. Owner berhak memblokir user yang melanggar aturan.`
            );
            return Reply(`\`📜 PERATURAN ${botname.toUpperCase()}\`\n\n${rulesText}`);
        }

        return true;
    }
};
