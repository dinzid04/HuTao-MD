const path = require('path');
const { pathToFileURL } = require('url');
const { toBoldSans, toMono, toSmallCaps, formatNumber, trimText, formatDurationSec, formatCard } = require('../../utils/formatter');

const nativeImport = new Function('specifier', 'return import(specifier)');

const SCRAPER_CACHE = new Map();
async function loadScraper(filename) {
    if (SCRAPER_CACHE.has(filename)) return SCRAPER_CACHE.get(filename);
    const fullPath = path.join(__dirname, '..', '..', 'services', 'scrapers', filename);
    const mod = await nativeImport(pathToFileURL(fullPath).href);
    SCRAPER_CACHE.set(filename, mod);
    return mod;
}

function getQuotedText(m) {
    return (
        m?.quoted?.text ||
        m?.quoted?.caption ||
        m?.quoted?.body ||
        ''
    ).trim();
}

async function fetchImageBufferSafe(url) {
    if (!url || !/^https?:\/\//i.test(url)) return null;
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(15000)
        });
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        return Buffer.from(arr);
    } catch (_) {
        return null;
    }
}

module.exports = {
    toBoldSans,
    toMono,
    toSmallCaps,
    formatNumber,
    trimText,
    formatDurationSec,
    formatCard,
    loadScraper,
    getQuotedText,
    fetchImageBufferSafe
};
