const cheerio = require('cheerio');
const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'infotourney',
    category: 'tools',
    commands: ['infotourney', 'tourney', 'mltourney'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, moment, axios } = ctx;

        await Dinz.sendMessage(m.chat, { react: { text: '🏆', key: m.key } }).catch(() => {});
        try {
            const url = 'https://infotourney.com/tournament/mobile-legends';
            const { data } = await axios.get(url, {
                timeout: 15000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const $ = cheerio.load(data);
            const items = [];
            $('.items-row .item').each((_, el) => {
                if (items.length >= 5) return;
                const item = $(el);
                const title = item.find('h2[itemprop="name"] a').text().trim();
                const href = item.find('h2[itemprop="name"] a').attr('href');
                const dt = item.find('time[itemprop="datePublished"]').attr('datetime');
                if (title && href) {
                    items.push({
                        title,
                        date: dt ? moment(dt).tz('Asia/Jakarta').format('DD MMM YYYY') : '-',
                        link: new URL(href, url).href
                    });
                }
            });
            if (!items.length) return Reply('❌ Tidak ada daftar turnamen yang ditemukan.');
            const body = items.map((t, i) => `${i + 1}. *${t.title}*\n   📅 ${t.date}\n   🔗 ${t.link}`).join('\n\n');
            await Reply(formatCard({ icon: '🏆', title: 'INFO TURNAMEN MLBB', body, footer: 'Sumber: infotourney.com' }));
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            return Reply(`❌ Gagal mengambil info turnamen: ${e.message}`);
        }
        return true;
    }
};
