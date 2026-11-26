(function ensureDependencies() {
    try {
        const { execSync } = require('child_process');
        const requiredModules = ['chalk', 'axios', 'pino', '@whiskeysockets/baileys'];
        const missing = requiredModules.some((mod) => {
            try {
                require.resolve(mod, { paths: [__dirname] });
                return false;
            } catch (_) {
                return true;
            }
        });
        if (missing) {
            console.log('[Startup] Modul belum lengkap, menginstal dependencies...');
            execSync('npm install --allow-git=all --no-audit', { stdio: 'inherit', cwd: __dirname });
            console.log('[Startup] Dependencies berhasil diinstal.');
        }
    } catch (e) {
        console.error('[Startup] Gagal auto-install:', e.message);
    }
})();

(function patchBaileysCompat() {
    try {
        const fs = require('fs');
        const path = require('path');
        const baileysRoot = path.join(__dirname, 'node_modules', '@whiskeysockets', 'baileys', 'lib');

        const baileysIndex = path.join(baileysRoot, 'index.js');
        if (fs.existsSync(baileysIndex)) {
            const idxSrc = fs.readFileSync(baileysIndex, 'utf8');
            if (idxSrc.includes('alifalfrl') || idxSrc.includes('bigedikeman') || idxSrc.includes('clearConsole();')) {
                const cleaned = idxSrc.replace(/const chalk = require\("chalk"\);[\s\S]*?(?=var __createBinding)/, '');
                if (cleaned !== idxSrc && cleaned.includes('__createBinding')) {
                    fs.writeFileSync(baileysIndex, cleaned, 'utf8');
                }
            }
        }

        const sendFile = path.join(baileysRoot, 'Socket', 'messages-send.js');
        if (fs.existsSync(sendFile)) {
            let src = fs.readFileSync(sendFile, 'utf8');
            let sendChanged = false;
            if (src.includes('statusJidList, AI = true }')) {
                src = src.replace('statusJidList, AI = true }', 'statusJidList, AI = false }');
                sendChanged = true;
            }
            if (!src.includes('patch-chat-theme')) {
                const mediaTypeRe = /const mediaType = getMediaType\(messages\);?/;
                if (mediaTypeRe.test(src)) {
                    src = src.replace(
                        mediaTypeRe,
                        "// [patch-chat-theme] code founded by - @DanuZz\n            const isChatTheme = (messages?.protocolMessage?.type === 34 || message?.protocolMessage?.type === 34);\n            const mediaType = isChatTheme ? 'chat_theme' : getMediaType(messages);"
                    );
                    sendChanged = true;
                }
            }
            if (!src.includes('message.stickerPackMessage')) {
                const stickerMediaRe = /(else if\s*\(message\.stickerMessage\)\s*\{\s*return\s*'sticker';?\s*\})/;
                if (stickerMediaRe.test(src)) {
                    src = src.replace(
                        stickerMediaRe,
                        "$1\n        else if (message.stickerPackMessage) {\n            return 'sticker_pack'\n        }"
                    );
                    sendChanged = true;
                }
            }
            const oldUsyncMap = 'const extracted = Utils_1.extractDeviceJids(result?.list, authState.creds.me.id, ignoreZeroDevices)\n            const deviceMap = {}';
            const oldUsyncMapCRLF = oldUsyncMap.replace(/\n/g, '\r\n');
            const newUsyncMap = 'const extracted = Utils_1.extractDeviceJids(result?.list, authState.creds.me.id, ignoreZeroDevices)\n            const deviceMap = {}\n            for (const _fj of toFetch) { const _fu = WABinary_1.jidDecode(_fj)?.user; if (_fu) deviceMap[_fu] = []; }';
            if (src.includes(oldUsyncMap)) {
                src = src.replace(oldUsyncMap, newUsyncMap);
                sendChanged = true;
            } else if (src.includes(oldUsyncMapCRLF)) {
                src = src.replace(oldUsyncMapCRLF, newUsyncMap);
                sendChanged = true;
            }
            if (sendChanged) {
                fs.writeFileSync(sendFile, src, 'utf8');
            }
        }

        const recvFile = path.join(baileysRoot, 'Socket', 'messages-recv.js');
        if (fs.existsSync(recvFile)) {
            let recvSrc = fs.readFileSync(recvFile, 'utf8');
            let recvChanged = false;

            const dmLidRe = /if\s*\(!\(0,\s*WABinary_1\.isJidGroup\)\(msg\.key\.remoteJid\)\s*&&\s*\(0,\s*WABinary_1\.isLidUser\)\(msg\.key\.remoteJid\)\)\s*\{\s*msg\.key\.remoteJid\s*=\s*node\.attrs\.sender_pn\s*\|\|\s*node\.attrs\.peer_recipient_pn;\s*\}/;
            const newDmLidBlock = `if (!(0, WABinary_1.isJidGroup)(msg.key.remoteJid) && (0, WABinary_1.isLidUser)(msg.key.remoteJid)) {\n                            const _meLid = authState.creds.me ? authState.creds.me.lid : '';\n                            const _meId = authState.creds.me ? authState.creds.me.id : '';\n                            const _resolvedDmPn = msg.key.fromMe\n                                ? (node.attrs.recipient_pn || node.attrs.peer_recipient_pn || ((0, WABinary_1.areJidsSameUser)(msg.key.remoteJid, _meLid) ? _meId : ''))\n                                : (node.attrs.sender_pn || node.attrs.peer_recipient_pn);\n                            if (_resolvedDmPn) {\n                                msg.key.remoteJid = _resolvedDmPn;\n                            }\n                        }`;
            if (dmLidRe.test(recvSrc)) {
                recvSrc = recvSrc.replace(dmLidRe, newDmLidBlock);
                recvChanged = true;
            }

            const oldPartLid = 'msg.key.participant = node.attrs.participant_pn || authState.creds.me.id;';
            const newPartLid = 'msg.key.participant = node.attrs.participant_pn || ((0, WABinary_1.areJidsSameUser)(msg.key.participant, authState.creds.me ? authState.creds.me.lid : \'\') ? authState.creds.me.id : msg.key.participant);';
            if (recvSrc.includes(oldPartLid)) {
                recvSrc = recvSrc.replace(oldPartLid, newPartLid);
                recvChanged = true;
            }

            if (recvChanged) {
                fs.writeFileSync(recvFile, recvSrc, 'utf8');
            }
        }

        const decodeFile = path.join(baileysRoot, 'Utils', 'decode-wa-message.js');
        if (fs.existsSync(decodeFile)) {
            const decSrc = fs.readFileSync(decodeFile, 'utf8');
            const oldFromMe = 'const fromMe = (0, WABinary_1.isJidNewsLetter)(from) ? !!((_a = stanza.attrs) === null || _a === void 0 ? void 0 : _a.is_sender) : ((0, WABinary_1.isLidUser)(from) ? isMeLid : isMe)(stanza.attrs.participant || stanza.attrs.from);';
            const newFromMe = 'const _fromMeJid = stanza.attrs.participant || stanza.attrs.from;\n    const fromMe = (0, WABinary_1.isJidNewsLetter)(from) ? !!((_a = stanza.attrs) === null || _a === void 0 ? void 0 : _a.is_sender) : ((0, WABinary_1.isLidUser)(_fromMeJid) ? isMeLid : isMe)(_fromMeJid);';
            if (decSrc.includes(oldFromMe)) {
                fs.writeFileSync(decodeFile, decSrc.replace(oldFromMe, newFromMe), 'utf8');
            }
        }
    } catch (e) {
        console.warn('[Startup] Patch Baileys skip:', e?.message || e);
    }
})();

process.env.FORCE_COLOR = '3';
process.setMaxListeners(0);
require('events').EventEmitter.defaultMaxListeners = 100;

(function silenceLibsignalNoise() {
    const noisyRe = /^(Closing (?:open |stale open )?session|Removing old closed session|Session already (?:closed|open)|Migrating session|Decrypted message with closed session|Opening session)/i;
    const isNoisy = (args) => {
        if (!args || args.length === 0) return false;
        const first = typeof args[0] === 'string' ? args[0].trim() : '';
        if (first && noisyRe.test(first)) return true;
        if (args.length >= 2 && args[1] && typeof args[1] === 'object' && args[1].constructor?.name === 'SessionEntry') {
            return true;
        }
        return false;
    };
    for (const method of ['log', 'info', 'warn']) {
        const orig = console[method].bind(console);
        console[method] = (...args) => {
            if (isNoisy(args)) return;
            return orig(...args);
        };
    }
})();

process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]', err?.message || err);
});

process.on('unhandledRejection', (err) => {
    console.error('[Unhandled Rejection]', err?.message || err);
});

require('./settings');
const chalk = require('chalk');
const { startBot } = require('./src/core/bot');

function boot() {
    startBot().catch((err) => {
        console.error(chalk.red('[Boot] Gagal memulai bot:'), err);
        setTimeout(boot, 10000);
    });
}

boot();
