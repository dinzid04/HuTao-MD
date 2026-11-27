const axios = require('axios');
const cheerio = require('cheerio');

const ANILIST_URL = 'https://graphql.anilist.co';
const UA_APP = 'HuTaoBot/1.5 (+https://github.com/dinzid04/HuTao-MD)';
const UA_WEB = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function stripHtml(html) {
    return String(html || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#039;|&apos;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

async function queryAniList(query, variables = {}) {
    const res = await axios.post(
        ANILIST_URL,
        { query, variables },
        {
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA_APP },
            timeout: 15000
        }
    );
    return res.data?.data || null;
}

async function fetchBooruSafe(site, tagQuery) {
    const base = site === 'yande' ? 'https://yande.re/post.json' : 'https://konachan.net/post.json';
    const cleanTag = String(tagQuery || '').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_()\-]/g, '');
    const tags = cleanTag ? `${cleanTag} rating:safe` : 'rating:safe';
    const page = cleanTag ? 1 : (Math.floor(Math.random() * 15) + 1);
    const res = await axios.get(base, {
        params: { limit: 20, page, tags },
        headers: { 'User-Agent': UA_APP },
        timeout: 15000
    });
    const list = Array.isArray(res.data)
        ? res.data.filter((p) => p && (p.sample_url || p.file_url) && p.rating === 's')
        : [];
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
}

module.exports = {
    name: 'anime-suite',
    category: 'anime',
    commands: [
        'anilist', 'topanime', 'anischedule', 'jadwalanime',
        'rekomanime', 'tracemoe', 'whatanime',
        'konachan', 'yande', 'animewall', 'kusonime'
    ],

    async execute(ctx) {
        const { Dinz, m, command, text, args, quoted, qmsg, mime, isCreator, Reply, checkLimit, addLimit, usedPrefix } = ctx;
        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();

        try {
            if (cmd === 'anilist') {
                const q = String(text || '').trim();
                if (!q) return Reply(`🍥 Masukkan judul anime!\n> Contoh: \`${pfx}anilist Sousou no Frieren\``);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

                const gql = `query ($search: String) {
                    Media(search: $search, type: ANIME) {
                        id siteUrl format status episodes duration season seasonYear averageScore popularity
                        title { romaji english native }
                        genres
                        studios(isMain: true) { nodes { name } }
                        coverImage { extraLarge large }
                        description(asHtml: false)
                    }
                }`;
                const data = await queryAniList(gql, { search: q });
                const a = data?.Media;
                if (!a) return Reply(`❌ Anime *${q}* tidak ditemukan di AniList.`);

                const studio = (a.studios?.nodes || []).map((s) => s.name).join(', ') || '-';
                const desc = stripHtml(a.description).slice(0, 480);
                const cap =
                    `\`🍥 ANILIST — ${a.title?.romaji || q}\`\n` +
                    (a.title?.english && a.title.english !== a.title.romaji ? `> ◦ *English :* ${a.title.english}\n` : '') +
                    `> ◦ *Format :* ${a.format || '-'} • *Status :* ${a.status || '-'}\n` +
                    `> ◦ *Episode :* ${a.episodes || '?'} (${a.duration || '?'} mnt/eps)\n` +
                    `> ◦ *Rilis :* ${a.season || '-'} ${a.seasonYear || ''}\n` +
                    `> ◦ *Skor :* ⭐ ${a.averageScore ? `${a.averageScore}/100` : '-'}\n` +
                    `> ◦ *Studio :* ${studio}\n` +
                    `> ◦ *Genre :* ${(a.genres || []).join(', ') || '-'}\n` +
                    `> ◦ *Link :* ${a.siteUrl || '-'}\n\n` +
                    `📖 *Sinopsis:*\n${desc}${desc.length >= 480 ? '...' : ''}`;

                const cover = a.coverImage?.extraLarge || a.coverImage?.large;
                if (cover) {
                    await Dinz.sendMessage(m.chat, { image: { url: cover }, caption: cap }, { quoted: m });
                } else {
                    await Reply(cap);
                }
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'topanime') {
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const gql = `query {
                    Page(page: 1, perPage: 10) {
                        media(type: ANIME, sort: SCORE_DESC) {
                            title { romaji english }
                            averageScore episodes seasonYear format siteUrl
                            coverImage { large }
                        }
                    }
                }`;
                const data = await queryAniList(gql);
                const list = data?.Page?.media || [];
                if (!list.length) return Reply('❌ Gagal mengambil daftar Top Anime.');

                const rows = list.map((a, i) =>
                    `*${i + 1}. ${a.title?.romaji || '-'}*\n` +
                    `   ⭐ ${a.averageScore || '-'}/100 • ${a.format || '-'} • ${a.episodes || '?'} eps (${a.seasonYear || '-'})`
                );
                const cap = `\`🏆 TOP 10 ANIME TERBAIK (ANILIST)\`\n\n${rows.join('\n\n')}`;
                const cover = list[0]?.coverImage?.large;
                if (cover) {
                    await Dinz.sendMessage(m.chat, { image: { url: cover }, caption: cap }, { quoted: m });
                } else {
                    await Reply(cap);
                }
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'anischedule' || cmd === 'jadwalanime') {
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const nowSec = Math.floor(Date.now() / 1000);
                const endSec = nowSec + 48 * 3600;
                const gql = `query ($s: Int, $e: Int) {
                    Page(page: 1, perPage: 15) {
                        airingSchedules(airingAt_greater: $s, airingAt_lesser: $e, sort: TIME) {
                            episode airingAt
                            media { title { romaji } format isAdult }
                        }
                    }
                }`;
                const data = await queryAniList(gql, { s: nowSec, e: endSec });
                const list = (data?.Page?.airingSchedules || []).filter((x) => !x.media?.isAdult).slice(0, 12);
                if (!list.length) return Reply('❌ Tidak ada jadwal tayang anime dalam 48 jam ke depan.');

                const lines = list.map((x, i) => {
                    const dt = new Date(x.airingAt * 1000);
                    const wib = dt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short', hour: '2-digit', minute: '2-digit' });
                    return `> *${i + 1}.* ${x.media?.title?.romaji || '-'} *(Eps ${x.episode})*\n   ⏰ ${wib} WIB`;
                });
                await Reply(`\`📅 JADWAL TAYANG ANIME (48 JAM KE DEPAN)\`\n\n${lines.join('\n')}`);
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'rekomanime') {
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const randPage = Math.floor(Math.random() * 25) + 1;
                const gql = `query ($p: Int) {
                    Page(page: $p, perPage: 10) {
                        media(type: ANIME, sort: SCORE_DESC, averageScore_greater: 76, isAdult: false) {
                            title { romaji english }
                            averageScore episodes format seasonYear genres siteUrl
                            coverImage { extraLarge large }
                            description(asHtml: false)
                        }
                    }
                }`;
                const data = await queryAniList(gql, { p: randPage });
                const list = data?.Page?.media || [];
                const a = list[Math.floor(Math.random() * list.length)];
                if (!a) return Reply('❌ Gagal mengambil rekomendasi anime.');

                const desc = stripHtml(a.description).slice(0, 420);
                const cap =
                    `\`✨ REKOMENDASI ANIME\`\n` +
                    `> ◦ *Judul :* ${a.title?.romaji || '-'}\n` +
                    `> ◦ *Skor :* ⭐ ${a.averageScore || '-'}/100 • ${a.format || '-'} (${a.seasonYear || '-'})\n` +
                    `> ◦ *Episode :* ${a.episodes || '?'}\n` +
                    `> ◦ *Genre :* ${(a.genres || []).join(', ') || '-'}\n` +
                    `> ◦ *Link :* ${a.siteUrl || '-'}\n\n` +
                    `📖 ${desc}${desc.length >= 420 ? '...' : ''}`;
                const cover = a.coverImage?.extraLarge || a.coverImage?.large;
                if (cover) await Dinz.sendMessage(m.chat, { image: { url: cover }, caption: cap }, { quoted: m });
                else await Reply(cap);
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'tracemoe' || cmd === 'whatanime') {
                const isImg = /image/i.test(mime || '') || m.quoted?.type === 'imageMessage' || m.type === 'imageMessage';
                if (!isImg) return Reply(`🔎 Reply atau kirim *screenshot anime* dengan caption \`${pfx}tracemoe\`!`);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

                let imgBuf = null;
                if (typeof qmsg?.download === 'function') imgBuf = await qmsg.download();
                else if (typeof quoted?.download === 'function') imgBuf = await quoted.download();
                else imgBuf = await Dinz.downloadMediaMessage(quoted || m);
                if (!imgBuf?.length) return Reply('❌ Gagal mengunduh gambar.');

                const res = await axios.post('https://api.trace.moe/search?anilistInfo', imgBuf, {
                    headers: { 'Content-Type': mime || 'image/jpeg', 'User-Agent': UA_APP },
                    timeout: 25000
                });
                const best = res.data?.result?.[0];
                if (!best) return Reply('❌ Scene anime tidak ditemukan di database Trace.moe.');

                const fmtSec = (s) => {
                    const sec = Math.max(0, Math.floor(Number(s) || 0));
                    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
                };
                const title = best.anilist?.title?.romaji || best.anilist?.title?.english || best.filename || '-';
                const sim = ((best.similarity || 0) * 100).toFixed(1);
                const cap =
                    `\`🔎 TRACE.MOE — HASIL PENCARIAN ANIME\`\n` +
                    `> ◦ *Judul :* ${title}\n` +
                    (best.anilist?.title?.native ? `> ◦ *Native :* ${best.anilist.title.native}\n` : '') +
                    `> ◦ *Episode :* ${best.episode ?? '-'}\n` +
                    `> ◦ *Timestamp :* ${fmtSec(best.from)} - ${fmtSec(best.to)}\n` +
                    `> ◦ *Kemiripan :* ${sim}%\n` +
                    `> ◦ *Status 18+ :* ${best.anilist?.isAdult ? 'Ya' : 'Tidak'}`;

                if (best.image) {
                    await Dinz.sendMessage(m.chat, { image: { url: best.image }, caption: cap }, { quoted: m });
                } else {
                    await Reply(cap);
                }
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'konachan' || cmd === 'yande' || cmd === 'animewall') {
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const site = cmd === 'yande' ? 'yande' : 'konachan';
                let post = await fetchBooruSafe(site, text);
                if (!post && cmd === 'animewall') {
                    post = await fetchBooruSafe('yande', text);
                }
                if (!post) return Reply(`❌ Gambar anime aman (SFW) untuk *${text || 'random'}* tidak ditemukan.`);

                const imgUrl = post.sample_url || post.file_url;
                const cap =
                    `\`🖼️ ${cmd.toUpperCase()} (SFW)\`\n` +
                    `> ◦ *Resolusi :* ${post.width || '?'}x${post.height || '?'}\n` +
                    `> ◦ *Tags :* ${String(post.tags || '').split(' ').slice(0, 8).join(', ')}`;
                await Dinz.sendMessage(m.chat, { image: { url: imgUrl }, caption: cap }, { quoted: m });
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            if (cmd === 'kusonime') {
                const q = String(text || '').trim();
                if (!q) return Reply(`🍥 Masukkan judul anime yang dicari!\n> Contoh: \`${pfx}kusonime Naruto\``);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

                const { data: html } = await axios.get(`https://kusonime.com/?s=${encodeURIComponent(q)}`, {
                    headers: { 'User-Agent': UA_WEB },
                    timeout: 15000
                });
                const $ = cheerio.load(html);
                const items = [];
                $('.kover, .detpost').each((_, el) => {
                    const a = $(el).find('h2 a, .episodeye a').first();
                    const title = a.text().trim();
                    const href = a.attr('href');
                    if (title && href && items.length < 8) {
                        items.push({ title, href });
                    }
                });
                if (!items.length) return Reply(`❌ Anime *${q}* tidak ditemukan di Kusonime.`);

                const lines = items.map((it, i) => `*${i + 1}.* ${it.title}\n   🔗 ${it.href}`);
                await Reply(`\`🍥 KUSONIME SEARCH — ${q}\`\n\n${lines.join('\n\n')}`);
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
