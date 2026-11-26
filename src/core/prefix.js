const MULTI_PREFIXES = ['.', '!', '/', '#', '$'];

const REVERSE_FONT_MAP = {
    '𝚊': 'a', '𝚋': 'b', '𝚌': 'c', '𝚍': 'd', '𝚎': 'e', '𝚏': 'f', '𝚐': 'g', '𝚑': 'h', '𝚒': 'i', '𝚓': 'j', '𝚔': 'k', '𝚕': 'l', '𝚖': 'm',
    '𝚗': 'n', '𝚘': 'o', '𝚙': 'p', '𝚚': 'q', '𝚛': 'r', '𝚜': 's', '𝚝': 't', '𝚞': 'u', '𝚟': 'v', '𝚠': 'w', '𝚡': 'x', '𝚢': 'y', '𝚣': 'z',
    '𝙰': 'a', '𝙱': 'b', '𝙲': 'c', '𝙳': 'd', '𝙴': 'e', '𝙵': 'f', '𝙶': 'g', '𝙷': 'h', '𝙸': 'i', '𝙹': 'j', '𝙺': 'k', '𝙻': 'l', '𝙼': 'm',
    '𝙽': 'n', '𝙾': 'o', '𝙿': 'p', '𝚀': 'q', '𝚁': 'r', '𝚂': 's', '𝚃': 't', '𝚄': 'u', '𝚅': 'v', '𝚆': 'w', '𝚇': 'x', '𝚈': 'y', '𝚉': 'z',
    '𝟶': '0', '𝟷': '1', '𝟸': '2', '𝟹': '3', '𝟺': '4', '𝟻': '5', '𝟼': '6', '𝟽': '7', '𝟾': '8', '𝟿': '9',
    '𝗮': 'a', '𝗯': 'b', '𝗰': 'c', '𝗱': 'd', '𝗲': 'e', '𝗳': 'f', '𝗴': 'g', '𝗵': 'h', '𝗶': 'i', '𝗷': 'j', '𝗸': 'k', '𝗹': 'l', '𝗺': 'm',
    '𝗻': 'n', '𝗼': 'o', '𝗽': 'p', '𝗾': 'q', '𝗿': 'r', '𝘀': 's', '𝘁': 't', '𝘂': 'u', '𝘃': 'v', '𝘄': 'w', '𝘅': 'x', '𝘆': 'y', '𝘇': 'z',
    '𝗔': 'a', '𝗕': 'b', '𝗖': 'c', '𝗗': 'd', '𝗘': 'e', '𝗙': 'f', '𝗚': 'g', '𝗛': 'h', '𝗜': 'i', '𝗝': 'j', '𝗞': 'k', '𝗟': 'l', '𝗠': 'm',
    '𝗡': 'n', '𝗢': 'o', '𝗣': 'p', '𝗤': 'q', '𝗥': 'r', '𝗦': 's', '𝗧': 't', '𝗨': 'u', '𝗩': 'v', '𝗪': 'w', '𝗫': 'x', '𝗬': 'y', '𝗭': 'z',
    '𝟬': '0', '𝟭': '1', '𝟮': '2', '𝟯': '3', '𝟰': '4', '𝟱': '5', '𝟲': '6', '𝟳': '7', '𝟴': '8', '𝟵': '9',
    'ᴀ': 'a', 'ʙ': 'b', 'ᴄ': 'c', 'ᴅ': 'd', 'ᴇ': 'e', 'ғ': 'f', 'ɢ': 'g', 'ʜ': 'h', 'ɪ': 'i', 'ᴊ': 'j', 'ᴋ': 'k', 'ʟ': 'l', 'ᴍ': 'm',
    'ɴ': 'n', 'ᴏ': 'o', 'ᴘ': 'p', 'ǫ': 'q', 'ʀ': 'r', 'ᴛ': 't', 'ᴜ': 'u', 'ᴠ': 'v', 'ᴡ': 'w', 'ʏ': 'y', 'ᴢ': 'z'
};

function normalizeCommandToken(raw) {
    let out = '';
    for (const ch of String(raw || '')) {
        out += REVERSE_FONT_MAP[ch] || ch;
    }
    return out.toLowerCase();
}

function getPrefixConfig(settings = {}) {
    const rawMode = settings?.prefixMode;
    let mode = 'multi';

    if (rawMode === 'single') {
        mode = 'single';
    } else if (rawMode === 'noprefix' || rawMode === false) {
        mode = 'noprefix';
    } else {
        mode = 'multi';
    }

    const prefix = String(settings?.prefix || '.').trim() || '.';
    return { mode, prefix };
}

function getDisplayPrefix(settings = {}) {
    const { mode, prefix } = getPrefixConfig(settings);
    if (mode === 'single') return prefix;
    return '';
}

function parseCommand(body, validCommands, settings = {}, allowOwnerBypass = false, allowNoPrefix = false) {
    const empty = { isCmd: false, command: '', args: [], usedPrefix: '' };
    if (typeof body !== 'string') return empty;

    const trimmed = body.trim();
    if (!trimmed) return empty;

    const cmdSet = validCommands instanceof Set ? validCommands : new Set(validCommands || []);
    const { mode, prefix } = getPrefixConfig(settings);

    const tryWithPrefix = (pref) => {
        if (!pref || !trimmed.startsWith(pref)) return null;
        const rest = trimmed.slice(pref.length).trim();
        if (!rest) return null;
        const parts = rest.split(/\s+/);
        const cmd = normalizeCommandToken(parts[0] || '');
        if (cmdSet.has(cmd)) {
            return { isCmd: true, command: cmd, args: parts.slice(1), usedPrefix: pref };
        }
        return null;
    };

    const tryNoPrefix = () => {
        const parts = trimmed.split(/\s+/);
        const cmd = normalizeCommandToken(parts[0] || '');
        if (cmdSet.has(cmd)) {
            return { isCmd: true, command: cmd, args: parts.slice(1), usedPrefix: '' };
        }
        return null;
    };

    if (mode === 'single') {
        const matched = tryWithPrefix(prefix);
        if (matched) return matched;

        if (allowNoPrefix) {
            const multiTry = [...new Set([prefix, ...MULTI_PREFIXES])].sort((a, b) => b.length - a.length);
            for (const p of multiTry) {
                const mPref = tryWithPrefix(p);
                if (mPref) return mPref;
            }
            const noPref = tryNoPrefix();
            if (noPref) return { ...noPref, usedPrefix: prefix };
        }

        if (allowOwnerBypass) {
            const parts = trimmed.split(/\s+/);
            const cmd = (parts[0] || '').toLowerCase();
            if (cmd === 'setprefix' || cmd === 'cekprefix') {
                return { isCmd: true, command: cmd, args: parts.slice(1), usedPrefix: '' };
            }
        }
        return empty;
    }

    if (mode === 'noprefix') {
        return tryNoPrefix() || empty;
    }

    const allPrefixes = [...new Set([prefix, ...MULTI_PREFIXES])].sort((a, b) => b.length - a.length);
    for (const p of allPrefixes) {
        const matched = tryWithPrefix(p);
        if (matched) return matched;
    }
    return tryNoPrefix() || empty;
}

module.exports = {
    MULTI_PREFIXES,
    getPrefixConfig,
    getDisplayPrefix,
    parseCommand
};
