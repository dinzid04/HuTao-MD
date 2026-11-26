const { callEngine, formatCard, toMono, toBoldSans, normalizeDigits } = require('./_helper');

module.exports = {
    name: 'callpair',
    category: 'call',
    commands: ['callpair', 'paircall'],

    async execute(ctx) {
        const { Dinz, m, args, text, body, isCreator, Reply, example, prefixMgr, usedPrefix } = ctx;
        const pfx = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : (usedPrefix || '.');

        if (!isCreator) return Reply(global.mess.owner);
        const rawPhone = normalizeDigits(text || args[0] || '');
        if (!rawPhone || rawPhone.length < 8) {
            return Reply(example('6281234567890'));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        try {
            const res = await callEngine.requestPair(rawPhone);
            await Dinz.sendMessage(m.chat, { react: { text: '🔑', key: m.key } }).catch(() => {});
            return Reply(formatCard({
                icon: '🔑',
                title: 'PAIRING CODE MEOWCALLER',
                rows: [
                    { label: 'Nomor', value: toMono(`+${res.phone || rawPhone}`) },
                    { label: 'Kode', value: `*${toBoldSans(res.code)}*` }
                ],
                body: [
                    `1. Buka WhatsApp di HP nomor ${toMono(`+${res.phone || rawPhone}`)}.`,
                    `2. Masuk *Perangkat Tertaut* -> *Tautkan Perangkat*.`,
                    `3. Pilih *Tautkan dengan nomor telepon* lalu masukkan kode di atas.`,
                    `4. Cek status dengan ${toMono(`${pfx}callstatus`)}.`
                ].join('\n'),
                footer: 'bisa memakai nomor yang sama dengan bot (multi-device) atau nomor cadangan'
            }));
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal pairing caller: ${err.message}`);
        }
        return true;
    }
};
