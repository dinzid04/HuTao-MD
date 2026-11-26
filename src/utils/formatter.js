const MONO_MAP = {
    a: '𝚊', b: '𝚋', c: '𝚌', d: '𝚍', e: '𝚎', f: '𝚏', g: '𝚐', h: '𝚑', i: '𝚒', j: '𝚓', k: '𝚔', l: '𝚕', m: '𝚖',
    n: '𝚗', o: '𝚘', p: '𝚙', q: '𝚚', r: '𝚛', s: '𝚜', t: '𝚝', u: '𝚞', v: '𝚟', w: '𝚠', x: '𝚡', y: '𝚢', z: '𝚣',
    A: '𝙰', B: '𝙱', C: '𝙲', D: '𝙳', E: '𝙴', F: '𝙵', G: '𝙶', H: '𝙷', I: '𝙸', J: '𝙹', K: '𝙺', L: '𝙻', M: '𝙼',
    N: '𝙽', O: '𝙾', P: '𝙿', Q: '𝚀', R: '𝚁', S: '𝚂', T: '𝚃', U: '𝚄', V: '𝚅', W: '𝚆', X: '𝚇', Y: '𝚈', Z: '𝚉',
    0: '𝟶', 1: '𝟷', 2: '𝟸', 3: '𝟹', 4: '𝟺', 5: '𝟻', 6: '𝟼', 7: '𝟽', 8: '𝟾', 9: '𝟿'
};

const BOLD_SANS_MAP = {
    a: '𝗮', b: '𝗯', c: '𝗰', d: '𝗱', e: '𝗲', f: '𝗳', g: '𝗴', h: '𝗵', i: '𝗶', j: '𝗷', k: '𝗸', l: '𝗹', m: '𝗺',
    n: '𝗻', o: '𝗼', p: '𝗽', q: '𝗾', r: '𝗿', s: '𝘀', t: '𝘁', u: '𝘂', v: '𝘃', w: '𝘄', x: '𝘅', y: '𝘆', z: '𝘇',
    A: '𝗔', B: '𝗕', C: '𝗖', D: '𝗗', E: '𝗘', F: '𝗙', G: '𝗚', H: '𝗛', I: '𝗜', J: '𝗝', K: '𝗞', L: '𝗟', M: '𝗠',
    N: '𝗡', O: '𝗢', P: '𝗣', Q: '𝗤', R: '𝗥', S: '𝗦', T: '𝗧', U: '𝗨', V: '𝗩', W: '𝗪', X: '𝗫', Y: '𝗬', Z: '𝗭',
    0: '𝟬', 1: '𝟭', 2: '𝟮', 3: '𝟯', 4: '𝟰', 5: '𝟱', 6: '𝟲', 7: '𝟳', 8: '𝟴', 9: '𝟵'
};

const SMALL_CAPS_MAP = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ',
    n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ',
    A: 'ᴀ', B: 'ʙ', C: 'ᴄ', D: 'ᴅ', E: 'ᴇ', F: 'ғ', G: 'ɢ', H: 'ʜ', I: 'ɪ', J: 'ᴊ', K: 'ᴋ', L: 'ʟ', M: 'ᴍ',
    N: 'ɴ', O: 'ᴏ', P: 'ᴘ', Q: 'ǫ', R: 'ʀ', S: 's', T: 'ᴛ', U: 'ᴜ', V: 'ᴠ', W: 'ᴡ', X: 'x', Y: 'ʏ', Z: 'ᴢ'
};

function toMono(input) {
    return String(input ?? '').replace(/[A-Za-z0-9]/g, (ch) => MONO_MAP[ch] || ch);
}

function toBoldSans(input) {
    return String(input ?? '').replace(/[A-Za-z0-9]/g, (ch) => BOLD_SANS_MAP[ch] || ch);
}

function toSmallCaps(input) {
    return String(input ?? '').replace(/[A-Za-z]/g, (ch) => SMALL_CAPS_MAP[ch] || ch);
}

function toSmallCapsSafe(input) {
    const str = String(input ?? '');
    const tokens = str.split(/(https?:\/\/\S+|@\d+|`[^`]+`)/g);
    return tokens.map((part, idx) => (idx % 2 === 1 ? part : toSmallCaps(part))).join('');
}

function toSpacedBoldSans(input) {
    const clean = String(input ?? '').replace(/[^\w\s&/+-]/g, '').trim().toUpperCase();
    return clean
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.split('').map((ch) => BOLD_SANS_MAP[ch] || ch).join(' '))
        .join('  ');
}

function toSpacedSmallCaps(input) {
    const clean = String(input ?? '').replace(/[^\w\s&/+-]/g, '').trim().toLowerCase();
    return clean
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.split('').map((ch) => SMALL_CAPS_MAP[ch] || ch).join(' '))
        .join('  ');
}

function formatNumber(val) {
    const num = Number(val);
    if (!Number.isFinite(num)) return String(val || '0');
    return num.toLocaleString('id-ID');
}

function trimText(str, maxLen = 600) {
    const clean = String(str || '').replace(/\r/g, '').trim();
    if (clean.length <= maxLen) return clean;
    return clean.slice(0, maxLen).trimEnd() + '...';
}

function formatDurationSec(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${String(rem).padStart(2, '0')}`;
}

function formatCard({ icon = '', title = 'INFO', rows = [], body = '', footer = '' }) {
    const lines = [];
    const cleanTitle = String(title || 'INFO').trim();
    const headerIcon = icon ? `${icon} ` : '';
    lines.push(`\`${headerIcon}${toBoldSans(cleanTitle.toUpperCase())}\``);

    const rowLines = [];
    for (const row of rows) {
        if (!row) continue;
        if (typeof row === 'string') {
            const trimmed = row.trim();
            if (!trimmed) continue;
            rowLines.push(trimmed.startsWith('>') ? trimmed : `> ${trimmed}`);
        } else if (row.value !== undefined && row.value !== null && String(row.value).trim() !== '') {
            rowLines.push(`> ${toSmallCaps(row.label)} : ${row.value}`);
        }
    }

    if (rowLines.length > 0) {
        lines.push('');
        lines.push(...rowLines);
    }

    if (body && String(body).trim()) {
        lines.push('');
        const rawBodyLines = String(body).replace(/\r/g, '').trim().split('\n');
        for (const bline of rawBodyLines) {
            const trimmed = bline.trim();
            if (!trimmed) {
                lines.push('');
            } else if (trimmed.startsWith('>')) {
                lines.push(bline);
            } else {
                lines.push(`> ${bline}`);
            }
        }
    }

    if (footer && String(footer).trim()) {
        lines.push('');
        lines.push(`_${toSmallCapsSafe(String(footer).trim())}_`);
    }

    return lines.join('\n');
}

function beautifyLegacyCaption(input) {
    if (typeof input !== 'string' || !input.includes('`⌜')) return input;
    const parts = input.split(/(```[\s\S]*?```)/g);
    return parts.map((chunk, idx) => {
        if (idx % 2 === 1) return chunk;
        let out = chunk.replace(/^`⌜\s*([^`\n]+?)\s*⌟`$/gm, (_, title) => {
            return `\`${toBoldSans(String(title).trim().toUpperCase())}\``;
        });
        out = out.replace(/^>\s*◦\s*\*?([A-Za-z0-9 /()-]{2,28})\s*:\*?\s*/gm, (_, label) => {
            return `> ${toSmallCaps(String(label).trim())} : `;
        });
        return out;
    }).join('');
}

module.exports = {
    MONO_MAP,
    BOLD_SANS_MAP,
    SMALL_CAPS_MAP,
    toMono,
    toBoldSans,
    toSmallCaps,
    toSmallCapsSafe,
    toSpacedBoldSans,
    toSpacedSmallCaps,
    formatNumber,
    trimText,
    formatDurationSec,
    formatCard,
    beautifyLegacyCaption
};
