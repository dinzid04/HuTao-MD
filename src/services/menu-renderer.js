const fs = require('fs');
const path = require('path');
const https = require('https');
const axios = require('axios');
const moment = require('moment-timezone');
const {
    toMono,
    toBoldSans,
    toSmallCaps,
    toSpacedBoldSans,
    toSpacedSmallCaps
} = require('../utils/formatter');

let sharp = null;
try { sharp = require('sharp'); } catch (_) {}
let createCanvas = null, loadImage = null;
try { ({ createCanvas, loadImage } = require('canvas')); } catch (_) {}

const MENU_STYLES = [
    {
        id: 1,
        key: 'default',
        name: 'HuTao Clean List',
        source: 'Default',
        desc: 'Kartu interaktif dengan gambar, layout rapi ala HuTao & tombol List Menu.'
    },
    {
        id: 2,
        key: 'hutao-img',
        name: 'Hutao Image Clean',
        source: 'Hutao',
        desc: 'Tampilan foto menu + caption tertata ala HuTao dengan 3 font pilihan.'
    },
    {
        id: 3,
        key: 'hutao-btn',
        name: 'Hutao Interactive + Quick Reply',
        source: 'Hutao',
        desc: 'Tampilan clean HuTao + tombol Quick Reply & dropdown 2 kategori.'
    },
    {
        id: 4,
        key: 'hutao-doc',
        name: 'Hutao Document Thumbnail',
        source: 'Hutao',
        desc: 'Tampilan dokumen ber-thumbnail + caption clean tertata ala HuTao.'
    },
    {
        id: 5,
        key: 'dual-select',
        name: 'Dual-Select Interactive',
        source: 'Clean',
        desc: 'Layout clean dengan 2 tombol dropdown (Menu Utama & Selengkapnya).'
    },
    {
        id: 6,
        key: 'offer-card',
        name: 'Offer Banner Interactive',
        source: 'Clean',
        desc: 'Kartu interaktif dengan banner sapaan waktu + readmore pada allmenu.'
    },
    {
        id: 7,
        key: 'loc-card',
        name: 'Location Header Interactive',
        source: 'Clean',
        desc: 'Kartu interaktif dengan header lokasi ber-thumbnail & layout clean.'
    }
];

const MENU_CATEGORIES = [
    { group: 'main', title: 'All Menu', emoji: '📚', cmd: 'allmenu', desc: 'Tampilkan seluruh perintah bot' },
    { group: 'main', title: 'Menu Owner', emoji: '👑', cmd: 'menu-owner', desc: 'Kontrol Owner & Pengaturan Bot' },
    { group: 'main', title: 'Menu Setup Bot', emoji: '⚙️', cmd: 'menu-setup', desc: 'Rename Bot, Owner, Thumb, Pay & Audio' },
    { group: 'main', title: 'Menu Setup Cloner', emoji: '🧩', cmd: 'menu-cloner', desc: 'Rename & Setup Terisolasi Bot Clone' },
    { group: 'main', title: 'Menu Group', emoji: '👥', cmd: 'menu-group', desc: 'Manajemen Grup, CekOnline & Sider' },
    { group: 'main', title: 'Menu Store', emoji: '🏪', cmd: 'menu-store', desc: 'List Produk, QRIS Dinamis & Kasir' },
    { group: 'main', title: 'Menu Cpanel V1', emoji: '🖥️', cmd: 'menu-cpanel-v1', desc: 'Pterodactyl Server V1' },
    { group: 'main', title: 'Menu Cpanel V2', emoji: '🖥️', cmd: 'menu-cpanel-v2', desc: 'Pterodactyl Server V2' },
    { group: 'main', title: 'Menu Cpanel V3', emoji: '🖥️', cmd: 'menu-cpanel-v3', desc: 'Pterodactyl Server V3' },
    { group: 'main', title: 'Menu Rich & Game', emoji: '🎮', cmd: 'menu-rich', desc: 'Rich HTML Games, Chess Co-op & Meta AI' },
    { group: 'main', title: 'Menu LID Inspector', emoji: '🪪', cmd: 'menu-lid', desc: 'Cek LID, JID & WA Stalk' },
    { group: 'main', title: 'Menu Clan', emoji: '⚔️', cmd: 'menu-clan', desc: 'Guild & Clan War' },
    { group: 'feature', title: 'Menu AI', emoji: '🤖', cmd: 'menu-ai', desc: 'Gemini, ChatGPT, DeepSeek, Flux, dll' },
    { group: 'feature', title: 'Menu Audio Studio', emoji: '🎧', cmd: 'menu-audio', desc: 'Bassboost, Slowed, Nightcore, 8D, CutAudio' },
    { group: 'feature', title: 'Menu Call', emoji: '📹', cmd: 'menu-call', desc: 'PlayCall Video & Musik YouTube' },
    { group: 'feature', title: 'Menu Download', emoji: '📥', cmd: 'menu-download', desc: 'YouTube, YTMusic, TikTok, IG, dll' },
    { group: 'feature', title: 'Menu Search', emoji: '🔍', cmd: 'menu-search', desc: 'Play, YTS, Pinterest, Lirik, dll' },
    { group: 'feature', title: 'Menu Stiker', emoji: '🖼️', cmd: 'menu-stiker', desc: 'Sticker, Brat, QC, Stiker.ly, SReact' },
    { group: 'feature', title: 'Menu Maker', emoji: '🎨', cmd: 'menu-maker', desc: 'HD, Remini, RemoveBG, IQC' },
    { group: 'feature', title: 'Menu Ephoto360', emoji: '✨', cmd: 'menu-ephoto', desc: 'Efek Teks Ephoto360' },
    { group: 'feature', title: 'Menu RPG', emoji: '🗡️', cmd: 'menu-rpg', desc: 'Petualangan, Shop, BuyLimit, Leaderboard' },
    { group: 'feature', title: 'Menu Game', emoji: '🎯', cmd: 'menu-game', desc: 'Mini Games & Tebak-tebakan' },
    { group: 'feature', title: 'Menu Tools', emoji: '🛠️', cmd: 'menu-tools', desc: 'Tourl, Converter, TTS, OCR, dll' },
    { group: 'feature', title: 'Menu Extra', emoji: '🌟', cmd: 'menu-extra', desc: 'Cuaca, TempMail, JOOX, DramaBox' },
    { group: 'feature', title: 'Menu Fun', emoji: '🎲', cmd: 'menu-fun', desc: 'Confess, Couple, Cek Khodam, dll' },
    { group: 'feature', title: 'Menu Primbon', emoji: '🔮', cmd: 'menu-primbon', desc: 'Weton, Zodiak, Ramalan, Tarot' },
    { group: 'feature', title: 'Menu Stalk', emoji: '🕵️', cmd: 'menu-stalk', desc: 'MLBB, FF, Roblox, IG, TikTok' },
    { group: 'feature', title: 'Menu Islami', emoji: '🕌', cmd: 'menu-islami', desc: 'Al-Quran, Jadwal Sholat, Doa' },
    { group: 'feature', title: 'Menu Premium', emoji: '💎', cmd: 'menu-prem', desc: 'Fitur Khusus User Premium' },
    { group: 'feature', title: 'Menu Jadibot', emoji: '🔗', cmd: 'menu-jadibot', desc: 'Clone & Kelola Jadibot' },
    { group: 'feature', title: 'Menu Alight Motion', emoji: '🎬', cmd: 'menu-am', desc: 'Alight Motion Auto Bulk & Reseller' },
    { group: 'feature', title: 'Menu Jpm', emoji: '📢', cmd: 'menu-jpm', desc: 'Broadcast & Push Kontak' },
    { group: 'feature', title: 'Menu Auto Join', emoji: '🚪', cmd: 'menu-join', desc: 'Auto Join Grup Otomatis' },
    { group: 'feature', title: 'Menu Enc', emoji: '🔐', cmd: 'menu-enc', desc: 'Obfuscator & Enkripsi JS' }
];

function getMenuStyle(settings) {
    const raw = settings?.menuStyle;
    const num = parseInt(raw, 10);
    if (num >= 1 && num <= MENU_STYLES.length) return num;
    return 1;
}

function resolveStyleInput(input) {
    const clean = String(input || '').trim().toLowerCase();
    if (!clean) return null;
    const directNum = parseInt(clean.replace(/^v/i, ''), 10);
    if (directNum >= 1 && directNum <= MENU_STYLES.length) return directNum;

    const aliasMap = {
        default: 1, hutao0: 1, normal: 1, reset: 1,
        hutao: 2, hutao1: 2, 'hutao-img': 2, image: 2,
        hutao2: 3, 'hutao-btn': 3, button: 3,
        hutao3: 4, 'hutao-doc': 4, doc: 4, document: 4,
        ourin: 5, ourin1: 5, 'ourin-v1': 5, 'dual-select': 5, dual: 5,
        ourin2: 6, 'ourin-v2': 6, 'offer-card': 6, offer: 6,
        ourin3: 7, 'ourin-loc': 7, 'loc-card': 7, loc: 7, location: 7
    };
    if (aliasMap[clean]) return aliasMap[clean];

    const byKey = MENU_STYLES.find((s) => s.key === clean);
    return byKey ? byKey.id : null;
}

function getStyleInfo(styleId) {
    return MENU_STYLES.find((s) => s.id === Number(styleId)) || MENU_STYLES[0];
}

function formatUptime(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(`${d} Hari`);
    if (h > 0 || d > 0) parts.push(`${h} Jam`);
    parts.push(`${m} Menit`);
    return parts.join(', ');
}

function getTimeGreeting() {
    const hour = moment().tz(global.timezone || 'Asia/Jakarta').hour();
    if (hour >= 4 && hour < 11) return 'Selamat Pagi 🌅';
    if (hour >= 11 && hour < 15) return 'Selamat Siang ☀️';
    if (hour >= 15 && hour < 18) return 'Selamat Sore 🌇';
    return 'Selamat Malam 🌙';
}

function prefixCmd(cmd, activePrefix) {
    const raw = String(cmd || '').trim();
    if (!raw) return '';
    if (!activePrefix) return raw;
    if (raw.startsWith(activePrefix)) return raw;
    return `${activePrefix}${raw}`;
}

function formatSectionHeader(rawTitle, { stripMenuPrefix = false } = {}) {
    let clean = String(rawTitle || 'MENU')
        .replace(/[^\w\s&()+-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (stripMenuPrefix) {
        clean = clean.replace(/^menu\s+/i, '').trim() || clean;
    }
    clean = clean.replace(/\s*&\s*/g, ' ').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
    const upper = clean.toUpperCase();
    if ([...upper].length <= 9) {
        return `\`[ ${toSpacedBoldSans(upper)} ]\``;
    }
    return `\`[ ${toBoldSans(upper)} ]\``;
}

function normalizeMenuItemText(rawItem) {
    const trimmed = String(rawItem || '').replace(/\r?\n+/g, ' ').trim();
    if (!trimmed) return '';
    const parenIdx = trimmed.indexOf('(');
    if (parenIdx > 0) {
        const mainPart = trimmed.slice(0, parenIdx).trim();
        const notePart = trimmed.slice(parenIdx).trim();
        if ([...notePart].length > 14 || [...trimmed].length > 22) {
            return mainPart;
        }
    }
    return trimmed;
}

function formatMenuItemInline(rawItem, activePrefix) {
    const compact = normalizeMenuItemText(rawItem);
    if (!compact) return '';
    const prefixed = prefixCmd(compact, activePrefix);

    const parenIdx = prefixed.indexOf('(');
    if (parenIdx > 0) {
        const mainPart = prefixed.slice(0, parenIdx).trim();
        const notePart = prefixed.slice(parenIdx).trim();
        return `${toMono(mainPart)} _${toSmallCaps(notePart)}_`;
    }
    return toMono(prefixed);
}

function formatMenuItemLine(rawItem, activePrefix) {
    const inline = formatMenuItemInline(rawItem, activePrefix);
    if (!inline) return '';
    return `> ◦ ${inline}`;
}

function parseShikiMenuBlocks(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];
    const lines = rawText.split(/\r?\n/);
    const blocks = [];
    let current = null;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line === '┃' || /^╰━+╯$/.test(line) || /^┗━+┛?$/.test(line)) continue;

        const shikiHeader = line.match(/^`⌜\s*(.+?)\s*⌟`$/);
        if (shikiHeader) {
            current = { title: shikiHeader[1].trim(), items: [] };
            blocks.push(current);
            continue;
        }

        const bracketHeader = line.match(/^`\[\s*(.+?)\s*\]`$/);
        if (bracketHeader) {
            current = { title: bracketHeader[1].trim(), items: [] };
            blocks.push(current);
            continue;
        }

        const fancyHeader = line.match(/^╭━+〔\s*(.+?)\s*〕━+╮$/);
        if (fancyHeader) {
            const cleanTitle = fancyHeader[1].replace(/\*/g, '').trim();
            current = { title: cleanTitle, items: [] };
            blocks.push(current);
            continue;
        }

        const cmdMatch = line.match(/^(?:>\s*◦|┃\s*◦)\s*(.+)$/);
        if (cmdMatch) {
            if (!current) {
                current = { title: 'Menu', items: [] };
                blocks.push(current);
            }
            current.items.push({ type: 'cmd', text: cmdMatch[1].trim() });
            continue;
        }

        const subHeader = line.match(/^(?:┃|>\s*✦)\s*(.+)$/);
        if (subHeader) {
            if (!current) {
                current = { title: 'Menu', items: [] };
                blocks.push(current);
            }
            current.items.push({ type: 'sub', text: subHeader[1].replace(/\*/g, '').trim() });
        }
    }

    return blocks;
}

function compareLengthThenAlpha(aStr, bStr) {
    const cleanA = normalizeMenuItemText(aStr);
    const cleanB = normalizeMenuItemText(bStr);
    const lenDiff = [...cleanA].length - [...cleanB].length;
    if (lenDiff !== 0) return lenDiff;
    return cleanA.localeCompare(cleanB, 'en', { numeric: true, sensitivity: 'base' });
}

function sortMenuItems(items) {
    const result = [];
    let bucket = [];
    const flush = () => {
        if (!bucket.length) return;
        bucket.sort((a, b) => compareLengthThenAlpha(a.text, b.text));
        result.push(...bucket);
        bucket = [];
    };
    for (const item of items || []) {
        if (item.type === 'sub') {
            flush();
            result.push(item);
        } else {
            bucket.push(item);
        }
    }
    flush();
    return result;
}

// WhatsApp membatasi maksimal ~500 baris blockquote (`> `) dalam 1 pesan.
// Agar allmenu tetap menyatu dalam 1 pesan penuh tanpa bug `>` mentah,
// jika total baris `> ` melebihi 450 maka beberapa command dipadatkan per baris (2-3 kolom).
const MAX_WA_QUOTE_LINES = 450;

function countQuoteLines(text) {
    const matches = String(text || '').match(/^>\s/gm);
    return matches ? matches.length : 0;
}

function buildBlockLines(sortedItems, activePrefix, itemsPerLine = 1) {
    if (itemsPerLine <= 1) {
        return sortedItems.map((item) => {
            if (item.type === 'sub') return `> *${toSmallCaps(item.text)}*`;
            return formatMenuItemLine(item.text, activePrefix);
        }).filter(Boolean);
    }

    const lines = [];
    let row = [];
    const flushRow = () => {
        if (!row.length) return;
        lines.push(`> ◦ ${row.join('  ·  ')}`);
        row = [];
    };

    for (const item of sortedItems) {
        if (item.type === 'sub') {
            flushRow();
            lines.push(`> *${toSmallCaps(item.text)}*`);
            continue;
        }
        const inline = formatMenuItemInline(item.text, activePrefix);
        if (!inline) continue;
        row.push(inline);
        if (row.length >= itemsPerLine) {
            flushRow();
        }
    }
    flushRow();
    return lines;
}

function buildFormattedBlockEntries(blocks, activePrefix, { sortBlocksAlpha = false, itemsPerLine = 1 } = {}) {
    const orderedBlocks = sortBlocksAlpha
        ? [...blocks].sort((a, b) => {
            const nameA = String(a.title || '').replace(/^menu\s+/i, '').trim();
            const nameB = String(b.title || '').replace(/^menu\s+/i, '').trim();
            return nameA.localeCompare(nameB, 'en', { numeric: true, sensitivity: 'base' });
        })
        : blocks;

    const entries = [];
    for (const block of orderedBlocks) {
        const sortedItems = sortMenuItems(block.items);
        const rawLines = buildBlockLines(sortedItems, activePrefix, itemsPerLine);
        if (!rawLines.length) continue;
        const header = formatSectionHeader(block.title, { stripMenuPrefix: true });
        const text = `${header}\n${rawLines.join('\n')}`;
        entries.push({ text, quoteLines: countQuoteLines(text) });
    }
    return entries;
}

function formatBlocksCleanHutao(blocks, activePrefix, { sortBlocksAlpha = false, itemsPerLine = 1 } = {}) {
    return buildFormattedBlockEntries(blocks, activePrefix, { sortBlocksAlpha, itemsPerLine })
        .map((e) => e.text)
        .join('\n\n');
}

function getUserStats(m, isCreator, isPrem, getUserLimitInfo) {
    const u = global.db?.users?.[m.sender] || {};
    let limitText = '∞ Unlimited';
    if (!isCreator && !isPrem) {
        try {
            const info = typeof getUserLimitInfo === 'function' ? getUserLimitInfo(m.sender, isCreator) : null;
            if (info && typeof info.remaining !== 'undefined') {
                limitText = `${info.remaining}/${info.total}`;
            } else {
                limitText = String(u.limit ?? 25);
            }
        } catch (_) {
            limitText = String(u.limit ?? 25);
        }
    }
    return {
        pushName: m.pushName || 'User',
        exp: Number(u.exp || 0),
        level: Number(u.level || 1),
        limitText,
        role: isCreator ? 'Owner' : isPrem ? 'Premium' : 'Free'
    };
}

function buildInfoHeader({ botname, ownerName, senderTag, totalFitur, styleId, stats, compact = false, categoryOnly = false }) {
    const mode = global.db?.settings?.isPublic === false ? 'self' : 'public';
    const uptime = formatUptime(process.uptime());
    const roleLabel = stats.role === 'Owner' ? 'ᴏᴡɴᴇʀ' : stats.role === 'Premium' ? 'ᴘʀᴇᴍɪᴜᴍ' : 'ғʀᴇᴇ';
    const timeStr = moment().tz(global.timezone || 'Asia/Jakarta').format('HH:mm');
    const cleanPushName = String(stats.pushName || 'User').replace(/@/g, '').trim() || 'User';

    if (categoryOnly) {
        return `${formatSectionHeader('USER INFO')}\n` +
            `> ɴᴀᴍᴀ : ${cleanPushName}\n` +
            `> ʀᴏʟᴇ : ${roleLabel}\n` +
            `> ʟᴇᴠᴇʟ : ${toMono(stats.level)} (${toMono(stats.exp)} ᴇxᴘ)\n` +
            `> ʟɪᴍɪᴛ : ${toMono(stats.limitText)}`;
    }

    const greetLine = senderTag ? `ʜᴀʟᴏ, @${senderTag}` : `ʜᴀʟᴏ, ${cleanPushName}`;
    const styledBotName = `*${toSmallCaps(botname)}*`;

    if (compact) {
        return `${greetLine}\n` +
            `sᴇʟᴀᴍᴀᴛ ᴅᴀᴛᴀɴɢ ᴅɪ ${styledBotName}\n\n` +
            `${formatSectionHeader('BOT INFO')}\n` +
            `> ɴᴀᴍᴇ : ${styledBotName}\n` +
            `> ᴄʀᴇᴀᴛᴏʀ : ${toSmallCaps(ownerName || 'Owner')}\n` +
            `> ᴍᴏᴅᴇ : ${toMono(mode)} • ${toMono(totalFitur)} ғɪᴛᴜʀ\n` +
            `> ᴡᴀᴋᴛᴜ : ${toMono(`${timeStr} WIB`)}\n\n` +
            `${formatSectionHeader('USER INFO')}\n` +
            `> ɴᴀᴍᴀ : ${cleanPushName}\n` +
            `> ʀᴏʟᴇ : ${roleLabel} • ʟᴠ.${toMono(stats.level)}\n` +
            `> ʟɪᴍɪᴛ : ${toMono(stats.limitText)}`;
    }

    return `${greetLine}\n` +
        `sᴇʟᴀᴍᴀᴛ ᴅᴀᴛᴀɴɢ ᴅɪ ${styledBotName}\n` +
        `_${toSmallCaps('assistant wa cepat & lengkap')}_\n\n` +
        `${formatSectionHeader('BOT INFO')}\n` +
        `> ᴄʀᴇᴀᴛᴏʀ : ${toSmallCaps(ownerName || 'Owner')}\n` +
        `> ɴᴀᴍᴇ : ${styledBotName}\n` +
        `> ᴍᴏᴅᴇ : ${toMono(mode)}\n` +
        `> sᴛʏʟᴇ : ${toMono(styleId)} (${toMono(getStyleInfo(styleId).key)})\n` +
        `> ғɪᴛᴜʀ : ${toMono(totalFitur)} ᴄᴏᴍᴍᴀɴᴅ\n` +
        `> ᴀᴄᴛɪᴠᴇ : ${toMono(uptime)}\n\n` +
        `${formatSectionHeader('USER INFO')}\n` +
        `> ɴᴀᴍᴀ : ${cleanPushName}\n` +
        `> ʀᴏʟᴇ : ${roleLabel}\n` +
        `> ʟᴇᴠᴇʟ : ${toMono(stats.level)} (${toMono(stats.exp)} ᴇxᴘ)\n` +
        `> ʟɪᴍɪᴛ : ${toMono(stats.limitText)}`;
}

function buildMainMenuCategoryList(activePrefix) {
    const mainAll = MENU_CATEGORIES.filter((c) => c.group === 'main' && c.cmd === 'allmenu');
    const mainRest = MENU_CATEGORIES
        .filter((c) => c.group === 'main' && c.cmd !== 'allmenu')
        .sort((a, b) => compareLengthThenAlpha(a.cmd, b.cmd));
    const mainCats = [...mainAll, ...mainRest];

    const featCats = MENU_CATEGORIES
        .filter((c) => c.group === 'feature')
        .sort((a, b) => compareLengthThenAlpha(a.cmd, b.cmd));

    const mainLines = mainCats.map((c) => `> ◦ ${toMono(prefixCmd(c.cmd, activePrefix))}`).join('\n');
    const featLines = featCats.map((c) => `> ◦ ${toMono(prefixCmd(c.cmd, activePrefix))}`).join('\n');

    return `${formatSectionHeader('MAIN MENU')}\n${mainLines}\n\n` +
        `${formatSectionHeader('FEATURE')}\n${featLines}`;
}

function buildCleanHutaoMenuPages({
    botname, ownerName, senderTag, totalFitur, styleId, stats, activePrefix, categoryTeks, isAllMenu,
    useReadmore = false, compact = false
}) {
    const isCategoryOnly = Boolean(categoryTeks && !isAllMenu);
    const header = buildInfoHeader({
        botname, ownerName, senderTag, totalFitur, styleId, stats, compact, categoryOnly: isCategoryOnly
    });

    if (categoryTeks) {
        const blocks = parseShikiMenuBlocks(categoryTeks);
        const footerNote = isCategoryOnly
            ? `\n\n> 🅐 ᴀᴅᴍɪɴ • 🅞 ᴏᴡɴᴇʀ • 🅟 ᴘʀᴇᴍɪᴜᴍ`
            : `\n\n_${toSmallCaps('gunakan bot dengan bijak')}_\n> 🅐 ᴀᴅᴍɪɴ • 🅞 ᴏᴡɴᴇʀ • 🅟 ᴘʀᴇᴍɪᴜᴍ`;

        if (!blocks.length) {
            const readmore = useReadmore ? `\n${String.fromCharCode(8206).repeat(4001)}\n` : '\n\n';
            const sectionLead = isAllMenu
                ? `\n\n${formatSectionHeader('ALL MENU')}${useReadmore ? `\n_${toSmallCaps('tap baca selengkapnya')}_${readmore}` : '\n\n'}`
                : '\n\n';
            return [`${header}${sectionLead}${categoryTeks}${footerNote}`];
        }

        const headerQuoteCount = countQuoteLines(header);
        const footerQuoteCount = countQuoteLines(footerNote);
        const sortAlpha = isAllMenu || blocks.length > 1;

        let chosenEntries = null;
        for (const perLine of [1, 2, 3, 4]) {
            const candidate = buildFormattedBlockEntries(blocks, activePrefix, {
                sortBlocksAlpha: sortAlpha,
                itemsPerLine: perLine
            });
            const totalQuotes = headerQuoteCount + candidate.reduce((acc, e) => acc + e.quoteLines, 0) + footerQuoteCount;
            chosenEntries = candidate;
            if (totalQuotes <= MAX_WA_QUOTE_LINES) {
                break;
            }
        }

        const formatted = (chosenEntries || []).map((e) => e.text).join('\n\n');
        const readmore = useReadmore ? `\n${String.fromCharCode(8206).repeat(4001)}\n` : '\n\n';
        const sectionLead = isAllMenu
            ? `\n\n${formatSectionHeader('ALL MENU')}${useReadmore ? `\n_${toSmallCaps('tap baca selengkapnya')}_${readmore}` : '\n\n'}`
            : '\n\n';
        return [`${header}${sectionLead}${formatted}${footerNote}`];
    }

    const catList = buildMainMenuCategoryList(activePrefix);
    return [`${header}\n\n${catList}\n\n_${toSmallCaps('ketik')} ${toMono(prefixCmd('allmenu', activePrefix))} ${toSmallCaps('untuk semua fitur')}_`];
}

function buildCleanHutaoMenuText(opts) {
    return buildCleanHutaoMenuPages(opts)[0];
}

function buildHutaoSections(activePrefix) {
    const mainAll = MENU_CATEGORIES.filter((c) => c.group === 'main' && c.cmd === 'allmenu');
    const mainRest = MENU_CATEGORIES
        .filter((c) => c.group === 'main' && c.cmd !== 'allmenu')
        .sort((a, b) => compareLengthThenAlpha(a.cmd, b.cmd));
    const mainRows = [...mainAll, ...mainRest].map((c) => ({
        title: `${c.emoji} ${toSmallCaps(c.title)}`,
        description: toSmallCaps(c.desc),
        id: prefixCmd(c.cmd, activePrefix)
    }));
    const featRows = MENU_CATEGORIES
        .filter((c) => c.group === 'feature')
        .sort((a, b) => compareLengthThenAlpha(a.cmd, b.cmd))
        .map((c) => ({
            title: `${c.emoji} ${toSmallCaps(c.title)}`,
            description: toSmallCaps(c.desc),
            id: prefixCmd(c.cmd, activePrefix)
        }));
    return [
        { title: toSmallCaps('main menu'), highlight_label: toSmallCaps('utama'), rows: mainRows },
        { title: toSmallCaps('feature menu'), highlight_label: '', rows: featRows }
    ];
}

function buildFlatRows(activePrefix) {
    const allItem = MENU_CATEGORIES.filter((c) => c.cmd === 'allmenu');
    const rest = MENU_CATEGORIES
        .filter((c) => c.cmd !== 'allmenu')
        .sort((a, b) => compareLengthThenAlpha(a.cmd, b.cmd));
    return [...allItem, ...rest].map((c) => ({
        title: `${c.emoji} ${toSmallCaps(c.title)}`,
        description: toSmallCaps(c.desc),
        id: prefixCmd(c.cmd, activePrefix)
    }));
}

async function resolveMenuImageBuffer(Dinz, botCtx, imageUrl) {
    global._menuImgCache = global._menuImgCache || new Map();
    const localMediaDir = botCtx.getAudioMenuDir ? botCtx.getAudioMenuDir(Dinz) : path.join(process.cwd(), 'assets', 'media');
    const fallbackAssets = path.join(process.cwd(), 'assets', 'media');
    const isClone = Boolean(Dinz && Dinz.isJadibot);
    const identity = botCtx.getBotIdentity ? botCtx.getBotIdentity(Dinz) : null;

    const readLocalFromDir = (dir) => {
        for (const imgName of ['menu.jpg', 'menu.png', 'menu.jpeg']) {
            const localImgPath = path.join(dir, imgName);
            if (fs.existsSync(localImgPath)) {
                try {
                    const stat = fs.statSync(localImgPath);
                    const cached = global._menuImgCache.get(localImgPath);
                    if (cached && cached.mtimeMs === stat.mtimeMs && Buffer.isBuffer(cached.buffer)) {
                        return cached.buffer;
                    }
                    const buf = fs.readFileSync(localImgPath);
                    if (buf && buf.length > 0) {
                        global._menuImgCache.set(localImgPath, { mtimeMs: stat.mtimeMs, buffer: buf });
                        return buf;
                    }
                } catch (_) {}
            }
        }
        return null;
    };

    const fetchUrlBuffer = async (url) => {
        if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;
        const cachedUrl = global._menuImgCache.get(url);
        if (cachedUrl && (Date.now() - cachedUrl.ts < 30 * 60 * 1000) && Buffer.isBuffer(cachedUrl.buffer)) {
            return cachedUrl.buffer;
        }
        try {
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 12000,
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                validateStatus: () => true
            });
            if (res.status === 200 && res.data && res.data.length) {
                const buf = Buffer.from(res.data);
                global._menuImgCache.set(url, { ts: Date.now(), buffer: buf });
                return buf;
            }
        } catch (_) {}
        return null;
    };

    const ownLocal = readLocalFromDir(localMediaDir);
    if (ownLocal) return ownLocal;

    if (isClone && identity?.hasCustomMenuImage && imageUrl) {
        const cloneUrlBuf = await fetchUrlBuffer(imageUrl);
        if (cloneUrlBuf) return cloneUrlBuf;
    }

    if (localMediaDir !== fallbackAssets) {
        const fallbackLocal = readLocalFromDir(fallbackAssets);
        if (fallbackLocal) return fallbackLocal;
    }

    return fetchUrlBuffer(imageUrl);
}

function detectImageInfo(buf) {
    if (Buffer.isBuffer(buf) && buf.length >= 4) {
        if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
            return { mimetype: 'image/png', ext: 'png' };
        }
        if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
            return { mimetype: 'image/jpeg', ext: 'jpg' };
        }
    }
    return { mimetype: 'image/jpeg', ext: 'jpg' };
}

async function makeThumbBuffer(imageBuffer, width = 200, height = null, quality = 70) {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) return null;
    if (sharp) {
        try {
            const resizeOpt = height ? { width, height, fit: 'cover' } : { width };
            const out = await sharp(imageBuffer).resize(resizeOpt).jpeg({ quality }).toBuffer();
            if (out && out.length > 0) return out;
        } catch (_) {}
    }
    if (createCanvas && loadImage) {
        try {
            const img = await loadImage(imageBuffer);
            const targetW = width;
            const targetH = height || Math.max(1, Math.round((img.height / Math.max(1, img.width)) * width));
            const canvas = createCanvas(targetW, targetH);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, targetW, targetH);
            const out = canvas.toBuffer('image/jpeg', { quality: Math.min(0.95, Math.max(0.4, quality / 100)) });
            if (out && out.length > 0) return out;
        } catch (_) {}
    }
    return imageBuffer.length <= 45000 ? imageBuffer : null;
}

function makeVerifiedQuoted(botname, m, useUserContact = false) {
    const stanzaId = `DINZ${Date.now().toString(36).toUpperCase()}`;
    if (useUserContact && m?.sender) {
        const num = m.sender.split('@')[0];
        return {
            key: { id: stanzaId, fromMe: false, participant: m.sender, remoteJid: 'status@broadcast' },
            message: {
                contactMessage: {
                    displayName: `${m.pushName || 'User'}`,
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL;User,;;;\nFN:${m.pushName || 'User'}\nitem1.TEL;waid=${num}:${num}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
                }
            }
        };
    }
    return {
        key: { id: stanzaId, fromMe: false, participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' },
        message: {
            contactMessage: {
                displayName: `${botname}`,
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL;${botname},;;;\nFN:${botname}\nitem1.TEL;waid=13135550002:+1 (313) 555-0002\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            }
        }
    };
}

async function safeSendMessage(Dinz, jid, payload, options = {}) {
    try {
        const sent = await Dinz.sendMessage(jid, payload, options);
        return Boolean(sent && sent.key && sent.key.id);
    } catch (err) {
        console.log('[MenuRenderer] safeSendMessage error:', err?.message || err);
        return false;
    }
}

async function sendInteractiveCard({ Dinz, m, text, footer, buttons, imageBuffer, imageUrl, mentions, quoted, messageParamsJson, locationHeader }) {
    const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

    let headerObj;
    if (locationHeader) {
        headerObj = proto.Message.InteractiveMessage.Header.create({
            title: '',
            hasMediaAttachment: true,
            locationMessage: locationHeader
        });
    } else {
        const media = imageBuffer
            ? await prepareWAMessageMedia({ image: imageBuffer }, { upload: Dinz.waUploadToServer })
            : await prepareWAMessageMedia({ image: { url: imageUrl } }, { upload: Dinz.waUploadToServer });
        headerObj = proto.Message.InteractiveMessage.Header.create({
            hasMediaAttachment: true,
            imageMessage: media.imageMessage
        });
    }

    const nativeFlowPayload = { buttons };
    if (messageParamsJson) nativeFlowPayload.messageParamsJson = messageParamsJson;

    const cleanMentions = Array.isArray(mentions)
        ? [...new Set(mentions.map((j) => String(j || '').trim().replace(/:\d+@/, '@')).filter(Boolean))]
        : [];
    const msg = await generateWAMessageFromContent(m.chat, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: proto.Message.InteractiveMessage.create({
                    ...(cleanMentions.length ? { contextInfo: { mentionedJid: cleanMentions } } : {}),
                    body: proto.Message.InteractiveMessage.Body.create({ text }),
                    footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
                    header: headerObj,
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create(nativeFlowPayload)
                })
            }
        }
    }, { quoted: quoted || m });

    await Dinz.relayMessage(m.chat, msg.message, { messageId: msg.key.id, AI: false });
    return true;
}

async function sendFallbackMenu({ Dinz, m, imageBuffer, imageUrl, caption, mentions }) {
    const cleanMentions = Array.isArray(mentions)
        ? [...new Set(mentions.map((j) => String(j || '').trim().replace(/:\d+@/, '@')).filter(Boolean))]
        : [];
    const ctxWrap = cleanMentions.length ? { contextInfo: { mentionedJid: cleanMentions } } : {};
    if (imageBuffer) {
        const okBuf = await safeSendMessage(Dinz, m.chat, {
            image: imageBuffer,
            caption,
            ...ctxWrap
        }, { quoted: m });
        if (okBuf) return true;
    }
    if (imageUrl) {
        const okUrl = await safeSendMessage(Dinz, m.chat, {
            image: { url: imageUrl },
            caption,
            ...ctxWrap
        }, { quoted: m });
        if (okUrl) return true;
    }
    return safeSendMessage(Dinz, m.chat, {
        text: caption,
        ...ctxWrap
    }, { quoted: m });
}

async function sendExtraMenuPages(Dinz, m, extraPages) {
    if (!Array.isArray(extraPages) || extraPages.length === 0) return;
    for (const pageText of extraPages) {
        if (!pageText) continue;
        await new Promise((r) => setTimeout(r, 350));
        await safeSendMessage(Dinz, m.chat, { text: pageText }, { quoted: m });
    }
}

async function sendStyledMenu({
    Dinz,
    m,
    botCtx,
    prefixMgr,
    validCommandsList,
    isCreator,
    isPrem,
    getUserLimitInfo,
    categoryTeks = '',
    options = {}
}) {
    const styleId = getMenuStyle(global.db?.settings);
    const identity = botCtx.getBotIdentity(Dinz);
    const botname = identity.botname || global.botname || 'HuTao - MD';
    const ownerName = identity.ownername || identity.namaOwner || global.namaOwner || 'DinzID';
    const rawSenderJid = String(m.sender || '').trim().replace(/:\d+@/, '@');
    const senderTag = rawSenderJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const senderJid = senderTag
        ? (rawSenderJid.includes('@') ? rawSenderJid : `${senderTag}@s.whatsapp.net`)
        : '';
    const totalFitur = validCommandsList?.length || 0;
    const activePrefix = prefixMgr ? prefixMgr.getDisplayPrefix(global.db?.settings) : '.';
    const imageUrl = identity.image?.menu || global.image?.menu || 'https://image2url.com/r2/default/images/1773625179709-bccac35a-f5a7-4722-88a3-d2fe955d8526.jpg';
    const stats = getUserStats(m, isCreator, isPrem, getUserLimitInfo);
    const isAllMenu = Boolean(options.isAllMenu);
    const imageBuffer = await resolveMenuImageBuffer(Dinz, botCtx, imageUrl);

    const menuPages = buildCleanHutaoMenuPages({
        botname,
        ownerName,
        senderTag,
        totalFitur,
        styleId,
        stats,
        activePrefix,
        categoryTeks,
        isAllMenu,
        useReadmore: styleId === 6 && isAllMenu,
        compact: styleId === 7
    });
    const cleanCaption = menuPages[0];
    const extraPages = menuPages.slice(1);

    const mentions = (senderJid && senderTag && cleanCaption.includes(`@${senderTag}`))
        ? [senderJid]
        : [];
    const botFooterSmallCaps = toSmallCaps(botname);

    try {
        if (styleId === 1) {
            await sendInteractiveCard({
                Dinz,
                m,
                text: cleanCaption,
                footer: `© ${botFooterSmallCaps}`,
                imageBuffer,
                imageUrl,
                mentions,
                buttons: [
                    {
                        name: 'single_select',
                        buttonParamsJson: JSON.stringify({
                            title: toSmallCaps('List Menu'),
                            sections: buildHutaoSections(activePrefix)
                        })
                    }
                ]
            });
            await sendExtraMenuPages(Dinz, m, extraPages);
            return;
        }

        if (styleId === 2) {
            const imgPayload = {
                image: imageBuffer || { url: imageUrl },
                caption: cleanCaption
            };
            if (mentions.length > 0) {
                imgPayload.contextInfo = { mentionedJid: mentions };
            }
            const sent = await safeSendMessage(Dinz, m.chat, imgPayload, { quoted: m });

            if (!sent) {
                await sendFallbackMenu({ Dinz, m, imageBuffer: null, imageUrl, caption: cleanCaption, mentions });
            }
            await sendExtraMenuPages(Dinz, m, extraPages);
            return;
        }

        if (styleId === 3) {
            await sendInteractiveCard({
                Dinz,
                m,
                text: cleanCaption,
                footer: `${botFooterSmallCaps} • ${toSmallCaps('hutao style')}`,
                imageBuffer,
                imageUrl,
                mentions,
                buttons: [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({ display_text: toSmallCaps('owner'), id: prefixCmd('owner', activePrefix) })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({ display_text: toSmallCaps('all menu'), id: prefixCmd('allmenu', activePrefix) })
                    },
                    {
                        name: 'single_select',
                        buttonParamsJson: JSON.stringify({
                            title: toSmallCaps('pilih menu'),
                            sections: buildHutaoSections(activePrefix)
                        })
                    }
                ]
            });
            await sendExtraMenuPages(Dinz, m, extraPages);
            return;
        }

        if (styleId === 4) {
            const hasImage = Buffer.isBuffer(imageBuffer) && imageBuffer.length > 0;
            const pdfDocBuf = Buffer.from(`%PDF-1.4\n% ${botname} Multi-Device Menu\n%%EOF\n`, 'utf8');
            const bannerThumb = hasImage ? await makeThumbBuffer(imageBuffer, 512, 288, 72) : null;
            const miniDocThumb = hasImage ? await makeThumbBuffer(imageBuffer, 200, null, 65) : null;
            const safeDocName = `${toSmallCaps(botname)}.pdf`;

            const docPayload = {
                document: pdfDocBuf,
                mimetype: 'application/pdf',
                fileName: safeDocName,
                pageCount: 1,
                caption: cleanCaption,
                ...(miniDocThumb ? { jpegThumbnail: miniDocThumb } : {}),
                contextInfo: {
                    ...(mentions.length > 0 ? { mentionedJid: mentions } : {}),
                    externalAdReply: {
                        title: botFooterSmallCaps,
                        body: toSmallCaps(`${ownerName} • ${totalFitur} fitur`),
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        showAdAttribution: false,
                        sourceUrl: 'https://whatsapp.com',
                        ...(bannerThumb ? { thumbnail: bannerThumb } : { thumbnailUrl: imageUrl })
                    }
                }
            };

            let sent = await safeSendMessage(Dinz, m.chat, docPayload, { quoted: m });

            if (!sent) {
                const simpleDocPayload = {
                    document: pdfDocBuf,
                    mimetype: 'application/pdf',
                    fileName: safeDocName,
                    pageCount: 1,
                    caption: cleanCaption,
                    ...(miniDocThumb ? { jpegThumbnail: miniDocThumb } : {}),
                    ...(mentions.length > 0 ? { contextInfo: { mentionedJid: mentions } } : {})
                };
                sent = await safeSendMessage(Dinz, m.chat, simpleDocPayload, { quoted: m });
            }

            if (!sent) {
                await sendFallbackMenu({ Dinz, m, imageBuffer, imageUrl, caption: cleanCaption, mentions });
            }
            await sendExtraMenuPages(Dinz, m, extraPages);
            return;
        }

        if (styleId === 5) {
            await sendInteractiveCard({
                Dinz,
                m,
                text: cleanCaption,
                footer: `${botFooterSmallCaps} • ${toSmallCaps(`v${global.versi || '1.0.0'}`)}`,
                imageBuffer,
                imageUrl,
                mentions,
                quoted: m,
                buttons: [
                    {
                        name: 'single_select',
                        buttonParamsJson: JSON.stringify({
                            title: `🍃 ${toSmallCaps('Menu Utama')}`,
                            sections: [{ title: toSmallCaps('pilih kategori'), rows: buildFlatRows(activePrefix) }]
                        })
                    },
                    {
                        name: 'single_select',
                        buttonParamsJson: JSON.stringify({
                            title: `✨ ${toSmallCaps('Selengkapnya')}`,
                            sections: [
                                {
                                    title: toSmallCaps('menu cepat'),
                                    rows: [
                                        { title: `📚 ${toSmallCaps('All Menu')}`, description: toSmallCaps('Lihat seluruh command bot'), id: prefixCmd('allmenu', activePrefix) },
                                        { title: `🎮 ${toSmallCaps('Rich Game')}`, description: toSmallCaps('Dino • Chess • Flappy • 2048 • Wordle'), id: prefixCmd('richgame', activePrefix) },
                                        { title: `🎨 ${toSmallCaps('Ganti Style')}`, description: toSmallCaps('Atur tampilan menu (Owner)'), id: prefixCmd('setmenu', activePrefix) },
                                        { title: `👑 ${toSmallCaps('Owner')}`, description: toSmallCaps('Informasi owner bot'), id: prefixCmd('owner', activePrefix) }
                                    ]
                                }
                            ]
                        })
                    }
                ]
            });
            await sendExtraMenuPages(Dinz, m, extraPages);
            return;
        }

        if (styleId === 6) {
            const offerParams = JSON.stringify({
                limited_time_offer: {
                    text: getTimeGreeting(),
                    url: 'https://whatsapp.com',
                    copy_code: `${botname} • ${totalFitur} Fitur`,
                    expiration_time: Date.now() + 86400000
                }
            });

            await sendInteractiveCard({
                Dinz,
                m,
                text: cleanCaption,
                footer: `${toSmallCaps('pilih tombol di bawah')} • ${botFooterSmallCaps}`,
                imageBuffer,
                imageUrl,
                mentions,
                messageParamsJson: offerParams,
                buttons: [
                    {
                        name: 'single_select',
                        buttonParamsJson: JSON.stringify({
                            title: `📋 ${toSmallCaps('Pilih Menu')}`,
                            sections: buildHutaoSections(activePrefix)
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({ display_text: `📚 ${toSmallCaps('all menu')}`, id: prefixCmd('allmenu', activePrefix) })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({ display_text: `🎮 ${toSmallCaps('rich game')}`, id: prefixCmd('richgame', activePrefix) })
                    }
                ]
            });
            await sendExtraMenuPages(Dinz, m, extraPages);
            return;
        }

        if (styleId === 7) {
            const locThumb = await makeThumbBuffer(imageBuffer, 300, 170);
            const dateStr = moment().tz(global.timezone || 'Asia/Jakarta').format('DD MMM YYYY • HH:mm [WIB]');

            await sendInteractiveCard({
                Dinz,
                m,
                text: cleanCaption,
                footer: `© ${botFooterSmallCaps} • ${toSmallCaps('location menu')}`,
                imageBuffer,
                imageUrl,
                mentions,
                locationHeader: {
                    degreesLatitude: -6.200000,
                    degreesLongitude: 106.816666,
                    name: `${botFooterSmallCaps} (${totalFitur} ${toSmallCaps('fitur')})`,
                    address: dateStr,
                    ...(locThumb ? { jpegThumbnail: locThumb } : {})
                },
                buttons: [
                    {
                        name: 'single_select',
                        buttonParamsJson: JSON.stringify({
                            title: `📋 ${toSmallCaps('Pilih Menu')}`,
                            sections: buildHutaoSections(activePrefix)
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({ display_text: `📚 ${toSmallCaps('all menu')}`, id: prefixCmd('allmenu', activePrefix) })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({ display_text: `👑 ${toSmallCaps('owner')}`, id: prefixCmd('owner', activePrefix) })
                    }
                ]
            });
            await sendExtraMenuPages(Dinz, m, extraPages);
            return;
        }
    } catch (err) {
        console.log(`[MenuRenderer] Style ${styleId} error:`, err?.message || err);
        await sendFallbackMenu({
            Dinz,
            m,
            imageBuffer,
            imageUrl,
            caption: cleanCaption || categoryTeks || botname,
            mentions
        });
        await sendExtraMenuPages(Dinz, m, extraPages);
    }
}

module.exports = {
    MENU_STYLES,
    MENU_CATEGORIES,
    getMenuStyle,
    resolveStyleInput,
    getStyleInfo,
    sendStyledMenu,
    buildCleanHutaoMenuPages,
    parseShikiMenuBlocks,
    makeVerifiedQuoted,
    toMono,
    toSmallCaps,
    toBoldSans,
    toMonoBold: toBoldSans
};
