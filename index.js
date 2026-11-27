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
                    fs.writeFileSync(libsignalFile, lsSrc, 'utf8');
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
            if (!src.includes('patch-usync-clean')) {
                const usyncBlockRe = /const extracted = Utils_1\.extractDeviceJids\(result\?\.list, authState\.creds\.me\.id, ignoreZeroDevices\)\r?\n\s*const deviceMap = \{\}(?:\r?\n\s*for \(const _fj of toFetch\) \{ const _fu = WABinary_1\.jidDecode\(_fj\)\?\.user; if \(_fu\) deviceMap\[_fu\] = \[\]; \})*\r?\n\s*for \(const item of extracted\) \{\r?\n\s*deviceMap\[item\.user\] = deviceMap\[item\.user\] \|\| \[\]\r?\n\s*deviceMap\[item\.user\]\.push\(item\)\r?\n\s*deviceResults\.push\(item\)\r?\n\s*\}\r?\n\s*for \(const key in deviceMap\) \{\r?\n\s*userDevicesCache\.set\(key, deviceMap\[key\]\)\r?\n\s*\}/;
                if (usyncBlockRe.test(src)) {
                    src = src.replace(
                        usyncBlockRe,
                        `// [patch-usync-clean]
            const extracted = Utils_1.extractDeviceJids(result?.list, authState.creds.me.id, ignoreZeroDevices, authState.creds.me?.lid);
            const deviceMap = {};
            for (const item of extracted) {
                deviceMap[item.user] = deviceMap[item.user] || [];
                deviceMap[item.user].push(item);
                deviceResults.push(item);
            }
            for (const key in deviceMap) {
                if (deviceMap[key] && deviceMap[key].length > 0) {
                    userDevicesCache.set(key, deviceMap[key]);
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
            if (!src.includes('patch-skm-preserve')) {
                const pDecRe = /const \{ user, device \} = WABinary_1\.jidDecode\(participant\.jid\);\s*devices\.push\(\{ user, device \}\);/;
                if (pDecRe.test(src)) {
                    src = src.replace(
                        pDecRe,
                        `const { user, device, server: pServer } = WABinary_1.jidDecode(participant.jid);\n            devices.push({ user, device, server: pServer });`
                    );
                    sendChanged = true;
                }
                const skLoopRe = /for \(const \{ user, device \} of devices\) \{\s*const jid = WABinary_1\.jidEncode\(user, \(groupData === null \|\| groupData === void 0 \? void 0 : groupData\.addressingMode\) === 'lid' \? 'lid' : 's\.whatsapp\.net', device\);/;
                if (skLoopRe.test(src)) {
                    src = src.replace(
                        skLoopRe,
                        `// [patch-skm-preserve]
                for (const { user, device, server: devServer } of devices) {
                    const jid = WABinary_1.jidEncode(user, devServer || ((groupData === null || groupData === void 0 ? void 0 : groupData.addressingMode) === 'lid' ? 'lid' : 's.whatsapp.net'), device);`
                    );
                    sendChanged = true;
                }
                const skSetRe = /await authState\.keys\.set\(\{ 'sender-key-memory': \{ \[jid\]: senderKeyMap \} \}\);/;
                if (skSetRe.test(src)) {
                    src = src.replace(
                        skSetRe,
                        `if (!participant && !isStatus) {\n                    await authState.keys.set({ 'sender-key-memory': { [jid]: senderKeyMap } });\n                }`
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

            if (!recvSrc.includes('patch-retry-skm')) {
                const retrySkmRe = /if \(\(0, WABinary_1\.isJidGroup\)\(remoteJid\)\) \{\s*await authState\.keys\.set\(\{ 'sender-key-memory': \{ \[remoteJid\]: null \} \}\);\s*\}/;
                if (retrySkmRe.test(recvSrc)) {
                    recvSrc = recvSrc.replace(
                        retrySkmRe,
                        `// [patch-retry-skm]
        if (sendToAll && (0, WABinary_1.isJidGroup)(remoteJid)) {
            await authState.keys.set({ 'sender-key-memory': { [remoteJid]: null } });
        }`
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
