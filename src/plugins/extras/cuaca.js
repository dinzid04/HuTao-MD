const { toBoldSans, toMono, toSmallCaps, formatCard, loadScraper } = require('./_helper');

module.exports = {
    name: 'cuaca',
    category: 'extras',
    commands: ['cuaca', 'weather', 'infocuaca'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, example } = ctx;

        if (!text) return Reply(example('Jakarta\n> Contoh lain: Bandung, Surabaya, Tokyo'));
        await Dinz.sendMessage(m.chat, { react: { text: '🌤️', key: m.key } }).catch(() => {});
        try {
            const weather = await loadScraper('weather.mjs');
            const data = await weather.getWeather(text.trim());
            if (!data?.success || !data?.current) {
                return Reply(`❌ Kota *${text.trim()}* tidak ditemukan.`);
            }
            const loc = data.location || {};
            const cur = data.current || {};
            const wind = cur.wind || {};
            const daily = Array.isArray(data.forecastDaily) ? data.forecastDaily.slice(0, 3) : [];

            let forecastText = '';
            if (daily.length > 0) {
                const dayLabels = ['Hari Ini', 'Besok', 'Lusa'];
                forecastText = `${toBoldSans('Prakiraan 3 Hari')}\n` + daily.map((d, i) => {
                    const dayLabel = dayLabels[i] || d.date || `Hari +${i + 1}`;
                    const cond = d.conditionDay?.text || d.condition?.text || '-';
                    const lo = d.tempMin ?? d.minTemp ?? '-';
                    const hi = d.tempMax ?? d.maxTemp ?? '-';
                    return `◦ ${toSmallCaps(dayLabel)} : ${cond} (${toMono(`${lo}°C - ${hi}°C`)})`;
                }).join('\n');
            }

            const caption = formatCard({
                icon: '🌤️',
                title: 'CUACA REALTIME',
                rows: [
                    { label: 'Lokasi', value: `${toBoldSans(loc.name || text)}${loc.affiliation ? `, ${loc.affiliation}` : ''}` },
                    { label: 'Kondisi', value: cur.condition?.text || '-' },
                    { label: 'Suhu', value: `${toMono(`${cur.temperature ?? '-'}°C`)} _(${toSmallCaps('terasa')} ${toMono(`${cur.feelsLike ?? '-'}°C`)})_` },
                    { label: 'Kelembaban', value: toMono(`${cur.humidity ?? '-'}%`) },
                    { label: 'Angin', value: `${toMono(`${wind.speedKmh ?? '-'} km/jam`)} (${wind.directionText || '-'})` },
                    { label: 'Tekanan', value: cur.pressure ? toMono(`${cur.pressure} hPa`) : '' },
                    { label: 'Indeks UV', value: cur.uvIndex !== undefined ? toMono(String(cur.uvIndex)) : '' }
                ],
                body: forecastText,
                footer: `Data realtime • ${global.botname || 'HuTao - MD'}`
            });
            return Reply(caption);
        } catch (e) {
            return Reply(`❌ Gagal mengambil info cuaca: ${e.message}`);
        }
        return true;
    }
};
