const dns = require('dns').promises;
const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'dnslookup',
    category: 'tools',
    commands: ['dnslookup', 'lookup'],

    async execute(ctx) {
        const { Dinz, m, args, text, body, Reply, axios, usedPrefix } = ctx;

        let domain = (args[0] || '').trim().replace(/^https?:\/\//i, '').split('/')[0];
        if (!domain || !domain.includes('.')) {
            return Reply(`🌐 Masukkan domain yang valid.\nContoh: \`${usedPrefix}dnslookup google.com\``);
        }
        await Dinz.sendMessage(m.chat, { react: { text: '🔍', key: m.key } }).catch(() => {});
        try {
            let resultText = '';
            try {
                const { data } = await axios.get(`https://api.hackertarget.com/dnslookup/?q=${encodeURIComponent(domain)}`, { timeout: 10000 });
                if (typeof data === 'string' && !data.toLowerCase().includes('error') && !data.includes('API count')) {
                    resultText = data.trim().slice(0, 1200);
                }
            } catch (_) {}
            if (!resultText) {
                const [aRec, mxRec, nsRec] = await Promise.all([
                    dns.resolve4(domain).catch(() => []),
                    dns.resolveMx(domain).catch(() => []),
                    dns.resolveNs(domain).catch(() => [])
                ]);
                resultText = [
                    `A: ${aRec.join(', ') || '-'}`,
                    `MX: ${mxRec.map((m) => m.exchange).join(', ') || '-'}`,
                    `NS: ${nsRec.join(', ') || '-'}`
                ].join('\n');
            }
            await Reply(formatCard({ icon: '🌐', title: `DNS LOOKUP: ${domain}`, body: resultText }));
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            return Reply(`❌ Gagal DNS lookup: ${e.message}`);
        }
        return true;
    }
};
