const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'ipwho',
    category: 'tools',
    commands: ['ipwho', 'iplookup', 'ipinfo'],

    async execute(ctx) {
        const { Dinz, m, args, text, quoted, Reply, axios, usedPrefix } = ctx;

        const ip = (args[0] || '').trim();
        if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
            return Reply(`🌐 Masukkan IPv4 yang valid.\nContoh: \`${usedPrefix}ipwho 8.8.8.8\``);
        }
        await Dinz.sendMessage(m.chat, { react: { text: '🔍', key: m.key } }).catch(() => {});
        try {
            const { data } = await axios.get(`https://ipwho.is/${ip}`, { timeout: 12000 });
            if (!data?.success) return Reply(`❌ IP *${ip}* tidak valid atau privat.`);
            if (data.latitude && data.longitude) {
                await Dinz.sendMessage(m.chat, {
                    location: { degreesLatitude: data.latitude, degreesLongitude: data.longitude }
                }, { quoted: m }).catch(() => {});
            }
            const card = formatCard({
                icon: '🌐',
                title: `IP LOOKUP: ${data.ip}`,
                rows: [
                    { label: 'Negara', value: `${data.country} (${data.country_code})` },
                    { label: 'Kota / Region', value: `${data.city || '-'}, ${data.region || '-'}` },
                    { label: 'Timezone', value: data.timezone?.id || '-' },
                    { label: 'ISP', value: data.connection?.isp || '-' },
                    { label: 'Org / ASN', value: `${data.connection?.org || '-'} (AS${data.connection?.asn || '-'})` },
                    { label: 'Koordinat', value: `${data.latitude}, ${data.longitude}` }
                ]
            });
            await Reply(card);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            return Reply(`❌ Gagal lookup IP: ${e.message}`);
        }
        return true;
    }
};
