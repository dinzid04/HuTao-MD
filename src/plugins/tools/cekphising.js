const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'cekphising',
    category: 'tools',
    commands: ['cekphising', 'phisingataubukan', 'scanurl'],

    async execute(ctx) {
        const { Dinz, m, args, text, Reply, axios, usedPrefix } = ctx;

        const url = (args[0] || '').trim();
        if (!/^https?:\/\//i.test(url)) {
            return Reply(`🛡️ Masukkan URL lengkap (diawali http/https).\nContoh: \`${usedPrefix}cekphising https://google.com\``);
        }
        await Dinz.sendMessage(m.chat, { react: { text: '🛡️', key: m.key } }).catch(() => {});
        try {
            const { data } = await axios.get(`https://api.nexray.eu.cc/tools/webphishing?url=${encodeURIComponent(url)}`, { timeout: 15000 });
            const r = data?.result;
            if (!data?.status || !r) return Reply('❌ Gagal memindai URL saat ini.');
            const card = formatCard({
                icon: '🛡️',
                title: 'URL PHISHING SCANNER',
                rows: [
                    { label: 'URL', value: r.scanned_url || url },
                    { label: 'Status', value: r.status_description || '-' },
                    { label: 'Phising', value: r.is_phishing ? '🚨 Ya' : '✅ Tidak' },
                    { label: 'Malware', value: r.contains_malware ? '🚨 Ya' : '✅ Tidak' },
                    { label: 'Situs Berbahaya', value: r.sends_to_harmful_sites ? '🚨 Ya' : '✅ Tidak' },
                    { label: 'Software Jahat', value: r.installs_malicious_software ? '🚨 Ya' : '✅ Tidak' }
                ]
            });
            await Reply(card);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            return Reply(`❌ Gagal scan URL: ${e.message}`);
        }
        return true;
    }
};
