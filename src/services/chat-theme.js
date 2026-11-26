/**
 * WhatsApp Chat Theme & Custom Solid Background Color
 * Protocol & theme IDs based on @DanuZz (@dnuzi/baileys) gist.
 */

const CHAT_THEMES = [
    { index: 1, id: 'Default-Blue@Minimal', name: 'Default Blue', emoji: '🔵', aliases: ['1', 'blue', 'biru', 'default-blue', 'defaultblue'] },
    { index: 2, id: 'Default-Blue@Tonal@Minimal', name: 'Default Blue Tonal', emoji: '🩵', aliases: ['2', 'bluetonal', 'birutonal', 'default-blue-tonal'] },
    { index: 3, id: 'Emerald@Minimal', name: 'Emerald', emoji: '💚', aliases: ['3', 'emerald', 'zamrud'] },
    { index: 4, id: 'Emerald@Tonal@Minimal', name: 'Emerald Tonal', emoji: '🌿', aliases: ['4', 'emeraldtonal', 'emerald-tonal'] },
    { index: 5, id: 'Pink@Minimal', name: 'Pink', emoji: '🩷', aliases: ['5', 'pink', 'merahmuda'] },
    { index: 6, id: 'Red@Minimal', name: 'Red', emoji: '🔴', aliases: ['6', 'red', 'merah'] },
    { index: 7, id: 'Royal-Blue@Minimal', name: 'Royal Blue', emoji: '💙', aliases: ['7', 'royalblue', 'royal-blue', 'birutua', 'navy'] },
    { index: 8, id: 'Tyrian-Purple@Minimal', name: 'Tyrian Purple', emoji: '🟣', aliases: ['8', 'purple', 'ungu', 'tyrian', 'tyrian-purple'] },
    { index: 9, id: 'WhatsApp-Green@Minimal', name: 'WhatsApp Green', emoji: '🟢', aliases: ['9', 'green', 'hijau', 'wa', 'whatsapp', 'whatsapp-green'] }
];

const NAMED_COLORS = {
    merah: '#E53935',
    red: '#E53935',
    biru: '#1E88E5',
    blue: '#1E88E5',
    hijau: '#2E7D32',
    green: '#2E7D32',
    ungu: '#7B1FA2',
    purple: '#7B1FA2',
    pink: '#EC407A',
    hitam: '#0B1014',
    black: '#0B1014',
    gelap: '#121B22',
    dark: '#121B22',
    putih: '#F5F7FA',
    white: '#F5F7FA',
    kuning: '#FBC02D',
    yellow: '#FBC02D',
    oranye: '#FB8C00',
    orange: '#FB8C00',
    cyan: '#00ACC1',
    toska: '#00ACC1',
    navy: '#0D1B2A',
    maroon: '#6A040F',
    coklat: '#4E342E',
    brown: '#4E342E',
    abu: '#37474F',
    gray: '#37474F',
    grey: '#37474F',
    emas: '#D4AF37',
    gold: '#D4AF37'
};

function resolveTheme(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();
    for (const t of CHAT_THEMES) {
        if (t.id.toLowerCase() === lower) return t;
        if (t.name.toLowerCase() === lower) return t;
        if (t.aliases.includes(lower)) return t;
    }
    return null;
}

function parseArgbColor(input) {
    let raw = String(input || '').trim().toLowerCase();
    if (!raw) return null;
    if (NAMED_COLORS[raw]) raw = NAMED_COLORS[raw];

    const hex = raw.replace(/^0x/i, '').replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(hex)) {
        const expanded = hex.split('').map((c) => c + c).join('');
        return {
            argb: parseInt(`ff${expanded}`, 16) >>> 0,
            hex: `#${expanded.toUpperCase()}`
        };
    }
    if (/^[0-9a-f]{6}$/i.test(hex)) {
        return {
            argb: parseInt(`ff${hex}`, 16) >>> 0,
            hex: `#${hex.toUpperCase()}`
        };
    }
    if (/^[0-9a-f]{8}$/i.test(hex)) {
        return {
            argb: parseInt(hex, 16) >>> 0,
            hex: `#${hex.slice(2).toUpperCase()}`
        };
    }
    return null;
}

async function setChatTheme(sock, jid, themeIdOrAlias) {
    const resolved = resolveTheme(themeIdOrAlias);
    const colorSchemeId = resolved ? resolved.id : String(themeIdOrAlias || '').trim();
    if (!colorSchemeId) throw new Error('Theme ID tidak valid.');

    await sock.relayMessage(jid, {
        protocolMessage: {
            type: 34,
            chatThemeSetting: {
                settingTimestampMs: Date.now(),
                colorSchemeId
            }
        }
    }, {
        additionalAttributes: { type: 'media' },
        AI: false
    });

    return resolved || { id: colorSchemeId, name: colorSchemeId, emoji: '🎨' };
}

async function setChatThemeColor(sock, jid, { backgroundLightArgb, backgroundDarkArgb, isDoodleEnabled = false }) {
    const light = Number(backgroundLightArgb) >>> 0;
    const dark = Number(backgroundDarkArgb !== undefined ? backgroundDarkArgb : backgroundLightArgb) >>> 0;

    await sock.relayMessage(jid, {
        protocolMessage: {
            type: 34,
            chatThemeSetting: {
                settingTimestampMs: Date.now(),
                solidColor: {
                    backgroundLightArgb: light,
                    backgroundDarkArgb: dark,
                    isDoodleEnabled: Boolean(isDoodleEnabled)
                }
            }
        }
    }, {
        additionalAttributes: { type: 'media' },
        AI: false
    });

    return { backgroundLightArgb: light, backgroundDarkArgb: dark, isDoodleEnabled: Boolean(isDoodleEnabled) };
}

async function clearChatTheme(sock, jid) {
    await sock.relayMessage(jid, {
        protocolMessage: {
            type: 34,
            chatThemeSetting: {
                settingTimestampMs: Date.now(),
                clearTheme: true
            }
        }
    }, {
        additionalAttributes: { type: 'media' },
        AI: false
    });
    return true;
}

function attachChatThemeHelpers(sock) {
    if (!sock || typeof sock !== 'object') return sock;
    if (typeof sock.setChatTheme !== 'function') {
        sock.setChatTheme = (jid, themeId) => setChatTheme(sock, jid, themeId);
    }
    if (typeof sock.setChatThemeColor !== 'function') {
        sock.setChatThemeColor = (jid, opts) => setChatThemeColor(sock, jid, opts);
    }
    if (typeof sock.clearChatTheme !== 'function') {
        sock.clearChatTheme = (jid) => clearChatTheme(sock, jid);
    }
    return sock;
}

module.exports = {
    CHAT_THEMES,
    NAMED_COLORS,
    resolveTheme,
    parseArgbColor,
    setChatTheme,
    setChatThemeColor,
    clearChatTheme,
    attachChatThemeHelpers
};
