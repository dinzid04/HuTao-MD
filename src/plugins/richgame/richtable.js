const { formatCard, sendRichTable } = require('./_helper');

module.exports = {
    name: 'richtable',
    category: 'richgame',
    commands: ['richtable', 'tabelrich'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, botCtx, usedPrefix } = ctx;

        if (!text || !text.includes('|')) {
            return Reply(formatCard({
                icon: '🗂️',
                title: 'RICH TABLE BUILDER',
                body: `Buat tabel interaktif gaya Meta AI.\n\nFormat:\n\`${usedPrefix}richtable Judul | Kolom1,Kolom2 | Baris1A,Baris1B ; Baris2A,Baris2B\`\n\nContoh:\n\`${usedPrefix}richtable Harga Paket | Paket,Harga | Basic,10k ; Pro,25k\``
            }));
        }
        const parts = text.split('|').map((s) => s.trim());
        if (parts.length < 3) {
            return Reply('❌ Format butuh 3 bagian dipisah `|` (Judul | Header | Baris).');
        }
        const [title, rawHeader, rawRows] = parts;
        const headers = rawHeader.split(',').map((s) => s.trim()).filter(Boolean);
        const rows = rawRows
            .split(';')
            .map((r) => r.split(',').map((c) => c.trim()))
            .filter((r) => r.some(Boolean));

        if (!headers.length || !rows.length) {
            return Reply('❌ Header dan minimal 1 baris data tidak boleh kosong.');
        }

        await sendRichTable(Dinz, m, {
            title,
            intro: `📊 *${title}*`,
            headers,
            rows,
            footer: `© ${botCtx.getBotIdentity(Dinz).botname}`
        });
        return true;
    }
};
