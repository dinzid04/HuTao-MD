const OPTIONAL_NATIVE_MODULES = new Set([
    'sharp',
    'canvas',
    '@ffmpeg-installer/ffmpeg',
    'jimp',
    'link-preview-js',
    'qrcode-terminal'
]);

function getMissingRequiredModules() {
    const fs = require('fs');
    const path = require('path');
    let requiredModules = ['chalk', 'axios', 'pino', '@whiskeysockets/baileys'];
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
        if (pkg && pkg.dependencies && typeof pkg.dependencies === 'object') {
            requiredModules = [...new Set([...Object.keys(pkg.dependencies), ...requiredModules])];
        }
    } catch (_) {}

    const missing = [];
    for (const mod of requiredModules) {
        if (OPTIONAL_NATIVE_MODULES.has(mod)) continue;
        try {
            require.resolve(mod, { paths: [__dirname] });
        } catch (_) {
            missing.push(mod);
        }
    }
    return missing;
}

function runNpmInstallWithRetry(argsStr = '', maxAttempts = 3) {
    const { execSync } = require('child_process');
    const baseFlags = '--allow-git=all --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=15000 --fetch-retry-maxtimeout=90000';
    const cmd = `npm install ${argsStr ? argsStr + ' ' : ''}${baseFlags}`.trim();
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`[Auto-Install] Menjalankan (${attempt}/${maxAttempts}): ${cmd}`);
            execSync(cmd, { stdio: 'inherit', cwd: __dirname });
            return true;
        } catch (err) {
            console.error(`[Auto-Install] Percobaan ${attempt}/${maxAttempts} gagal:`, err?.message || err);
            if (attempt < maxAttempts) {
                console.log('[Auto-Install] Mencoba ulang dalam 4 detik...');
                const end = Date.now() + 4000;
                while (Date.now() < end) {}
            }
        }
    }
    return false;
}

(function ensureDependencies() {
    try {
        const missing = getMissingRequiredModules();
        if (!missing.length) return;

        console.log(`[Startup] Ditemukan ${missing.length} modul belum terpasang: ${missing.join(', ')}`);
        console.log('[Startup] Menjalankan auto-install dependencies...');
        runNpmInstallWithRetry('', 3);

        const stillMissing = getMissingRequiredModules();
        if (stillMissing.length) {
            console.log(`[Startup] Masih kurang ${stillMissing.length} modul (${stillMissing.join(', ')}), mencoba install satuan...`);
            const targets = stillMissing
                .map((m) => (m === '@whiskeysockets/baileys' ? 'https://github.com/dinzid04/hutao-baileys.git' : m))
                .join(' ');
            runNpmInstallWithRetry(targets, 2);
        }

        const finalMissing = getMissingRequiredModules();
        if (!finalMissing.length) {
            console.log('[Startup] Semua dependencies lengkap dan siap dijalankan.');
        } else {
            console.warn('[Startup] Beberapa modul masih belum terpasang:', finalMissing.join(', '));
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

        // Pastikan sharp di MessageBuilder bersifat opsional agar Termux ARM64 / Android bebas crash
        const msgBuilderPath = path.join(baileysRoot, 'Utils', 'MessageBuilder.js');
        if (fs.existsSync(msgBuilderPath)) {
            let mbSrc = fs.readFileSync(msgBuilderPath, 'utf8');
            let mbChanged = false;
            if (mbSrc.includes('const sharp = require("sharp");')) {
                mbSrc = mbSrc.replace(
                    'const sharp = require("sharp");',
                    'let sharp = null;\ntry { sharp = require("sharp"); } catch (_) {}'
                );
                mbChanged = true;
            }
            if (mbSrc.includes('static async resize(buffer, x, y, fit = "cover") {\n    return await sharp(buffer)')) {
                mbSrc = mbSrc.replace(
                    'static async resize(buffer, x, y, fit = "cover") {\n    return await sharp(buffer)',
                    'static async resize(buffer, x, y, fit = "cover") {\n    if (!sharp) return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);\n    return await sharp(buffer)'
                );
                mbChanged = true;
            }
            if (mbChanged) {
                fs.writeFileSync(msgBuilderPath, mbSrc, 'utf8');
            }
        }

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

        const groupsFile = path.join(baileysRoot, 'Socket', 'groups.js');
        if (fs.existsSync(groupsFile)) {
            let grpSrc = fs.readFileSync(groupsFile, 'utf8');
            if (!grpSrc.includes('patch-group-meta-cache')) {
                const gmRe = /const groupMetadata = async \(jid\) => \{\s*const result = await groupQuery\(jid, 'get', \[\{ tag: 'query', attrs: \{ request: 'interactive' \} \}\]\);\s*return \(0, exports\.extractGroupMetadata\)\(result\);\s*\};/;
                if (gmRe.test(grpSrc)) {
                    grpSrc = grpSrc.replace(
                        gmRe,
                        `// [patch-group-meta-cache]
    const _gmCache = new Map();
    const _gmInflight = new Map();
    const _GM_TTL_MS = 5 * 60 * 1000;
    const _invalidateGm = (jids) => {
        for (const j of (Array.isArray(jids) ? jids : [jids])) {
            if (j) _gmCache.delete(j);
        }
    };
    ev.on('group-participants.update', (u) => _invalidateGm(u?.id));
    ev.on('groups.update', (updates) => {
        if (Array.isArray(updates)) _invalidateGm(updates.map((u) => u?.id));
    });
    const groupMetadata = async (jid, forceRefresh = false) => {
        const now = Date.now();
        const cached = _gmCache.get(jid);
        if (!forceRefresh && cached && (now - cached.ts) < _GM_TTL_MS) {
            return cached.data;
        }
        if (_gmInflight.has(jid)) {
            return _gmInflight.get(jid);
        }
        const p = (async () => {
            try {
                const result = await groupQuery(jid, 'get', [{ tag: 'query', attrs: { request: 'interactive' } }]);
                const meta = (0, exports.extractGroupMetadata)(result);
                _gmCache.set(jid, { data: meta, ts: Date.now() });
                if (_gmCache.size > 500) {
                    const oldestKey = _gmCache.keys().next().value;
                    _gmCache.delete(oldestKey);
                }
                return meta;
            } catch (err) {
                if (cached && cached.data) {
                    return cached.data;
                }
                throw err;
            } finally {
                _gmInflight.delete(jid);
            }
        })();
        _gmInflight.set(jid, p);
        return p;
    };`
                    );
                    fs.writeFileSync(groupsFile, grpSrc, 'utf8');
                }
            }
        }

        const signalUtilFile = path.join(baileysRoot, 'Utils', 'signal.js');
        if (fs.existsSync(signalUtilFile)) {
            let sigSrc = fs.readFileSync(signalUtilFile, 'utf8');
            let sigChanged = false;
            if (!sigSrc.includes('patch-signal-resilient')) {
                const parseSessRe = /const nodes = WABinary_1\.getBinaryNodeChildren\(WABinary_1\.getBinaryNodeChild\(node, 'list'\), 'user'\)[\s\S]*?const chunkSize = 100[\s\S]*?\}\)\)\s*\}/;
                if (parseSessRe.test(sigSrc)) {
                    sigSrc = sigSrc.replace(
                        parseSessRe,
                        `// [patch-signal-resilient]
    const _rawUserNodes = WABinary_1.getBinaryNodeChildren(WABinary_1.getBinaryNodeChild(node, 'list'), 'user');
    const nodes = _rawUserNodes.filter((n) => {
        try {
            WABinary_1.assertNodeErrorFree(n);
            return Boolean(WABinary_1.getBinaryNodeChild(n, 'skey') && WABinary_1.getBinaryNodeChildBuffer(n, 'identity'));
        } catch (_) {
            return false;
        }
    });
    const chunkSize = 100;
    const chunks = lodash_1.chunk(nodes, chunkSize);
    for (const nodesChunk of chunks) {
        await Promise.all(nodesChunk.map(async (node) => {
            try {
                const signedKey = WABinary_1.getBinaryNodeChild(node, 'skey');
                const key = WABinary_1.getBinaryNodeChild(node, 'key');
                const identity = WABinary_1.getBinaryNodeChildBuffer(node, 'identity');
                const jid = node.attrs.jid;
                const registrationId = WABinary_1.getBinaryNodeChildUInt(node, 'registration', 4);
                await repository.injectE2ESession({
                    jid,
                    session: {
                        registrationId: registrationId,
                        identityKey: crypto_1.generateSignalPubKey(identity),
                        signedPreKey: extractKey(signedKey),
                        preKey: extractKey(key)
                    }
                });
            } catch (_) {}
        }));
    }`
                    );
                    sigChanged = true;
                }
            }
            if (!sigSrc.includes('patch-extract-devices-lid')) {
                const extDevRe = /const extractDeviceJids = \(result, myJid, excludeZeroDevices\) => \{[\s\S]*?return extracted\r?\n\}/;
                if (extDevRe.test(sigSrc)) {
                    sigSrc = sigSrc.replace(
                        extDevRe,
                        `// [patch-extract-devices-lid]
const extractDeviceJids = (result, myJid, excludeZeroDevices, myLid) => {
    const { user: myUser, device: myDevice } = WABinary_1.jidDecode(myJid) || {};
    const _myLidDec = myLid ? (WABinary_1.jidDecode(myLid) || {}) : {};
    const myLidUser = _myLidDec.user;
    const myLidDevice = typeof _myLidDec.device === 'number' ? _myLidDec.device : myDevice;
    const extracted = [];
    for (const userResult of (result || [])) {
        const { devices, id } = userResult || {};
        const decodedId = id ? WABinary_1.jidDecode(id) : null;
        if (!decodedId || !decodedId.user) continue;
        const { user, server } = decodedId;
        const deviceList = devices?.deviceList;
        if (Array.isArray(deviceList)) {
            for (const { id: device, keyIndex } of deviceList) {
                const isSelfPn = myUser === user && myDevice === device;
                const isSelfLid = Boolean(myLidUser && myLidUser === user && myLidDevice === device);
                if ((!excludeZeroDevices || device !== 0) &&
                    !isSelfPn && !isSelfLid &&
                    (device === 0 || !!keyIndex)
                ) {
                    extracted.push({ user, device, server });
                }
            }
        }
    }
    return extracted;
}`
                    );
                    sigChanged = true;
                }
            }
            if (sigChanged) {
                fs.writeFileSync(signalUtilFile, sigSrc, 'utf8');
            }
        }

        const libsignalFile = path.join(baileysRoot, 'Signal', 'libsignal.js');
        if (fs.existsSync(libsignalFile)) {
            let lsSrc = fs.readFileSync(libsignalFile, 'utf8');
            let lsChanged = false;
            if (!lsSrc.includes('patch-bad-mac-heal')) {
                const lsRe = /const storage = signalStorage\(auth\);\s*return \{\s*decryptGroupMessage\(\{ group, authorJid, msg \}\) \{[\s\S]*?return result;\s*\},/;
                if (lsRe.test(lsSrc)) {
                    lsSrc = lsSrc.replace(
                        lsRe,
                        `// [patch-bad-mac-heal]
    const storage = signalStorage(auth);
    const _healCooldown = new Map();
    const _shouldHealKey = (k) => {
        const now = Date.now();
        const prev = _healCooldown.get(k) || 0;
        if (now - prev < 30000) return false;
        _healCooldown.set(k, now);
        if (_healCooldown.size > 1000) {
            const oldest = _healCooldown.keys().next().value;
            _healCooldown.delete(oldest);
        }
        return true;
    };
    return {
        async decryptGroupMessage({ group, authorJid, msg }) {
            const senderName = jidToSignalSenderKeyName(group, authorJid);
            const cipher = new Group_1.GroupCipher(storage, senderName);
            try {
                return await cipher.decrypt(msg);
            } catch (err) {
                const errMsg = String(err?.message || err || '');
                const skKey = senderName.toString();
                if (/Bad MAC|Invalid signature|No sender key/i.test(errMsg) && _shouldHealKey('sk:' + skKey)) {
                    try { await auth.keys.set({ 'sender-key': { [skKey]: null } }); } catch (_) {}
                }
                throw err;
            }
        },
        async processSenderKeyDistributionMessage({ item, authorJid }) {
            const builder = new Group_1.GroupSessionBuilder(storage);
            if (!item.groupId) {
                throw new Error('Group ID is required for sender key distribution message');
            }
            const senderName = jidToSignalSenderKeyName(item.groupId, authorJid);
            const senderMsg = new Group_1.SenderKeyDistributionMessage(null, null, null, null, item.axolotlSenderKeyDistributionMessage);
            const senderNameStr = senderName.toString();
            const { [senderNameStr]: senderKey } = await auth.keys.get('sender-key', [senderNameStr]);
            if (!senderKey) {
                await storage.storeSenderKey(senderName, new sender_key_record_1.SenderKeyRecord());
            }
            await builder.process(senderName, senderMsg);
        },
        async decryptMessage({ jid, type, ciphertext }) {
            const addr = jidToSignalProtocolAddress(jid);
            const session = new libsignal.SessionCipher(storage, addr);
            try {
                let result;
                switch (type) {
                    case 'pkmsg':
                        result = await session.decryptPreKeyWhisperMessage(ciphertext);
                        break;
                    case 'msg':
                        result = await session.decryptWhisperMessage(ciphertext);
                        break;
                    default:
                        throw new Error(\`Unknown message type: \${type}\`);
                }
                return result;
            } catch (err) {
                const errMsg = String(err?.message || err || '');
                const addrStr = addr.toString();
                if (/Bad MAC|No matching sessions|Invalid PreKey|Invalid signature/i.test(errMsg) && _shouldHealKey('sess:' + addrStr)) {
                    try { await auth.keys.set({ session: { [addrStr]: null } }); } catch (_) {}
                }
                throw err;
            }
        },`
                    );
                    lsChanged = true;
                }
            }
            if (!lsSrc.includes('patch-signal-retry-helpers')) {
                const jidAddrMethodRe = /jidToSignalProtocolAddress\(jid\)\s*\{\s*return jidToSignalProtocolAddress\(jid\)\.toString\(\);\s*\}/;
                if (jidAddrMethodRe.test(lsSrc)) {
                    lsSrc = lsSrc.replace(
                        jidAddrMethodRe,
                        `// [patch-signal-retry-helpers]
        async hasSenderKey({ group, meId }) {
            const senderName = jidToSignalSenderKeyName(group, meId);
            const senderNameStr = senderName.toString();
            const { [senderNameStr]: senderKey } = await auth.keys.get('sender-key', [senderNameStr]);
            return Boolean(senderKey);
        },
        async getSenderKeyDistributionMessage({ group, meId }) {
            const senderName = jidToSignalSenderKeyName(group, meId);
            const builder = new Group_1.GroupSessionBuilder(storage);
            const senderNameStr = senderName.toString();
            const { [senderNameStr]: senderKey } = await auth.keys.get('sender-key', [senderNameStr]);
            if (!senderKey) {
                await storage.storeSenderKey(senderName, new sender_key_record_1.SenderKeyRecord());
            }
            const skdm = await builder.create(senderName);
            return skdm.serialize();
        },
        async getSessionInfo(jid) {
            try {
                const addr = jidToSignalProtocolAddress(jid);
                const record = await storage.loadSession(addr.toString());
                if (!record || typeof record.getOpenSession !== 'function') return null;
                const open = record.getOpenSession();
                if (!open) return null;
                return {
                    registrationId: open.registrationId || 0,
                    baseKey: open.indexInfo?.baseKey || null
                };
            } catch (_) {
                return null;
            }
        },
        jidToSignalProtocolAddress(jid) {
            return jidToSignalProtocolAddress(jid).toString();
        }`
                    );
                    lsChanged = true;
                }
            }
            if (lsChanged) {
                fs.writeFileSync(libsignalFile, lsSrc, 'utf8');
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
            if (!src.includes('patch-usync-chunked')) {
                const usyncExecRe = /const query = new WAUSync_1\.USyncQuery\(\)[\s\S]*?return deviceResults/;
                if (usyncExecRe.test(src)) {
                    src = src.replace(
                        usyncExecRe,
                        `// [patch-usync-chunked]
        const _usyncChunkSize = 100;
        for (let _ui = 0; _ui < toFetch.length; _ui += _usyncChunkSize) {
            const _chunk = toFetch.slice(_ui, _ui + _usyncChunkSize);
            try {
                const query = new WAUSync_1.USyncQuery()
                    .withContext('message')
                    .withDeviceProtocol();
                for (const jid of _chunk) {
                    query.withUser(new WAUSync_1.USyncUser().withId(jid));
                }
                const result = await executeUSyncQuery(query);
                if (result) {
                    const extracted = Utils_1.extractDeviceJids(result?.list, authState.creds.me.id, ignoreZeroDevices, authState.creds.me?.lid);
                    const deviceMap = {};
                    for (const item of extracted) {
                        if (item.device === 99) continue;
                        deviceMap[item.user] = deviceMap[item.user] || [];
                        deviceMap[item.user].push(item);
                        deviceResults.push(item);
                    }
                    for (const key in deviceMap) {
                        if (deviceMap[key] && deviceMap[key].length > 0) {
                            userDevicesCache.set(key, deviceMap[key]);
                        }
                    }
                }
            } catch (usyncErr) {
                logger.warn({ err: usyncErr?.message, count: _chunk.length }, 'usync chunk failed');
            }
        }
        return deviceResults`
                    );
                    sendChanged = true;
                }
            }
            if (!src.includes('patch-assert-sessions-chunked')) {
                const assertFetchRe = /if \(jidsRequiringFetch\.length\) \{\s*logger\.debug\(\{ jidsRequiringFetch \}, 'fetching sessions'\);\s*const result = await query\(\{[\s\S]*?didFetchNewSession = true;\s*\}/;
                if (assertFetchRe.test(src)) {
                    src = src.replace(
                        assertFetchRe,
                        `// [patch-assert-sessions-chunked]
        if (jidsRequiringFetch.length) {
            const _uniqueJids = Array.from(new Set(jidsRequiringFetch));
            logger.debug({ count: _uniqueJids.length }, 'fetching sessions');
            const _sessChunkSize = 50;
            for (let _si = 0; _si < _uniqueJids.length; _si += _sessChunkSize) {
                const _batch = _uniqueJids.slice(_si, _si + _sessChunkSize);
                try {
                    const result = await query({
                        tag: 'iq',
                        attrs: {
                            xmlns: 'encrypt',
                            type: 'get',
                            to: WABinary_1.S_WHATSAPP_NET,
                        },
                        content: [
                            {
                                tag: 'key',
                                attrs: {},
                                content: _batch.map(jid => ({
                                    tag: 'user',
                                    attrs: { jid },
                                }))
                            }
                        ]
                    });
                    await (0, Utils_1.parseAndInjectE2ESessions)(result, signalRepository);
                    didFetchNewSession = true;
                } catch (sessErr) {
                    logger.warn({ err: sessErr?.message, batchSize: _batch.length }, 'assertSessions batch failed');
                }
            }
        }`
                    );
                    sendChanged = true;
                }
            }
            if (!src.includes('patch-participant-resilient')) {
                const partNodesRe = /const nodes = await Promise\.all\(jids\.map\(async \(jid\) => \{\s*const \{ type, ciphertext \} = await signalRepository\s*\.encryptMessage\(\{ jid, data: bytes \}\);\s*if \(type === 'pkmsg'\) \{\s*shouldIncludeDeviceIdentity = true;\s*\}\s*const node = \{\s*tag: 'to',\s*attrs: \{ jid \},\s*content: \[\{\s*tag: 'enc',\s*attrs: \{\s*v: '2',\s*type,\s*\.\.\.extraAttrs \|\| \{\}\s*\},\s*content: ciphertext\s*\}\]\s*\};\s*return node;\s*\}\)\);\s*return \{ nodes, shouldIncludeDeviceIdentity \};/;
                if (partNodesRe.test(src)) {
                    src = src.replace(
                        partNodesRe,
                        `// [patch-participant-resilient]
        let _lastEncErr = null;
        const _rawNodes = await Promise.all(jids.map(async (jid) => {
            try {
                const { type, ciphertext } = await signalRepository
                    .encryptMessage({ jid, data: bytes });
                if (type === 'pkmsg') {
                    shouldIncludeDeviceIdentity = true;
                }
                return {
                    tag: 'to',
                    attrs: { jid },
                    content: [{
                            tag: 'enc',
                            attrs: {
                                v: '2',
                                type,
                                ...extraAttrs || {}
                            },
                            content: ciphertext
                        }]
                };
            } catch (encErr) {
                _lastEncErr = encErr;
                logger.warn({ jid, err: encErr?.message }, 'skip failed participant encryption');
                return null;
            }
        }));
        const nodes = _rawNodes.filter(Boolean);
        if (jids.length > 0 && nodes.length === 0 && _lastEncErr) {
            throw _lastEncErr;
        }
        return { nodes, shouldIncludeDeviceIdentity };`
                    );
                    sendChanged = true;
                }
            }
            if (!src.includes('patch-relay-e2ee-v2')) {
                const relayCoreRe = /const meId = authState\.creds\.me\.id;[\s\S]*?await sendNode\(stanza\);\s*\}\);/;
                if (relayCoreRe.test(src)) {
                    src = src.replace(
                        relayCoreRe,
                        `// [patch-relay-e2ee-v2]
        const meId = authState.creds.me.id;
        const meLid = authState.creds.me?.lid;
        const isRetryResend = Boolean(participant && participant.jid);
        let shouldIncludeDeviceIdentity = isRetryResend;
        let didPushAdditional = false;
        const { user, server } = WABinary_1.jidDecode(jid);
        const statusJid = 'status@broadcast';
        const isGroup = server === 'g.us';
        const isStatus = jid === statusJid;
        const isLid = server === 'lid';
        const isPrivate = server === 's.whatsapp.net';
        const isNewsletter = server === 'newsletter';
        msgId = msgId || (0, Utils_1.generateMessageID)();
        useUserDevicesCache = useUserDevicesCache !== false;
        useCachedGroupMetadata = useCachedGroupMetadata !== false && !isStatus;
        const participants = [];
        const destinationJid = (!isStatus) ? WABinary_1.jidEncode(user, isLid ? 'lid' : isGroup ? 'g.us' : isNewsletter ? 'newsletter' : 's.whatsapp.net') : statusJid;
        const binaryNodeContent = [];
        const devices = [];
        const meMsg = {
            deviceSentMessage: {
                destinationJid,
                message
            }
        };
        const extraAttrs = {};
        const messages = Utils_1.normalizeMessageContent(message);
        const buttonType = getButtonType(messages);
        if (participant) {
            if (!isGroup && !isStatus) {
                additionalAttributes = { ...additionalAttributes, 'device_fanout': 'false' };
            }
            const { user: pUser, device: pDevice, server: pServer } = WABinary_1.jidDecode(participant.jid);
            devices.push({ user: pUser, device: pDevice, server: pServer });
        }
        await authState.keys.transaction(async () => {
            // [patch-chat-theme] code founded by - @DanuZz
            const isChatTheme = (messages?.protocolMessage?.type === 34 || message?.protocolMessage?.type === 34);
            const mediaType = isChatTheme ? 'chat_theme' : getMediaType(messages);
            if (mediaType) {
                extraAttrs['mediatype'] = mediaType;
            }
            if (messages.pinInChatMessage || messages.keepInChatMessage || message.reactionMessage || message.protocolMessage?.editedMessage) {
                extraAttrs['decrypt-fail'] = 'hide';
            }
            if (messages.interactiveResponseMessage?.nativeFlowResponseMessage) {
                extraAttrs['native_flow_name'] = messages.interactiveResponseMessage?.nativeFlowResponseMessage.name;
            }
            if ((isGroup || isStatus) && !isRetryResend) {
                const [groupData, senderKeyMap] = await Promise.all([
                    (async () => {
                        let groupData = useCachedGroupMetadata && cachedGroupMetadata ? await cachedGroupMetadata(jid) : undefined;
                        if (groupData) {
                            logger.trace({ jid, participants: groupData.participants.length }, 'using cached group metadata');
                        }
                        else if (!isStatus) {
                            groupData = await groupMetadata(jid);
                        }
                        return groupData;
                    })(),
                    (async () => {
                        if (!participant && !isStatus) {
                            const result = await authState.keys.get('sender-key-memory', [jid]);
                            return result[jid] || {};
                        }
                        return {};
                    })()
                ]);
                const participantsList = (groupData && !isStatus) ? groupData.participants.map(p => p.id) : [];
                if (isStatus && statusJidList) {
                    participantsList.push(...statusJidList);
                }
                const additionalDevices = await getUSyncDevices(participantsList, !!useUserDevicesCache, false);
                devices.push(...additionalDevices);
                const groupAddressingMode = (groupData && groupData.addressingMode) || 'pn';
                if (isGroup && groupData && groupData.addressingMode) {
                    additionalAttributes = { ...additionalAttributes, addressing_mode: groupData.addressingMode };
                }
                const groupSenderIdentity = (groupAddressingMode === 'lid' && meLid) ? meLid : meId;
                let _hasOwnSenderKey = true;
                if (!isStatus && typeof signalRepository.hasSenderKey === 'function') {
                    try {
                        _hasOwnSenderKey = await signalRepository.hasSenderKey({ group: destinationJid, meId: groupSenderIdentity });
                    } catch (_) {
                        _hasOwnSenderKey = true;
                    }
                }
                const effectiveSenderKeyMap = _hasOwnSenderKey ? { ...senderKeyMap } : {};
                const patched = await patchMessageBeforeSending(message, devices.map(d => WABinary_1.jidEncode(d.user, d.server || (groupAddressingMode === 'lid' ? 'lid' : 's.whatsapp.net'), d.device)));
                const bytes = Utils_1.encodeWAMessage(patched);
                const { ciphertext, senderKeyDistributionMessage } = await signalRepository.encryptGroupMessage({
                    group: destinationJid,
                    data: bytes,
                    meId: groupSenderIdentity,
                });
                const senderKeyJids = [];
                const seenSkJids = new Set();
                for (const { user: dUser, device: dDevice, server: devServer } of devices) {
                    if (dDevice === 99) continue;
                    const devJid = WABinary_1.jidEncode(dUser, devServer || (groupAddressingMode === 'lid' ? 'lid' : 's.whatsapp.net'), dDevice);
                    if (seenSkJids.has(devJid)) continue;
                    seenSkJids.add(devJid);
                    if (!effectiveSenderKeyMap[devJid]) {
                        senderKeyJids.push(devJid);
                        effectiveSenderKeyMap[devJid] = true;
                    }
                }
                if (senderKeyJids.length) {
                    logger.debug({ senderKeyJids }, 'sending new sender key');
                    const senderKeyMsg = {
                        senderKeyDistributionMessage: {
                            axolotlSenderKeyDistributionMessage: senderKeyDistributionMessage,
                            groupId: destinationJid
                        }
                    };
                    await assertSessions(senderKeyJids, false);
                    const result = await createParticipantNodes(senderKeyJids, senderKeyMsg, extraAttrs);
                    shouldIncludeDeviceIdentity = shouldIncludeDeviceIdentity || result.shouldIncludeDeviceIdentity;
                    participants.push(...result.nodes);
                }
                binaryNodeContent.push({
                    tag: 'enc',
                    attrs: { v: '2', type: 'skmsg', ...extraAttrs },
                    content: ciphertext
                });
                if (!isStatus) {
                    await authState.keys.set({ 'sender-key-memory': { [jid]: effectiveSenderKeyMap } });
                }
            }
            else if (isNewsletter) {
                if (message.protocolMessage?.editedMessage) {
                    msgId = message.protocolMessage.key?.id;
                    message = message.protocolMessage.editedMessage;
                }
                if (message.protocolMessage?.type === WAProto_1.proto.Message.ProtocolMessage.Type.REVOKE) {
                    msgId = message.protocolMessage.key?.id;
                    message = {};
                }
                const patched = await patchMessageBeforeSending(message, []);
                const bytes = Utils_1.encodeNewsletterMessage(patched);
                binaryNodeContent.push({
                    tag: 'plaintext',
                    attrs: extraAttrs ? extraAttrs : {},
                    content: bytes
                });
            }
            else if (!isRetryResend) {
                const { user: mePnUser, device: mePnDevice } = WABinary_1.jidDecode(meId) || {};
                const { user: meLidUser, device: meLidDevice } = meLid ? (WABinary_1.jidDecode(meLid) || {}) : {};
                const ownId = (isLid && meLid) ? meLid : meId;
                const ownUser = WABinary_1.jidDecode(ownId)?.user || mePnUser;
                const ownServer = isLid ? 'lid' : 's.whatsapp.net';
                if (additionalAttributes?.['category'] === 'peer') {
                    devices.push({ user, server: ownServer });
                    if (user !== ownUser) {
                        devices.push({ user: ownUser, server: ownServer });
                    }
                }
                else {
                    const senderIdentity = WABinary_1.jidEncode(ownUser, ownServer);
                    const additionalDevices = await getUSyncDevices([senderIdentity, jid], !!useUserDevicesCache, false);
                    devices.push(...additionalDevices);
                    const hasTargetDev = devices.some(d => d.user === user);
                    if (!hasTargetDev) {
                        devices.push({ user, device: 0, server: ownServer });
                    }
                }
                const allJids = [];
                const meJids = [];
                const otherJids = [];
                const seenDmJids = new Set();
                for (const { user: dUser, device: dDevice, server: devServer } of devices) {
                    if (dDevice === 99) continue;
                    const isMe = dUser === mePnUser || (Boolean(meLidUser) && dUser === meLidUser);
                    const isExactSelf = (dUser === mePnUser && (dDevice || 0) === (mePnDevice || 0))
                        || (Boolean(meLidUser) && dUser === meLidUser && (dDevice || 0) === (typeof meLidDevice === 'number' ? meLidDevice : (mePnDevice || 0)));
                    if (isExactSelf) continue;
                    const resolvedServer = devServer || ownServer;
                    const devJid = WABinary_1.jidEncode(dUser, resolvedServer, dDevice);
                    if (seenDmJids.has(devJid)) continue;
                    seenDmJids.add(devJid);
                    if (isMe) {
                        meJids.push(devJid);
                    }
                    else {
                        otherJids.push(devJid);
                    }
                    allJids.push(devJid);
                }
                await assertSessions(allJids, false);
                const [{ nodes: meNodes, shouldIncludeDeviceIdentity: s1 }, { nodes: otherNodes, shouldIncludeDeviceIdentity: s2 }] = await Promise.all([
                    createParticipantNodes(meJids, meMsg, extraAttrs),
                    createParticipantNodes(otherJids, message, extraAttrs)
                ]);
                participants.push(...meNodes);
                participants.push(...otherNodes);
                shouldIncludeDeviceIdentity = shouldIncludeDeviceIdentity || s1 || s2;
            }
            if (isRetryResend) {
                const targetPartJid = participant.jid;
                const isPartLid = WABinary_1.isLidUser(targetPartJid);
                const isMePart = WABinary_1.areJidsSameUser(targetPartJid, isPartLid ? (meLid || meId) : meId)
                    || WABinary_1.areJidsSameUser(targetPartJid, meId)
                    || (meLid ? WABinary_1.areJidsSameUser(targetPartJid, meLid) : false);
                let messageToSend = message;
                if (isGroup || isStatus) {
                    let groupSenderIdentity = undefined;
                    if (typeof signalRepository.hasSenderKey === 'function') {
                        if (meLid && await signalRepository.hasSenderKey({ group: destinationJid, meId: meLid })) {
                            groupSenderIdentity = meLid;
                        } else if (await signalRepository.hasSenderKey({ group: destinationJid, meId })) {
                            groupSenderIdentity = meId;
                        } else {
                            groupSenderIdentity = (isPartLid && meLid) ? meLid : meId;
                        }
                    } else {
                        groupSenderIdentity = (isPartLid && meLid) ? meLid : meId;
                    }
                    if (groupSenderIdentity && typeof signalRepository.getSenderKeyDistributionMessage === 'function') {
                        try {
                            const skdm = await signalRepository.getSenderKeyDistributionMessage({
                                group: destinationJid,
                                meId: groupSenderIdentity
                            });
                            messageToSend = {
                                ...message,
                                senderKeyDistributionMessage: {
                                    groupId: destinationJid,
                                    axolotlSenderKeyDistributionMessage: skdm
                                }
                            };
                        } catch (skdmErr) {
                            logger.warn({ err: skdmErr?.message, jid: destinationJid }, 'failed to attach SKDM on retry');
                        }
                    }
                    if (isGroup && isPartLid && !additionalAttributes?.addressing_mode) {
                        additionalAttributes = { ...additionalAttributes, addressing_mode: 'lid' };
                    }
                }
                const encodedRetryMsg = isMePart
                    ? Utils_1.encodeWAMessage({
                        deviceSentMessage: {
                            destinationJid,
                            message: messageToSend
                        }
                    })
                    : Utils_1.encodeWAMessage(messageToSend);
                await assertSessions([targetPartJid], false);
                const { type: retryEncType, ciphertext: retryCiphertext } = await signalRepository.encryptMessage({
                    data: encodedRetryMsg,
                    jid: targetPartJid
                });
                binaryNodeContent.push({
                    tag: 'enc',
                    attrs: {
                        v: '2',
                        type: retryEncType,
                        ...extraAttrs,
                        count: String(participant.count || 1)
                    },
                    content: retryCiphertext
                });
            }
            if (participants.length) {
                if (additionalAttributes?.['category'] === 'peer') {
                    const peerNode = participants[0]?.content?.[0];
                    if (peerNode) {
                        binaryNodeContent.push(peerNode);
                    }
                }
                else {
                    binaryNodeContent.push({
                        tag: 'participants',
                        attrs: {},
                        content: participants
                    });
                }
            }
            const stanza = {
                tag: 'message',
                attrs: {
                    id: msgId,
                    type: getTypeMessage(messages),
                    ...(additionalAttributes || {})
                },
                content: binaryNodeContent
            };
            if (participant) {
                if (WABinary_1.isJidGroup(destinationJid)) {
                    stanza.attrs.to = destinationJid;
                    stanza.attrs.participant = participant.jid;
                }
                else if (WABinary_1.areJidsSameUser(participant.jid, meId) || (meLid && WABinary_1.areJidsSameUser(participant.jid, meLid))) {
                    stanza.attrs.to = participant.jid;
                    stanza.attrs.recipient = destinationJid;
                }
                else {
                    stanza.attrs.to = participant.jid;
                }
            }
            else {
                stanza.attrs.to = destinationJid;
            }
            if (shouldIncludeDeviceIdentity) {
                stanza.content.push({
                    tag: 'device-identity',
                    attrs: {},
                    content: (0, Utils_1.encodeSignedDeviceIdentity)(authState.creds.account, true)
                });
                logger.debug({ jid }, 'adding device identity');
            }
            if (AI && isPrivate && !isRetryResend) {
                const botNode = {
                    tag: 'bot',
                    attrs: {
                        biz_bot: '1'
                    }
                };
                const filteredBizBot = WABinary_1.getBinaryNodeFilter(additionalNodes ? additionalNodes : []);
                if (filteredBizBot) {
                    stanza.content.push(...additionalNodes);
                    didPushAdditional = true;
                }
                else {
                    stanza.content.push(botNode);
                }
            }
            if (!isNewsletter && buttonType && !isStatus && !isRetryResend) {
                const content = WABinary_1.getAdditionalNode(buttonType);
                const filteredNode = WABinary_1.getBinaryNodeFilter(additionalNodes);
                if (filteredNode) {
                    didPushAdditional = true;
                    stanza.content.push(...additionalNodes);
                }
                else {
                    stanza.content.push(...content);
                }
                logger.debug({ jid }, 'adding business node');
            }
            if (!didPushAdditional && additionalNodes && additionalNodes.length > 0 && !isRetryResend) {
                stanza.content.push(...additionalNodes);
            }
            if (!isRetryResend && !isNewsletter && msgId && message) {
                global._baileysSentCache = global._baileysSentCache || new Map();
                global._baileysSentCache.set(msgId, { msg: message, jid: destinationJid, ts: Date.now() });
                if (global._baileysSentCache.size > 3500) {
                    const _oldestSentKey = global._baileysSentCache.keys().next().value;
                    global._baileysSentCache.delete(_oldestSentKey);
                }
            }
            logger.debug({ msgId, isRetryResend }, \`sending message to \${participants.length || 1} devices\`);
            await sendNode(stanza);
        });`
                    );
                    sendChanged = true;
                }
            }
            if (sendChanged) {
                fs.writeFileSync(sendFile, src, 'utf8');
            }
        }

        const recvFile = path.join(baileysRoot, 'Socket', 'messages-recv.js');
        if (fs.existsSync(recvFile)) {
            let recvSrc = fs.readFileSync(recvFile, 'utf8');
            let recvChanged = false;

            if (!recvSrc.includes('patch-nonblock-placeholder')) {
                const phRe = /if \(retryCount === 1\) \{\s*\/\/request a resend via phone\s*const msgId = await requestPlaceholderResend\(msgKey\);\s*logger\.debug\(`sendRetryRequest: requested placeholder resend for message \$\{msgId\}`\);\s*\}/;
                if (phRe.test(recvSrc)) {
                    recvSrc = recvSrc.replace(
                        phRe,
                        `// [patch-nonblock-placeholder]
        if (retryCount === 1) {
            requestPlaceholderResend(msgKey).catch(() => {});
        }`
                    );
                    recvChanged = true;
                }
            }

            if (!recvSrc.includes('patch-identity-reset')) {
                const idChgRe = /const identityNode = \(0, WABinary_1\.getBinaryNodeChild\)\(node, 'identity'\);\s*if \(identityNode\) \{\s*logger\.info\(\{ jid: from \}, 'identity changed'\);[\s\S]*?\}/;
                if (idChgRe.test(recvSrc)) {
                    recvSrc = recvSrc.replace(
                        idChgRe,
                        `// [patch-identity-reset]
            const identityNode = (0, WABinary_1.getBinaryNodeChild)(node, 'identity');
            if (identityNode) {
                logger.info({ jid: from }, 'identity changed');
                try {
                    const _idAddr = signalRepository.jidToSignalProtocolAddress(from);
                    await authState.keys.set({ session: { [_idAddr]: null } });
                } catch (_) {}
            }`
                    );
                    recvChanged = true;
                }
            }

            if (!recvSrc.includes('patch-retry-e2ee-v2')) {
                const retryBlockRe = /const sendMessagesAgain = async \(key, ids, retryNode\) => \{[\s\S]*?const handleNotification = async \(node\) => \{/;
                if (retryBlockRe.test(recvSrc)) {
                    recvSrc = recvSrc.replace(
                        retryBlockRe,
                        `// [patch-retry-e2ee-v2]
    const sendMessagesAgain = async (key, ids, retryNode, receiptNode) => {
        const remoteJid = key.remoteJid;
        const participant = key.participant || remoteJid;
        const retryCount = +(retryNode === null || retryNode === void 0 ? void 0 : retryNode.attrs?.count) || 1;
        const msgs = await Promise.all(ids.map(async (id) => {
            let msg = await getMessage({ ...key, id });
            if (!msg && global._baileysSentCache) {
                const _hit = global._baileysSentCache.get(id);
                if (_hit && _hit.msg) msg = _hit.msg;
            }
            if (msg && msg.message && typeof msg.message === 'object' && msg.key) {
                msg = msg.message;
            }
            return msg;
        }));
        const sessionId = signalRepository.jidToSignalProtocolAddress(participant);
        let injectedFromBundle = false;
        if (receiptNode) {
            try {
                const keysNode = (0, WABinary_1.getBinaryNodeChild)(receiptNode, 'keys');
                if (keysNode) {
                    const signedKey = (0, WABinary_1.getBinaryNodeChild)(keysNode, 'skey');
                    const preKey = (0, WABinary_1.getBinaryNodeChild)(keysNode, 'key');
                    const identity = (0, WABinary_1.getBinaryNodeChildBuffer)(keysNode, 'identity');
                    const regId = (0, WABinary_1.getBinaryNodeChildUInt)(receiptNode, 'registration', 4);
                    const _toSigPub = (buf) => {
                        if (!buf) return buf;
                        if (typeof Utils_1.generateSignalPubKey === 'function') return (0, Utils_1.generateSignalPubKey)(buf);
                        return buf.length === 32 ? Buffer.concat([Buffer.from([5]), buf]) : buf;
                    };
                    const _extKey = (k) => k ? {
                        keyId: (0, WABinary_1.getBinaryNodeChildUInt)(k, 'id', 3),
                        publicKey: _toSigPub((0, WABinary_1.getBinaryNodeChildBuffer)(k, 'value')),
                        signature: (0, WABinary_1.getBinaryNodeChildBuffer)(k, 'signature')
                    } : undefined;
                    if (signedKey && identity && typeof regId === 'number') {
                        await authState.keys.set({ session: { [sessionId]: null } });
                        await signalRepository.injectE2ESession({
                            jid: participant,
                            session: {
                                registrationId: regId,
                                identityKey: _toSigPub(identity),
                                signedPreKey: _extKey(signedKey),
                                preKey: _extKey(preKey)
                            }
                        });
                        injectedFromBundle = true;
                        logger.debug({ participant, retryCount }, 'injected session from retry receipt key bundle');
                    }
                }
            } catch (bundleErr) {
                logger.warn({ err: bundleErr?.message, participant }, 'failed to inject session from retry receipt');
            }
        }
        if (!injectedFromBundle) {
            let needsSessionReset = retryCount >= 2;
            if (!needsSessionReset && receiptNode && typeof signalRepository.getSessionInfo === 'function') {
                try {
                    const receivedRegId = (0, WABinary_1.getBinaryNodeChildUInt)(receiptNode, 'registration', 4);
                    if (typeof receivedRegId === 'number' && Number.isInteger(receivedRegId)) {
                        const info = await signalRepository.getSessionInfo(participant);
                        if (info && info.registrationId && info.registrationId !== receivedRegId) {
                            needsSessionReset = true;
                        }
                    }
                } catch (_) {}
            }
            if (needsSessionReset) {
                try { await authState.keys.set({ session: { [sessionId]: null } }); } catch (_) {}
            }
            await assertSessions([participant], true);
        }
        logger.debug({ participant, retryCount, injectedFromBundle }, 'prepared session for targeted retry resend');
        for (const [i, msg] of msgs.entries()) {
            if (msg) {
                updateSendMessageAgainCount(ids[i], participant);
                const msgRelayOpts = {
                    messageId: ids[i],
                    useUserDevicesCache: false,
                    participant: {
                        jid: participant,
                        count: retryCount
                    }
                };
                await relayMessage(key.remoteJid, msg, msgRelayOpts);
            }
            else {
                logger.debug({ jid: key.remoteJid, id: ids[i] }, 'recv retry request, but message not available');
            }
        }
    };
    const handleReceipt = async (node) => {
        var _a, _b;
        const { attrs, content } = node;
        const _recActor = attrs.participant || attrs.from || '';
        const isLid = _recActor.includes('lid');
        const _mePn = (_b = authState.creds.me) === null || _b === void 0 ? void 0 : _b.id;
        const _meLid = (_a = authState.creds.me) === null || _a === void 0 ? void 0 : _a.lid;
        const isNodeFromMe = (0, WABinary_1.areJidsSameUser)(_recActor, isLid ? (_meLid || _mePn) : _mePn)
            || (_meLid ? (0, WABinary_1.areJidsSameUser)(_recActor, _meLid) : false)
            || (_mePn ? (0, WABinary_1.areJidsSameUser)(_recActor, _mePn) : false);
        const remoteJid = !isNodeFromMe || (0, WABinary_1.isJidGroup)(attrs.from) ? attrs.from : attrs.recipient;
        const fromMe = !attrs.recipient || ((attrs.type === 'retry' || attrs.type === 'sender') && isNodeFromMe);
        const key = {
            remoteJid,
            id: '',
            fromMe,
            participant: attrs.participant
        };
        if (shouldIgnoreJid(remoteJid) && remoteJid !== '@s.whatsapp.net') {
            logger.debug({ remoteJid }, 'ignoring receipt from jid');
            await sendMessageAck(node);
            return;
        }
        const ids = [attrs.id];
        if (Array.isArray(content)) {
            const items = (0, WABinary_1.getBinaryNodeChildren)(content[0], 'item');
            ids.push(...items.map(i => i.attrs.id));
        }
        try {
            await Promise.all([
                processingMutex.mutex(async () => {
                    const status = (0, Utils_1.getStatusFromReceiptType)(attrs.type);
                    if (typeof status !== 'undefined' &&
                        (status >= WAProto_1.proto.WebMessageInfo.Status.SERVER_ACK ||
                            !isNodeFromMe)) {
                        if ((0, WABinary_1.isJidGroup)(remoteJid) || (0, WABinary_1.isJidStatusBroadcast)(remoteJid)) {
                            if (attrs.participant) {
                                const updateKey = status === WAProto_1.proto.WebMessageInfo.Status.DELIVERY_ACK ? 'receiptTimestamp' : 'readTimestamp';
                                ev.emit('message-receipt.update', ids.map(id => ({
                                    key: { ...key, id },
                                    receipt: {
                                        userJid: (0, WABinary_1.jidNormalizedUser)(attrs.participant),
                                        [updateKey]: +attrs.t
                                    }
                                })));
                            }
                        }
                        else {
                            ev.emit('messages.update', ids.map(id => ({
                                key: { ...key, id },
                                update: { status }
                            })));
                        }
                    }
                    if (attrs.type === 'retry') {
                        key.participant = key.participant || attrs.from;
                        const retryNode = (0, WABinary_1.getBinaryNodeChild)(node, 'retry');
                        if (willSendMessageAgain(ids[0], key.participant)) {
                            let canResend = Boolean(key.fromMe);
                            if (!canResend && ids[0]) {
                                const _hasCached = Boolean(global._baileysSentCache && global._baileysSentCache.has(ids[0]));
                                if (_hasCached) {
                                    canResend = true;
                                } else {
                                    try {
                                        const _probe = await getMessage({ ...key, id: ids[0] });
                                        if (_probe) canResend = true;
                                    } catch (_) {}
                                }
                            }
                            if (canResend) {
                                try {
                                    logger.debug({ attrs, key }, 'recv retry request');
                                    await sendMessagesAgain(key, ids, retryNode, node);
                                }
                                catch (error) {
                                    logger.error({ key, ids, trace: error.stack }, 'error in sending message again');
                                }
                            }
                            else {
                                logger.info({ attrs, key }, 'recv retry for not fromMe message');
                            }
                        }
                        else {
                            logger.info({ attrs, key }, 'will not send message again, as sent too many times');
                        }
                    }
                })
            ]);
        }
        finally {
            await sendMessageAck(node);
        }
    };
    const handleNotification = async (node) => {`
                    );
                    recvChanged = true;
                }
            }

            if (!recvSrc.includes('patch-badmac-retry-keys')) {
                const retryReqRe = /await sendRetryRequest\(node, !encNode\);/;
                if (retryReqRe.test(recvSrc)) {
                    recvSrc = recvSrc.replace(
                        retryReqRe,
                        `// [patch-badmac-retry-keys]
                                const _stubErr = String(((_a = msg === null || msg === void 0 ? void 0 : msg.messageStubParameters) === null || _a === void 0 ? void 0 : _a[0]) || '');
                                const _needsKeyReset = /Bad MAC|No matching sessions|Invalid PreKey|Invalid signature|No sender key/i.test(_stubErr);
                                await sendRetryRequest(node, !encNode || _needsKeyReset);`
                    );
                    recvChanged = true;
                }
            }

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

            if (!recvSrc.includes('patch-lid-receipt-fix')) {
                const origTypeAnchor = `// no type in the receipt => message delivered\n                        let type = undefined;`;
                const origTypeAnchorCRLF = origTypeAnchor.replace(/\n/g, '\r\n');
                const withOrigVars = `// no type in the receipt => message delivered\n                        // [patch-lid-receipt-fix]\n                        let type = undefined;\n                        const _origRemoteJid = msg.key.remoteJid;\n                        const _origParticipant = msg.key.participant;`;
                if (recvSrc.includes(origTypeAnchor)) {
                    recvSrc = recvSrc.replace(origTypeAnchor, withOrigVars);
                    recvChanged = true;
                } else if (recvSrc.includes(origTypeAnchorCRLF)) {
                    recvSrc = recvSrc.replace(origTypeAnchorCRLF, withOrigVars);
                    recvChanged = true;
                }

                const quotedMetaRe = /if \(msg\.message\.extendedTextMessage\.contextInfo\) \{\s*const metadata = await groupMetadata\(msg\.key\.remoteJid\);\s*const sender = msg\.message\.extendedTextMessage\.contextInfo\.participant;\s*const found = metadata\.participants\.find\(p => p\.id === sender\);\s*msg\.message\.extendedTextMessage\.contextInfo\.participant = \(found === null \|\| found === void 0 \? void 0 : found\.jid\) \|\| sender;\s*\}/;
                if (quotedMetaRe.test(recvSrc)) {
                    recvSrc = recvSrc.replace(
                        quotedMetaRe,
                        `if (msg.message.extendedTextMessage.contextInfo) {\n                                try {\n                                    const metadata = await groupMetadata(msg.key.remoteJid);\n                                    const sender = msg.message.extendedTextMessage.contextInfo.participant;\n                                    const found = metadata && Array.isArray(metadata.participants) ? metadata.participants.find(p => p.id === sender) : null;\n                                    msg.message.extendedTextMessage.contextInfo.participant = (found === null || found === void 0 ? void 0 : found.jid) || sender;\n                                } catch (_) {}\n                            }`
                    );
                    recvChanged = true;
                }

                const sendRecBlockRe = /let participant = msg\.key\.participant;\s*if \(category === 'peer'\) \{[^\}]*\}\s*else if \(msg\.key\.fromMe\) \{[\s\S]*?type = 'sender';[\s\S]*?if \(\(0, WABinary_1\.isJidUser\)\(msg\.key\.remoteJid\)\) \{\s*participant = author;\s*\}\s*\}\s*else if \(!sendActiveReceipts\) \{\s*type = 'inactive';\s*\}\s*await sendReceipt\(msg\.key\.remoteJid, participant, \[msg\.key\.id\], type\);/;
                if (sendRecBlockRe.test(recvSrc)) {
                    recvSrc = recvSrc.replace(
                        sendRecBlockRe,
                        `let participant = _origParticipant;
                        if (category === 'peer') {
                            type = 'peer_msg';
                        }
                        else if (msg.key.fromMe) {
                            type = 'sender';
                            if ((0, WABinary_1.isJidUser)(_origRemoteJid) || (0, WABinary_1.isLidUser)(_origRemoteJid)) {
                                participant = author;
                            }
                        }
                        else if (!sendActiveReceipts) {
                            type = 'inactive';
                        }
                        try {
                            await sendReceipt(_origRemoteJid, participant, [msg.key.id], type);
                        } catch (recErr) {
                            logger.warn({ key: msg.key, err: recErr?.message }, 'sendReceipt skipped');
                        }`
                    );
                    recvChanged = true;
                }
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

const _autoHealHistory = new Map();
function tryAutoInstallMissingModule(err) {
    try {
        if (!err || err.code !== 'MODULE_NOT_FOUND') return false;
        const msg = String(err.message || '');
        const match = msg.match(/Cannot find module ['"]([^'"]+)['"]/i);
        if (!match) return false;
        const rawMod = match[1];
        // Abaikan path relatif (./foo, ../bar, /abs/path)
        if (rawMod.startsWith('.') || rawMod.startsWith('/')) return false;
        // Ambil nama package utama (termasuk scoped @org/pkg)
        const pkgName = rawMod.startsWith('@')
            ? rawMod.split('/').slice(0, 2).join('/')
            : rawMod.split('/')[0];
        if (!pkgName || OPTIONAL_NATIVE_MODULES.has(pkgName)) {
            console.warn(`[Auto-Heal] Modul opsional '${pkgName}' tidak tersedia di perangkat ini (dilewati otomatis).`);
            return false;
        }
        const now = Date.now();
        const prev = _autoHealHistory.get(pkgName) || { count: 0, ts: 0 };
        if (now - prev.ts < 120000 && prev.count >= 2) {
            console.error(`[Auto-Heal] Batas percobaan install '${pkgName}' tercapai, lewati agar tidak loop.`);
            return false;
        }
        _autoHealHistory.set(pkgName, { count: (now - prev.ts < 120000 ? prev.count : 0) + 1, ts: now });
        console.log(`[Auto-Heal] Modul '${pkgName}' belum terpasang — menginstal otomatis...`);
        const target = pkgName === '@whiskeysockets/baileys'
            ? 'https://github.com/dinzid04/hutao-baileys.git'
            : pkgName;
        const ok = runNpmInstallWithRetry(target, 2);
        if (ok) {
            console.log(`[Auto-Heal] Modul '${pkgName}' berhasil diinstal! Merestart bot...`);
            setTimeout(() => process.exit(1), 1500);
            return true;
        }
    } catch (_) {}
    return false;
}

process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]', err?.message || err);
    tryAutoInstallMissingModule(err);
});

process.on('unhandledRejection', (err) => {
    console.error('[Unhandled Rejection]', err?.message || err);
    tryAutoInstallMissingModule(err);
});

require('./settings');
const chalk = require('chalk');
const { startBot } = require('./src/core/bot');

// Healthcheck HTTP server otomatis untuk platform PaaS seperti Railway / Render / Fly.io
// (Hanya aktif jika env PORT diset — 0 overhead di Pterodactyl & Termux)
if (process.env.PORT && !global._healthServerStarted) {
    try {
        const http = require('http');
        const port = parseInt(process.env.PORT, 10) || 3000;
        const srv = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                bot: global.botname || 'HuTao - MD',
                version: global.versi || '1.0.0',
                connected: Boolean(global.socket?.user?.id),
                uptime: Math.floor(process.uptime())
            }));
        });
        srv.listen(port, '0.0.0.0', () => {
            console.log(chalk.cyan(`[Health] HTTP server aktif di port ${port} (Railway/Cloud ready)`));
        });
        srv.on('error', () => {});
        global._healthServerStarted = true;
    } catch (_) {}
}

function boot() {
    startBot().catch((err) => {
        console.error(chalk.red('[Boot] Gagal memulai bot:'), err);
        setTimeout(boot, 10000);
    });
}

boot();
