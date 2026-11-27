const axios = require('axios');
const cheerio = require('cheerio');

const UA_APP = 'HuTaoBot/1.5 (+https://github.com/dinzid04/HuTao-MD)';
const UA_WEB = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const CRYPTO_ALIASES = {
    btc: 'bitcoin', bitcoin: 'bitcoin',
    eth: 'ethereum', ethereum: 'ethereum',
    sol: 'solana', solana: 'solana',
    bnb: 'binancecoin',
    usdt: 'tether',
    xrp: 'ripple',
    doge: 'dogecoin',
    ton: 'the-open-network',
    ada: 'cardano',
    trx: 'tron',
    matic: 'matic-network', pol: 'polygon-ecosystem-token'
};

module.exports = {
    name: 'elsyaa-search',
    category: 'search',
    commands: ['wiki', 'wikipedia', 'kripto', 'crypto', 'nasa', 'detik', 'cookpad', 'mcpedl', 'hokchar'],

    async execute(ctx) {
        const { Dinz, m, command, text, args, isCreator, Reply, checkLimit, addLimit, usedPrefix } = ctx;
        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();

        try {
            // 1. WIKIPEDIA (ID/EN — live-verified HTTP 200)
            if (cmd === 'wiki' || cmd === 'wikipedia') {
                const q = String(text || '').trim();
                if (!q) return Reply(`📚 Contoh: \`${pfx}wiki Majapahit\` atau \`${pfx}wiki en | Quantum computing\``);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

                let lang = 'id';
                let query = q;
                if (q.includes('|')) {
                    const [l, ...rest] = q.split('|');
                    if (/^[a-z]{2,3}$/i.test(l.trim())) {
                        lang = l.trim().toLowerCase();
                        query = rest.join('|').trim();
                    }
                }

                const searchRes = await axios.get(`https://${lang}.wikipedia.org/w/api.php`, {
                    params: { action: 'opensearch', search: query, limit: 3, format: 'json' },
                    headers: { 'User-Agent': UA_APP },
                    timeout: 12000
                });
                const title = searchRes.data?.[1]?.[0];
                if (!title) return Reply(`❌ Artikel Wikipedia untuk *${query}* tidak ditemukan.`);

                const sumRes = await axios.get(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
                    headers: { 'User-Agent': UA_APP },
                    timeout: 12000
                });
                const d = sumRes.data || {};
                const cap =
                    `\`📚 WIKIPEDIA (${lang.toUpperCase()})\`\n` +
                    `> ◦ *Judul :* ${d.title || title}\n` +
                    (d.description ? `> ◦ *Topik :* ${d.description}\n` : '') +
                    `> ◦ *Link :* ${d.content_urls?.desktop?.page || '-'}\n\n` +
                    `${String(d.extract || '-').slice(0, 1100)}`;

                if (d.thumbnail?.source) {
                    await Dinz.sendMessage(m.chat, { image: { url: d.thumbnail.source }, caption: cap }, { quoted: m });
                } else {
                    await Reply(cap);
                }
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            // 2. KRIPTO (CoinGecko live IDR + USD + 24h change — live-verified HTTP 200)
            if (cmd === 'kripto' || cmd === 'crypto') {
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const rawTokens = String(text || '').trim()
                    ? String(text).toLowerCase().split(/[\s,]+/).filter(Boolean).slice(0, 6)
                    : ['btc', 'eth', 'sol', 'bnb', 'ton', 'doge'];
                const ids = [...new Set(rawTokens.map((t) => CRYPTO_ALIASES[t] || t))];

                const res = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
                    params: { ids: ids.join(','), vs_currencies: 'idr,usd', include_24hr_change: 'true' },
                    headers: { 'User-Agent': UA_APP },
                    timeout: 12000
                });
                const data = res.data || {};
                const found = Object.entries(data);
                if (!found.length) return Reply(`❌ Koin *${rawTokens.join(', ')}* tidak ditemukan.\n> Contoh: \`${pfx}kripto btc eth sol\``);

                const rows = found.map(([id, v]) => {
                    const ch = Number(v.usd_24h_change || 0);
                    const icon = ch >= 0 ? '📈' : '📉';
                    return (
                        `*${id.toUpperCase()}* ${icon} (${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%)\n` +
                        `> ◦ IDR : *Rp ${Math.round(v.idr || 0).toLocaleString('id-ID')}*\n` +
                        `> ◦ USD : *$${Number(v.usd || 0).toLocaleString('en-US', { maximumFractionDigits: 4 })}*`
                    );
                });
                await Reply(`\`💹 HARGA KRIPTO LIVE (COINGECKO)\`\n\n${rows.join('\n\n')}`);
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            // 3. NASA MEDIA SEARCH (live-verified HTTP 200)
            if (cmd === 'nasa') {
                const q = String(text || '').trim() || 'nebula';
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const res = await axios.get('https://images-api.nasa.gov/search', {
                    params: { q, media_type: 'image' },
                    headers: { 'User-Agent': UA_APP },
                    timeout: 15000
                });
                const items = (res.data?.collection?.items || []).filter((it) => it?.links?.[0]?.href && it?.data?.[0]);
                if (!items.length) return Reply(`❌ Tidak ditemukan foto NASA untuk *${q}*.`);

                const pick = items[Math.floor(Math.random() * Math.min(items.length, 12))];
                const info = pick.data[0];
                const imgUrl = pick.links[0].href;
                const cap =
                    `\`🚀 NASA IMAGE ARCHIVE\`\n` +
                    `> ◦ *Judul :* ${info.title || '-'}\n` +
                    `> ◦ *Tanggal :* ${(info.date_created || '').slice(0, 10) || '-'}\n` +
                    `> ◦ *Center :* ${info.center || '-'}\n\n` +
                    `${String(info.description || '').replace(/<[^>]+>/g, '').slice(0, 500)}`;

                await Dinz.sendMessage(m.chat, { image: { url: imgUrl }, caption: cap }, { quoted: m });
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            // 4. DETIK NEWS (live-verified HTTP 200)
            if (cmd === 'detik') {
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const q = String(text || '').trim();
                const url = q
                    ? `https://www.detik.com/search/searchall?query=${encodeURIComponent(q)}`
                    : 'https://news.detik.com/indeks';
                const { data: html } = await axios.get(url, { headers: { 'User-Agent': UA_WEB }, timeout: 15000 });
                const $ = cheerio.load(html);
                const list = [];
                $('article').each((_, el) => {
                    const a = $(el).find('h2 a, h3 a, a.media__link').first();
                    const title = a.text().trim() || $(el).find('h2, h3').first().text().trim();
                    const link = a.attr('href') || $(el).find('a').first().attr('href');
                    if (title && link && /^https?:\/\//.test(link) && list.length < 8) {
                        list.push({ title: title.replace(/\s+/g, ' '), link });
                    }
                });
                if (!list.length) return Reply('❌ Tidak ada berita Detik ditemukan saat ini.');

                const body = list.map((b, i) => `*${i + 1}.* ${b.title}\n   🔗 ${b.link}`).join('\n\n');
                await Reply(`\`📰 DETIK NEWS${q ? ` — ${q.toUpperCase()}` : ' TERBARU'}\`\n\n${body}`);
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            // 5. COOKPAD RESEP MASAKAN (live-verified HTTP 200)
            if (cmd === 'cookpad') {
                const q = String(text || '').trim();
                if (!q) return Reply(`🍳 Cari resep masakan!\n> Contoh: \`${pfx}cookpad nasi goreng\``);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const { data: html } = await axios.get(`https://cookpad.com/id/cari/${encodeURIComponent(q)}`, {
                    headers: { 'User-Agent': UA_WEB, 'Accept-Language': 'id-ID,id;q=0.9' },
                    timeout: 15000
                });
                const $ = cheerio.load(html);
                const list = [];
                $('a[href^="/id/resep/"]').each((_, el) => {
                    const href = $(el).attr('href');
                    const title = $(el).text().replace(/\s+/g, ' ').trim();
                    if (href && title.length > 4 && !list.some((x) => x.href === href) && list.length < 8) {
                        list.push({ title, href: `https://cookpad.com${href}` });
                    }
                });
                if (!list.length) return Reply(`❌ Resep *${q}* tidak ditemukan di Cookpad.`);

                const body = list.map((r, i) => `*${i + 1}.* ${r.title}\n   🔗 ${r.href}`).join('\n\n');
                await Reply(`\`🍳 COOKPAD RESEP — ${q}\`\n\n${body}`);
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            // 6. MCPEDL (Minecraft PE Mods/Shaders — live-verified HTTP 200)
            if (cmd === 'mcpedl') {
                const q = String(text || '').trim();
                if (!q) return Reply(`⛏️ Cari mod/shader/map Minecraft PE!\n> Contoh: \`${pfx}mcpedl shader\``);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const res = await axios.get('https://api.mcpedl.com/api/search/advanced', {
                    params: { q, sort: 'relevance', page: 1 },
                    headers: { 'User-Agent': UA_APP },
                    timeout: 15000
                });
                const items = (res.data?.data || res.data?.results || []).slice(0, 8);
                if (!items.length) return Reply(`❌ Mod/Add-on *${q}* tidak ditemukan di MCPEDL.`);

                const body = items.map((it, i) => {
                    const slug = it.slug || it.url || '';
                    const link = slug.startsWith('http') ? slug : `https://mcpedl.com/${slug}/`;
                    return `*${i + 1}.* ${it.title || it.name || '-'}\n   🔗 ${link}`;
                }).join('\n\n');
                await Reply(`\`⛏️ MCPEDL SEARCH — ${q}\`\n\n${body}`);
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            // 7. HOKCHAR — Honor of Kings Hero Info (live-verified HTTP 200)
            if (cmd === 'hokchar') {
                const q = String(text || '').trim();
                if (!q) return Reply(`⚔️ Masukkan nama Hero Honor of Kings!\n> Contoh: \`${pfx}hokchar Arthur\``);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

                const sr = await axios.get('https://honor-of-kings.fandom.com/api.php', {
                    params: { action: 'opensearch', search: q, limit: 3, format: 'json' },
                    headers: { 'User-Agent': UA_APP },
                    timeout: 12000
                });
                const title = sr.data?.[1]?.[0];
                const pageUrl = sr.data?.[3]?.[0];
                if (!title) return Reply(`❌ Hero *${q}* tidak ditemukan di Wiki Honor of Kings.`);

                const det = await axios.get('https://honor-of-kings.fandom.com/api.php', {
                    params: { action: 'query', prop: 'extracts|pageimages', exintro: 1, explaintext: 1, pithumbsize: 500, titles: title, format: 'json' },
                    headers: { 'User-Agent': UA_APP },
                    timeout: 12000
                });
                const page = Object.values(det.data?.query?.pages || {})[0] || {};
                const cap =
                    `\`⚔️ HONOR OF KINGS — ${page.title || title}\`\n` +
                    `> ◦ *Wiki :* ${pageUrl || '-'}\n\n` +
                    `${String(page.extract || 'Informasi detail tersedia di halaman wiki.').slice(0, 750)}`;

                if (page.thumbnail?.source) {
                    await Dinz.sendMessage(m.chat, { image: { url: page.thumbnail.source }, caption: cap }, { quoted: m });
                } else {
                    await Reply(cap);
                }
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal memproses \`${pfx}${cmd}\`: ${err?.message || err}`);
        }
        return true;
    }
};
