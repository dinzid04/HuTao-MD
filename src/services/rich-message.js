const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const axios = require('axios');
const baileys = require('@whiskeysockets/baileys');
const { formatCard } = require('../utils/formatter');

const RAW_BASE = 'https://raw.githubusercontent.com/noxXza/data/refs/heads/main';
const CERT_URL = `${RAW_BASE}/certificate.json`;
const DEFAULT_SIGNATURE = 'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==';
const CACHE_TTL_MS = 30 * 60 * 1000;
const LOCAL_GAMES_DIR = path.join(process.cwd(), 'assets', 'richgames');

const cache = new Map();

const YOUHU_GAMES = {
    dino: {
        key: 'dino',
        name: 'Dino Runner',
        emoji: '🦖',
        file: 'dino',
        title: 'Dino Runner',
        trustedSources: ['nox.dev'],
        desc: 'Lompati kaktus dan raih skor tertinggi langsung di chat WhatsApp.'
    },
    ttc: {
        key: 'ttc',
        name: 'Tic-Tac-Toe Dark UI',
        emoji: '❌',
        file: 'ttc',
        title: 'Tic-Tac-Toe Premium',
        trustedSources: ['pastebin.com'],
        desc: 'Tic-Tac-Toe interaktif melawan AI dengan mode gelap.'
    },
    chess: {
        key: 'chess',
        name: 'Mini Chess',
        emoji: '♟️',
        file: 'chess',
        title: 'Mini Chess',
        trustedSources: ['nox.dev'],
        desc: 'Catur interaktif penuh langsung di dalam pesan WhatsApp.'
    },
    mbim: {
        key: 'mbim',
        name: 'MBIM Highway Racer',
        emoji: '🏎️',
        file: 'mbim',
        title: 'Highway Racer',
        trustedSources: ['nox.dev'],
        desc: 'Balapan mobil cepat di jalan tol menghindari rintangan.'
    },
    plane: {
        key: 'plane',
        name: 'Space Rush Plane',
        emoji: '🚀',
        file: 'plane',
        title: 'Space Rush',
        trustedSources: ['nox.dev'],
        desc: 'Tembak asteroid & musuh luar angkasa dengan pesawat tempur.'
    },
    flappy: {
        key: 'flappy',
        name: 'Flappy Bird',
        emoji: '🐦',
        file: 'bird',
        title: 'Flappy Bird',
        trustedSources: ['nox.dev'],
        desc: 'Terbangkan burung melewati pipa tanpa menabrak.'
    },
    '2048': {
        key: '2048',
        name: '2048 Classic',
        emoji: '🔢',
        localFile: '2048.html',
        title: '2048 Classic',
        trustedSources: ['nox.dev'],
        desc: 'Gabungkan ubin angka 2 sampai 2048 dengan fitur Undo & swipe.'
    },
    snake: {
        key: 'snake',
        name: 'Arcade Snake',
        emoji: '🐍',
        localFile: 'snake.html',
        title: 'Arcade Snake',
        trustedSources: ['nox.dev'],
        desc: 'Ular klasik dengan 3 kecepatan, swipe & tombol arah responsif.'
    },
    tetris: {
        key: 'tetris',
        name: 'Block Drop (Tetris)',
        emoji: '🧱',
        localFile: 'tetris.html',
        title: 'Block Drop',
        trustedSources: ['nox.dev'],
        desc: 'Susun balok tetromino lengkap dengan ghost preview & hard drop.'
    },
    minesweeper: {
        key: 'minesweeper',
        name: 'Minesweeper Tactical',
        emoji: '💣',
        localFile: 'minesweeper.html',
        title: 'Minesweeper',
        trustedSources: ['nox.dev'],
        desc: 'Buka area aman, tandai bom, ukuran 8x8 & 9x9, klik pertama aman.'
    },
    memory: {
        key: 'memory',
        name: 'Memory Flip Cards',
        emoji: '🃏',
        localFile: 'memory.html',
        title: 'Memory Flip',
        trustedSources: ['nox.dev'],
        desc: 'Cocokkan pasangan kartu simbol geometris (12 atau 16 kartu).'
    },
    breakout: {
        key: 'breakout',
        name: 'Brick Breaker',
        emoji: '🏓',
        localFile: 'breakout.html',
        title: 'Brick Breaker',
        trustedSources: ['nox.dev'],
        desc: 'Hancurkan semua bata warna dengan kontrol sentuh geser & multi-level.'
    },
    connect4: {
        key: 'connect4',
        name: 'Connect 4 vs AI',
        emoji: '🔴',
        localFile: 'connect4.html',
        title: 'Connect 4',
        trustedSources: ['nox.dev'],
        desc: 'Susun 4 koin sejajar melawan AI cerdas atau mode 2 pemain.'
    },
    simon: {
        key: 'simon',
        name: 'Simon Pattern',
        emoji: '🎛️',
        localFile: 'simon.html',
        title: 'Simon Pattern',
        trustedSources: ['nox.dev'],
        desc: 'Latih daya ingat mengikuti urutan 4 pad warna yang makin cepat.'
    },
    stack: {
        key: 'stack',
        name: 'Tower Stack',
        emoji: '🏗️',
        localFile: 'stack.html',
        title: 'Tower Stack',
        trustedSources: ['nox.dev'],
        desc: 'Tumpuk balok setinggi mungkin dengan potongan presisi & combo.'
    },
    wordle: {
        key: 'wordle',
        name: 'Katla ID (Tebak Kata)',
        emoji: '🔤',
        localFile: 'wordle.html',
        title: 'Katla ID',
        trustedSources: ['nox.dev'],
        desc: 'Tebak kata Bahasa Indonesia 5 huruf dalam 6 percobaan.'
    }
};

function stringifyEscaped(obj) {
    return JSON.stringify(obj).replace(
        /[\u007f-\uffff]/g,
        (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')
    );
}

function makeMessageId() {
    if (typeof baileys.generateMessageIDV2 === 'function') return baileys.generateMessageIDV2();
    if (typeof baileys.generateMessageID === 'function') return baileys.generateMessageID();
    return '3EB0' + crypto.randomBytes(8).toString('hex').toUpperCase();
}

function buildFallbackVerification() {
    const sigMat = Buffer.from('CLUTCH.MessageBuilderV4.7-VerificationSignature.Metadata');
    const certMat = Buffer.from('CLUTCH.MessageBuilderV4.7-CertificateChain.Metadata');
    const padTo = (buf, size) => (buf.length >= size ? buf.subarray(0, size) : Buffer.concat([buf, crypto.randomBytes(size - buf.length)]));
    return {
        proofs: [
            {
                version: 1,
                useCase: 1,
                signature: padTo(sigMat, 64).toString('base64'),
                certificateChain: [
                    padTo(certMat, 684).toString('base64'),
                    padTo(certMat, 892).toString('base64')
                ]
            }
        ]
    };
}

async function fetchCached(key, url, parseJson = false) {
    const existing = cache.get(key);
    if (existing && Date.now() - existing.ts < CACHE_TTL_MS) {
        return existing.data;
    }
    const res = await axios.get(url, {
        timeout: 15000,
        responseType: parseJson ? 'json' : 'text',
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = res.data;
    if (!data || (typeof data === 'string' && !data.trim())) {
        throw new Error(`Payload ${key} kosong`);
    }
    cache.set(key, { ts: Date.now(), data });
    return data;
}

async function relayRichContent(Dinz, jid, rawMessageObj, { bypassDownload = true } = {}) {
    let msgToSend = rawMessageObj;
    let msgId = makeMessageId();

    if (typeof baileys.generateWAMessageFromContent === 'function') {
        const built = baileys.generateWAMessageFromContent(jid, rawMessageObj, {
            messageId: msgId,
            userJid: Dinz.user?.id
        });
        if (built?.message) {
            msgToSend = built.message;
            msgId = built.key?.id || msgId;
        }
    }

    await Dinz.relayMessage(jid, msgToSend, {
        messageId: msgId
    });

    if (bypassDownload && typeof baileys.generateWAMessageFromContent === 'function') {
        try {
            const editId = makeMessageId();
            const editBuilt = baileys.generateWAMessageFromContent(
                jid,
                {
                    botForwardedMessage: {
                        message: {
                            protocolMessage: {
                                key: { remoteJid: jid, fromMe: true, id: msgId },
                                type: 14,
                                editedMessage: msgToSend
                            }
                        }
                    }
                },
                { messageId: editId, userJid: Dinz.user?.id }
            );
            if (editBuilt?.message) {
                await Dinz.relayMessage(jid, editBuilt.message, {
                    messageId: editBuilt.key?.id || editId
                });
            }
        } catch (editErr) {
            console.error('[RichMessage] bypassDownload edit error:', editErr?.message || editErr);
        }
    }

    return { key: { remoteJid: jid, fromMe: true, id: msgId }, message: msgToSend };
}

function buildHtmlRichPayload({ htmlPayload, title, trustedSources = ['nox.dev'], certChain }) {
    const responseData = {
        response_id: crypto.randomUUID(),
        sections: [
            {
                view_model: {
                    primitive: {
                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                        payload: htmlPayload,
                        trusted_sources: trustedSources
                    },
                    __typename: 'GenAISingleLayoutViewModel'
                }
            }
        ]
    };

    const dataBase64 = Buffer.from(stringifyEscaped(responseData)).toString('base64');
    const verificationMetadata = Array.isArray(certChain) && certChain.length > 0
        ? {
            proofs: [
                {
                    version: 1,
                    useCase: 1,
                    signature: DEFAULT_SIGNATURE,
                    certificateChain: certChain
                }
            ]
        }
        : buildFallbackVerification();

    return {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                messageDisclaimerText: '',
                botResponseId: crypto.randomUUID(),
                verificationMetadata
            }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [
                        {
                            messageType: 2,
                            messageText: title || `${global.botname || 'HuTao - MD'} Rich Game`
                        }
                    ],
                    unifiedResponse: { data: dataBase64 },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: {
                            botJid: '867051314767696@bot'
                        },
                        forwardOrigin: 4
                    }
                }
            }
        }
    };
}

function loadLocalHtml(filename) {
    const key = `local_${filename}`;
    const fullPath = path.join(LOCAL_GAMES_DIR, filename);
    const stat = fs.statSync(fullPath);
    const existing = cache.get(key);
    if (existing && existing.mtime === stat.mtimeMs) return existing.data;
    const html = fs.readFileSync(fullPath, 'utf8');
    cache.set(key, { ts: Date.now(), mtime: stat.mtimeMs, data: html });
    return html;
}

async function sendYouhuRichGame(Dinz, m, gameKey) {
    const game = YOUHU_GAMES[gameKey];
    if (!game) throw new Error(`Rich game "${gameKey}" tidak ditemukan`);

    const [certChain, htmlPayload] = await Promise.all([
        fetchCached('cert', CERT_URL, true).catch(() => null),
        game.localFile
            ? Promise.resolve(loadLocalHtml(game.localFile))
            : fetchCached(`html_${game.file}`, `${RAW_BASE}/${game.file}.html`, false)
    ]);

    const activeBotName = global.botname || 'HuTao - MD';
    const payload = buildHtmlRichPayload({
        htmlPayload,
        title: `${game.title} - ${activeBotName}`,
        trustedSources: game.trustedSources,
        certChain
    });

    await relayRichContent(Dinz, m.chat, payload, { bypassDownload: true });
    return game;
}

async function sendRichPingDashboard(Dinz, m, latencyMs = 15) {
    const [certChain, rawHtml] = await Promise.all([
        fetchCached('cert', CERT_URL, true).catch(() => null),
        fetchCached('html_ping', `${RAW_BASE}/ping.html`, false)
    ]);

    const mem = process.memoryUsage();
    const heapMb = `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`;
    const rssMb = `${(mem.rss / 1024 / 1024).toFixed(1)} MB`;
    const cpus = os.cpus() || [];
    const botName = global.botname || 'HuTao - MD';

    const filledHtml = String(rawHtml)
        .replace(/%LATENCY%/g, String(Math.max(1, Math.round(latencyMs))))
        .replace(/%BOTUPTIME%/g, String(Math.floor(process.uptime())))
        .replace(/%SYSTEMUPTIME%/g, String(Math.floor(os.uptime())))
        .replace(/%CPU_CORES%/g, String(cpus.length || 1))
        .replace(/%HEAP_USED%/g, heapMb)
        .replace(/%RSS_MEM%/g, rssMb)
        .replace(/%NODE_INFO%/g, process.version)
        .replace(/%OS_INFO%/g, `${os.type()} ${os.release()}`)
        .replace(/%PLATFORM%/g, os.platform())
        .replace(/%ARCH_INFO%/g, os.arch())
        .replace(/© noxXza • 2026/g, `© ${botName}`);

    const payload = buildHtmlRichPayload({
        htmlPayload: filledHtml,
        title: `${botName} Live Monitor`,
        trustedSources: ['nox.dev'],
        certChain
    });

    await relayRichContent(Dinz, m.chat, payload, { bypassDownload: true });
}

function tokenizeCode(code, lang = 'javascript') {
    const normalizedLang = String(lang || 'javascript').toLowerCase();
    const keywordSets = {
        javascript: new Set(['const', 'let', 'var', 'function', 'async', 'await', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'try', 'catch', 'finally', 'class', 'new', 'import', 'export', 'from', 'true', 'false', 'null', 'undefined', 'throw']),
        ts: new Set(['const', 'let', 'var', 'function', 'async', 'await', 'return', 'if', 'else', 'for', 'while', 'interface', 'type', 'enum', 'class', 'new', 'import', 'export', 'from', 'public', 'private', 'readonly', 'true', 'false', 'null']),
        python: new Set(['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'async', 'await', 'True', 'False', 'None', 'in', 'not', 'and', 'or']),
        bash: new Set(['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'export', 'local', 'return', 'echo'])
    };
    keywordSets.js = keywordSets.javascript;
    keywordSets.py = keywordSets.python;
    keywordSets.sh = keywordSets.bash;

    const keywords = keywordSets[normalizedLang] || keywordSets.javascript;
    const TYPE_MAP = { 0: 'DEFAULT', 1: 'KEYWORD', 2: 'METHOD', 3: 'STR', 4: 'NUMBER', 5: 'COMMENT' };
    const tokens = [];

    const push = (content, highlightType) => {
        if (!content) return;
        const last = tokens[tokens.length - 1];
        if (last && last.highlightType === highlightType) last.codeContent += content;
        else tokens.push({ codeContent: content, highlightType });
    };

    let i = 0;
    while (i < code.length) {
        const c = code[i];
        if (/\s/.test(c)) {
            const s = i;
            while (i < code.length && /\s/.test(code[i])) i++;
            push(code.slice(s, i), 0);
            continue;
        }
        if ((c === '/' && code[i + 1] === '/') || (c === '#' && ['python', 'py', 'bash', 'sh'].includes(normalizedLang))) {
            const s = i;
            while (i < code.length && code[i] !== '\n') i++;
            push(code.slice(s, i), 5);
            continue;
        }
        if (c === '"' || c === "'" || c === '`') {
            const s = i;
            const q = c;
            i++;
            while (i < code.length) {
                if (code[i] === '\\' && i + 1 < code.length) i += 2;
                else if (code[i] === q) { i++; break; }
                else i++;
            }
            push(code.slice(s, i), 3);
            continue;
        }
        if (/[0-9]/.test(c)) {
            const s = i;
            while (i < code.length && /[0-9._]/.test(code[i])) i++;
            push(code.slice(s, i), 4);
            continue;
        }
        if (/[a-zA-Z_$]/.test(c)) {
            const s = i;
            while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) i++;
            const word = code.slice(s, i);
            let t = keywords.has(word) ? 1 : 0;
            if (t === 0 && code[i] === '(') t = 2;
            push(word, t);
            continue;
        }
        push(c, 0);
        i++;
    }

    return {
        codeBlock: tokens,
        unifiedCodeBlock: tokens.map((t) => ({ content: t.codeContent, type: TYPE_MAP[t.highlightType] }))
    };
}

function buildRichWrapper({ title = '', submessages = [], sections = [], quoted = null }) {
    const contextInfo = {
        forwardingScore: 1,
        isForwarded: true,
        forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
        forwardOrigin: 4
    };
    if (quoted?.key?.id) {
        contextInfo.stanzaId = quoted.key.id;
        contextInfo.participant = quoted.key.participant || quoted.key.remoteJid;
        contextInfo.quotedType = 0;
        contextInfo.quotedMessage = quoted.message || undefined;
    }

    return {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                messageDisclaimerText: title || '',
                botResponseId: crypto.randomUUID(),
                verificationMetadata: buildFallbackVerification()
            }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages,
                    unifiedResponse: {
                        data: Buffer.from(stringifyEscaped({
                            response_id: crypto.randomUUID(),
                            sections
                        })).toString('base64')
                    },
                    contextInfo
                }
            }
        }
    };
}

async function sendNativeAIRich(rich, jid, quoted) {
    return rich.send(jid, {
        quoted,
        bypassDownload: true
    });
}

async function sendRichTable(Dinz, m, { title = 'Tabel Data', headers = [], rows = [], intro = '', footer = '' }) {
    const colCount = Math.max(headers.length, ...rows.map((r) => r.length), 1);
    const padRow = (r) => {
        const arr = r.map((c) => String(c ?? ''));
        while (arr.length < colCount) arr.push('');
        return arr;
    };

    const normHeader = padRow(headers);
    const normRows = rows.map(padRow);

    try {
        if (typeof Dinz.AIRich === 'function') {
            const rich = new Dinz.AIRich({ unsupportedTypeAlert: false });
            if (title) rich.setTitle(title);
            if (intro) rich.addText(intro);
            rich.addTable([normHeader, ...normRows]);
            if (footer) rich.setFooter(footer);
            await sendNativeAIRich(rich, m.chat, m);
            return { rich: true };
        }

        const submessages = [];
        const sections = [];
        if (intro) {
            submessages.push({ messageType: 2, messageText: intro });
            sections.push({
                view_model: {
                    primitive: { text: intro, __typename: 'GenAIMarkdownTextUXPrimitive' },
                    __typename: 'GenAISingleLayoutViewModel'
                }
            });
        }
        submessages.push({
            messageType: 4,
            tableMetadata: {
                title,
                rows: [{ items: normHeader, isHeading: true }, ...normRows.map((cells) => ({ items: cells }))]
            }
        });
        sections.push({
            view_model: {
                primitive: {
                    rows: [{ is_header: true, cells: normHeader }, ...normRows.map((cells) => ({ is_header: false, cells }))],
                    __typename: 'GenATableUXPrimitive'
                },
                __typename: 'GenAISingleLayoutViewModel'
            }
        });
        if (footer) {
            sections.push({
                view_model: {
                    primitive: { text: footer, __typename: 'GenAIMetadataTextPrimitive' },
                    __typename: 'GenAISingleLayoutViewModel'
                }
            });
        }

        const payload = buildRichWrapper({ title, submessages, sections, quoted: m });
        await relayRichContent(Dinz, m.chat, payload, { bypassDownload: true });
        return { rich: true };
    } catch (err) {
        console.error('[RichMessage] sendRichTable error:', err?.message || err);
        const fallbackBody = [
            `*${normHeader.join(' | ')}*`,
            ...normRows.map((r) => `◦ ${r.join(' | ')}`)
        ].join('\n');
        const text = formatCard({ icon: '📊', title, body: `${intro ? intro + '\n\n' : ''}${fallbackBody}`, footer });
        await Dinz.sendMessage(m.chat, { text }, { quoted: m });
        return { rich: false };
    }
}

async function sendRichCode(Dinz, m, { language = 'javascript', title = 'Code Snippet', code = '', intro = '', footer = '' }) {
    const cleanLang = String(language || 'javascript').toLowerCase();
    try {
        if (typeof Dinz.AIRich === 'function') {
            const rich = new Dinz.AIRich({ unsupportedTypeAlert: false });
            if (title) rich.setTitle(title);
            if (intro) rich.addText(intro);
            rich.addCode(cleanLang, code);
            if (footer) rich.setFooter(footer);
            await sendNativeAIRich(rich, m.chat, m);
            return { rich: true };
        }

        const { codeBlock, unifiedCodeBlock } = tokenizeCode(code, cleanLang);
        const submessages = [];
        const sections = [];
        if (intro) {
            submessages.push({ messageType: 2, messageText: intro });
            sections.push({
                view_model: {
                    primitive: { text: intro, __typename: 'GenAIMarkdownTextUXPrimitive' },
                    __typename: 'GenAISingleLayoutViewModel'
                }
            });
        }
        submessages.push({
            messageType: 5,
            codeMetadata: { codeLanguage: cleanLang, codeBlocks: codeBlock }
        });
        sections.push({
            view_model: {
                primitive: { language: cleanLang, code_blocks: unifiedCodeBlock, __typename: 'GenAICodeUXPrimitive' },
                __typename: 'GenAISingleLayoutViewModel'
            }
        });
        if (footer) {
            sections.push({
                view_model: {
                    primitive: { text: footer, __typename: 'GenAIMetadataTextPrimitive' },
                    __typename: 'GenAISingleLayoutViewModel'
                }
            });
        }

        const payload = buildRichWrapper({ title, submessages, sections, quoted: m });
        await relayRichContent(Dinz, m.chat, payload, { bypassDownload: true });
        return { rich: true };
    } catch (err) {
        console.error('[RichMessage] sendRichCode error:', err?.message || err);
        const text = `${intro ? intro + '\n\n' : ''}\`\`\`${cleanLang}\n${code}\n\`\`\`${footer ? `\n_${footer}_` : ''}`;
        await Dinz.sendMessage(m.chat, { text }, { quoted: m });
        return { rich: false };
    }
}

async function sendRichCard(Dinz, m, { title = 'Rich Info', text = '', suggestions = [], footer = '' }) {
    try {
        if (typeof Dinz.AIRich === 'function') {
            const rich = new Dinz.AIRich({ unsupportedTypeAlert: false });
            if (title) rich.setTitle(title);
            rich.addText(text);
            if (Array.isArray(suggestions) && suggestions.length > 0) {
                rich.addSuggest(suggestions.slice(0, 6).map((s) => String(s).trim()));
            }
            if (footer) rich.setFooter(footer);
            await sendNativeAIRich(rich, m.chat, m);
            return { rich: true };
        }

        const submessages = [{ messageType: 2, messageText: text }];
        const sections = [
            {
                view_model: {
                    primitive: { text, __typename: 'GenAIMarkdownTextUXPrimitive' },
                    __typename: 'GenAISingleLayoutViewModel'
                }
            }
        ];

        if (Array.isArray(suggestions) && suggestions.length > 0) {
            const pills = suggestions.slice(0, 6).map((s) => ({
                prompt_text: String(s).trim(),
                prompt_type: 'SUGGESTED_PROMPT',
                __typename: 'GenAIFollowUpSuggestionPillPrimitive'
            }));
            sections.push({
                __typename: 'GenAIUnifiedResponseSection',
                view_model: {
                    [pills.length === 1 ? 'primitive' : 'primitives']: pills.length === 1 ? pills[0] : pills,
                    __typename: pills.length === 1 ? 'GenAISingleLayoutViewModel' : 'GenAIHScrollLayoutViewModel'
                }
            });
        }

        if (footer) {
            sections.push({
                view_model: {
                    primitive: { text: footer, __typename: 'GenAIMetadataTextPrimitive' },
                    __typename: 'GenAISingleLayoutViewModel'
                }
            });
        }

        const payload = buildRichWrapper({ title, submessages, sections, quoted: m });
        await relayRichContent(Dinz, m.chat, payload, { bypassDownload: true });
        return { rich: true };
    } catch (err) {
        console.error('[RichMessage] sendRichCard error:', err?.message || err);
        const card = formatCard({ icon: '✨', title, body: text, footer });
        await Dinz.sendMessage(m.chat, { text: card }, { quoted: m });
        return { rich: false };
    }
}

async function sendRichHtmlToJid(Dinz, jid, { title, htmlPayload, trustedSources = ['nox.dev'], bypassDownload = true }) {
    const certChain = await fetchCached('cert', CERT_URL, true).catch(() => null);
    const activeBotName = global.botname || 'HuTao - MD';
    const payload = buildHtmlRichPayload({
        htmlPayload,
        title: title || `${activeBotName} Rich Preview`,
        trustedSources,
        certChain
    });
    return relayRichContent(Dinz, jid, payload, { bypassDownload });
}

async function sendRichHtml(Dinz, m, { title, htmlPayload, trustedSources = ['nox.dev'], bypassDownload = true }) {
    return sendRichHtmlToJid(Dinz, m.chat, { title, htmlPayload, trustedSources, bypassDownload });
}

module.exports = {
    YOUHU_GAMES,
    sendYouhuRichGame,
    sendRichPingDashboard,
    sendRichHtml,
    sendRichHtmlToJid,
    sendRichTable,
    sendRichCode,
    sendRichCard
};
