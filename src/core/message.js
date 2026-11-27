require('../../settings');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const FileType = require('file-type');
const PhoneNumber = require('awesome-phonenumber');
const botCtx = require('./context');
const { parseCommand } = require('./prefix');

const { imageToWebp, videoToWebp, writeExif } = require('../utils/exif');
const { isUrl, getGroupAdmins, generateMessageTag, getBuffer, getSizeMedia } = require('../utils/helpers');
const { jidNormalizedUser, proto, getBinaryNodeChildren, getBinaryNodeChild, generateWAMessageContent, generateForwardMessageContent, prepareWAMessageMedia, delay, areJidsSameUser, extractMessageContent, generateMessageID, downloadContentFromMessage, generateWAMessageFromContent, jidDecode, generateWAMessage, toBuffer, getContentType, getDevice } = require('@whiskeysockets/baileys');
const { getAfk, removeAfk, formatDuration: formatAfkDuration } = require('../services/afk');

const getOwnerNumbers = (Dinz) => {
    try {
        const fileOwners = botCtx.getSection('owner', Dinz);
        const mainFileOwners = botCtx.getMainSection('owner');
        const id = botCtx.getBotIdentity(Dinz);
        const list = [
            id.owner,
            id.number,
            botCtx.getMainOwner(),
            ...(Array.isArray(fileOwners) ? fileOwners : []),
            ...(Array.isArray(mainFileOwners) ? mainFileOwners : [])
        ];
        if (Dinz?.isJadibot && Dinz?.jadibotNumber) {
            try {
                const jadibotMgr = require('../handlers/jadibot');
                const extra = jadibotMgr.getJadibotOwners(Dinz.jadibotNumber);
                if (Array.isArray(extra)) list.push(...extra);
            } catch (e) {}
        }
        return [...new Set(list.map(v => String(v || '').replace(/[^0-9]/g, '')).filter(Boolean))];
    } catch {
        return [String(global.owner || '').replace(/[^0-9]/g, '')].filter(Boolean);
    }
};

global.lidMap = global.lidMap || {};
global.phoneToLidMap = global.phoneToLidMap || {};
global.lidNames = global.lidNames || {};

let _lidCacheHydrated = false;
let _lidSaveTimer = null;
const _indexedMetadataSet = new WeakSet();

const isLikelyLidNumber = (digits) => {
    const clean = String(digits || '').replace(/[^0-9]/g, '');
    if (!clean) return false;
    return clean.length > 14;
};

const hydrateLidCache = (Dinz) => {
    if (_lidCacheHydrated) return;
    _lidCacheHydrated = true;
    try {
        const stored = botCtx.getMainSection('lid_cache');
        if (stored && typeof stored === 'object') {
            if (stored.lidToPhone && typeof stored.lidToPhone === 'object') {
                for (const [k, v] of Object.entries(stored.lidToPhone)) {
                    if (k && v && !global.lidMap[k]) global.lidMap[k] = v;
                    if (k && v && !global.phoneToLidMap[v]) global.phoneToLidMap[v] = k;
                }
            }
            if (stored.phoneToLid && typeof stored.phoneToLid === 'object') {
                for (const [k, v] of Object.entries(stored.phoneToLid)) {
                    if (k && v && !global.phoneToLidMap[k]) global.phoneToLidMap[k] = v;
                    if (k && v && !global.lidMap[v]) global.lidMap[v] = k;
                }
            }
            if (stored.names && typeof stored.names === 'object') {
                for (const [k, v] of Object.entries(stored.names)) {
                    if (k && v && !global.lidNames[k]) global.lidNames[k] = v;
                }
            }
        }
    } catch (_) {}
};

const scheduleLidCacheSave = () => {
    if (_lidSaveTimer) return;
    _lidSaveTimer = setTimeout(() => {
        _lidSaveTimer = null;
        try {
            // Simpan di root store saja (tidak diduplikasi ke setiap jadibot clone) dan biarkan scheduler menyinkronkannya tanpa memblokir event loop
            const root = botCtx.getRootDb();
            if (!root.store) root.store = {};
            root.store.lid_cache = {
                lidToPhone: { ...global.lidMap },
                phoneToLid: { ...global.phoneToLidMap },
                names: { ...global.lidNames }
            };
        } catch (_) {}
    }, 60000);
    if (_lidSaveTimer.unref) _lidSaveTimer.unref();
};

const recordLidPair = (rawLid, rawPhone, displayName = '', Dinz = null) => {
    hydrateLidCache(Dinz);
    const lid = String(rawLid || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const phone = String(rawPhone || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    let changed = false;

    if (lid && phone && lid !== phone && !isLikelyLidNumber(phone)) {
        if (global.lidMap[lid] !== phone) {
            global.lidMap[lid] = phone;
            changed = true;
        }
        if (global.phoneToLidMap[phone] !== lid) {
            global.phoneToLidMap[phone] = lid;
            changed = true;
        }
    }

    const cleanName = String(displayName || '').trim();
    if (cleanName && cleanName !== 'User') {
        if (phone && global.lidNames[phone] !== cleanName) {
            global.lidNames[phone] = cleanName;
            changed = true;
        }
        if (lid && global.lidNames[lid] !== cleanName) {
            global.lidNames[lid] = cleanName;
            changed = true;
        }
    }

    if (changed) scheduleLidCacheSave();
};

const ensureMetadataIndex = (metadata, Dinz = null) => {
    if (!metadata || typeof metadata !== 'object') return null;
    if (_indexedMetadataSet.has(metadata) && metadata._lidIdx) {
        return metadata._lidIdx;
    }
    hydrateLidCache(Dinz);
    const phoneToLid = new Map();
    const lidToPhone = new Map();

    if (metadata.owner && metadata.ownerLid) {
        recordLidPair(metadata.ownerLid, metadata.owner, '', Dinz);
    }
    if (metadata.subjectOwner && metadata.subjectOwnerLid) {
        recordLidPair(metadata.subjectOwnerLid, metadata.subjectOwner, '', Dinz);
    }
    if (metadata.descOwner && metadata.descOwnerLid) {
        recordLidPair(metadata.descOwnerLid, metadata.descOwner, '', Dinz);
    }

    const participants = metadata.participants;
    if (Array.isArray(participants)) {
        for (let i = 0; i < participants.length; i++) {
            const p = participants[i];
            if (!p || typeof p !== 'object') continue;
            let lid = '';
            let phone = '';

            const fields = [p.id, p.jid, p.lid, p.phoneNumber];
            for (let j = 0; j < fields.length; j++) {
                const rawF = fields[j];
                if (!rawF) continue;
                const str = String(rawF);
                const digits = str.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                if (!digits) continue;
                if (str.includes('@lid')) {
                    lid = digits;
                } else if (str.includes('@s.whatsapp.net')) {
                    if (!isLikelyLidNumber(digits)) phone = digits;
                } else if (!str.includes('@') && digits.length > 5) {
                    if (!isLikelyLidNumber(digits)) phone = digits;
                }
            }

            if (lid && phone) {
                phoneToLid.set(phone, `${lid}@lid`);
                lidToPhone.set(lid, `${phone}@s.whatsapp.net`);
            }
            const pName = p.notify || p.name || p.verifiedName || '';
            if ((lid && phone) || (pName && (phone || lid))) {
                recordLidPair(lid, phone, pName, Dinz);
            }
        }
    }

    const idx = { phoneToLid, lidToPhone, admins: [] };
    if (Array.isArray(participants)) {
        for (let i = 0; i < participants.length; i++) {
            const p = participants[i];
            if (p && p.admin !== null && p.admin !== undefined) {
                if (p.jid) idx.admins.push(p.jid);
                if (p.id) idx.admins.push(p.id);
                if (p.lid) idx.admins.push(p.lid);
            }
        }
    }
    try {
        Object.defineProperty(metadata, '_lidIdx', { value: idx, enumerable: false, configurable: true });
        _indexedMetadataSet.add(metadata);
    } catch (_) {}
    return idx;
};

const recordLidMapping = (participants, metadata, Dinz = null) => {
    if (metadata && typeof metadata === 'object') {
        ensureMetadataIndex(metadata, Dinz);
        return;
    }
    if (Array.isArray(participants)) {
        ensureMetadataIndex({ participants }, Dinz);
    }
};

const resolvePhoneToLid = (phoneOrJid, metadata) => {
    hydrateLidCache();
    if (!phoneOrJid || typeof phoneOrJid !== 'string') return '';
    const cleanJid = phoneOrJid.split(':')[0];
    if (cleanJid.endsWith('@lid')) return cleanJid;
    const rawNum = cleanJid.split('@')[0].replace(/[^0-9]/g, '');
    if (!rawNum) return '';

    if (metadata?.participants) {
        const idx = ensureMetadataIndex(metadata);
        const hit = idx?.phoneToLid?.get(rawNum);
        if (hit) return hit;
    }

    if (global.phoneToLidMap && global.phoneToLidMap[rawNum]) {
        return global.phoneToLidMap[rawNum] + '@lid';
    }
    return '';
};

const resolveLidToPhone = (jid, metadata) => {
    hydrateLidCache();
    if (!jid || typeof jid !== 'string') return jid;
    const cleanJid = jid.split(':')[0];
    if (cleanJid.endsWith('@s.whatsapp.net')) return cleanJid;
    const rawNum = cleanJid.split('@')[0].replace(/[^0-9]/g, '');
    if (!rawNum) return cleanJid;

    if (metadata?.participants) {
        const idx = ensureMetadataIndex(metadata);
        const hit = idx?.lidToPhone?.get(rawNum);
        if (hit) return hit;
    }

    if (global.lidMap && global.lidMap[rawNum]) {
        return global.lidMap[rawNum] + '@s.whatsapp.net';
    }

    return cleanJid;
};

const isSenderOwner = (m, Dinz) => {
    if (!m) return false;
    if (m.key?.fromMe || m.fromMe) return true;
    if (m.isDeveloper) return true;

    const ownerNums = getOwnerNumbers(Dinz);
    const botNumberOnly = Dinz?.user?.id ? Dinz.decodeJid(Dinz.user.id).split(':')[0].replace(/[^0-9]/g, '') : '';
    const botLid = Dinz?.user?.lid ? Dinz.decodeJid(Dinz.user.lid).split(':')[0].replace(/[^0-9]/g, '') : '';

    const checkNumber = (raw) => {
        if (!raw) return false;
        const clean = String(raw).split(':')[0].replace(/[^0-9]/g, '');
        if (!clean) return false;
        if (botNumberOnly && clean === botNumberOnly) return true;
        if (botLid && clean === botLid) return true;
        if (ownerNums.includes(clean)) return true;
        if (global.lidMap && global.lidMap[clean]) {
            const mappedPhone = global.lidMap[clean];
            if (ownerNums.includes(mappedPhone) || (botNumberOnly && mappedPhone === botNumberOnly) || (botLid && mappedPhone === botLid)) return true;
        }
        return false;
    };

    if (checkNumber(m.sender)) return true;
    if (checkNumber(m.key?.participant)) return true;
    if (checkNumber(m.participant)) return true;
    if (checkNumber(m.chat)) return true;

    if (m.metadata?.participants) {
        const idx = ensureMetadataIndex(m.metadata);
        const senderRaw = (m.sender || m.key?.participant || '').split(':')[0].replace(/[^0-9]/g, '');
        const resolved = idx?.lidToPhone?.get(senderRaw);
        if (resolved) {
            const pNum = resolved.split('@')[0].replace(/[^0-9]/g, '');
            if (ownerNums.includes(pNum) || (botNumberOnly && pNum === botNumberOnly) || (botLid && pNum === botLid)) return true;
        }
    }

    return false;
};

async function LoadDataBase(Dinz, m) {
	try {
		const botNumber = await Dinz.decodeJid(Dinz.user.id);
		const isNumber = x => typeof x === 'number' && !isNaN(x)
		const isBoolean = x => typeof x === 'boolean' && Boolean(x)

let setBot = global.db.settings
if (typeof setBot !== 'object') global.db.settings = {}
if (setBot) {
    if (!('autoread' in setBot)) setBot.autoread = false
    if (!('autotyping' in setBot)) setBot.autotyping = false
    if (!('isPublic' in setBot)) setBot.isPublic = true
    if (!('prefixMode' in setBot)) setBot.prefixMode = true
    if (!('audiomenu' in setBot) || typeof setBot.audiomenu === 'undefined' || setBot.audiomenu === null) setBot.audiomenu = true
    if (!('levelupNotif' in setBot) || typeof setBot.levelupNotif !== 'boolean') setBot.levelupNotif = false
    if (!('callQuality' in setBot) || !setBot.callQuality) setBot.callQuality = '480p'
} else {
    global.db.settings = {
        autoread: false,
        autotyping: false,
        isPublic: true,
        prefixMode: true,
        audiomenu: true,
        levelupNotif: false,
        callQuality: '480p'
    }
}
const isValidUserJid = m.sender && !m.sender.endsWith('@newsletter') && !m.sender.endsWith('@g.us') && !m.sender.includes('broadcast');
if (isValidUserJid) {
    let user = global.db.users[m.sender];
    if (typeof user !== 'object') global.db.users[m.sender] = {};
    if (!user) {
        global.db.users[m.sender] = {};
    }
    try {
        const { initRpgUser } = require('../services/rpg');
        initRpgUser(global.db.users[m.sender]);
    } catch (e) {}
    try {
        const { initCpanelDb } = require('../services/cpanel');
        initCpanelDb();
    } catch (e) {}
}
if (m.isGroup) {
  let group = global.db.groups[m.chat]
  if (typeof group !== 'object') global.db.groups[m.chat] = {}
  if (group) {
    if (!('welcome' in group)) group.welcome = false
    if (!('left' in group)) group.left = false
    if (!('welcomeMessage' in group)) group.welcomeMessage = ''
    if (!('leftMessage' in group)) group.leftMessage = ''
    if (!('antilink' in group)) group.antilink = false
    if (!('antilink2' in group)) group.antilink2 = false
    if (!('antilinkWa' in group)) group.antilinkWa = false
    if (!('antilinkAll' in group)) group.antilinkAll = false
    if (!('antihidetag' in group)) group.antihidetag = false
    if (!('antibadword' in group)) group.antibadword = false
    if (!('antiswgc' in group)) group.antiswgc = false
    if (!('antiswgc_kick' in group)) group.antiswgc_kick = false
    if (!('antitagsw' in group)) group.antitagsw = false
    if (!('antitagswkick' in group)) group.antitagswkick = false
    if (!('autoOpen' in group)) group.autoOpen = false
    if (!('autoOpenTime' in group)) group.autoOpenTime = '06:00'
    if (!('autoClose' in group)) group.autoClose = false
    if (!('autoCloseTime' in group)) group.autoCloseTime = '00:00'
    if (!('mute' in group)) group.mute = false
    if (!('antisticker' in group)) group.antisticker = false
    if (!('antidocument' in group)) group.antidocument = false
    if (!('antivirtex' in group)) group.antivirtex = false
    if (!('antispam' in group)) group.antispam = false
    if (!('antijudol' in group)) group.antijudol = false
    if (!('antiphising' in group)) group.antiphising = false
    if (!('slowmode' in group)) group.slowmode = 0
    if (!('levelupNotif' in group)) group.levelupNotif = false
  } else {
    global.db.groups[m.chat] = {
        welcome: false,
        left: false,
        welcomeMessage: '',
        leftMessage: '',
        antilink: false,
        antilink2: false,
        antilinkWa: false,
        antilinkAll: false,
        antihidetag: false,
        antibadword: false,
        antiswgc: false,
        antiswgc_kick: false,
        antitagsw: false,
        antitagswkick: false,
        autoOpen: false,
        autoOpenTime: '06:00',
        autoClose: false,
        autoCloseTime: '00:00',
        mute: false,
        antisticker: false,
        antidocument: false,
        antivirtex: false,
        antispam: false,
        antijudol: false,
        antiphising: false,
        slowmode: 0,
        levelupNotif: false
    }
  }
}

	} catch (e) {
		throw e;
	}
}

async function MessagesUpsert(Dinz, message, store) {
  const incomingList = Array.isArray(message?.messages) ? message.messages.filter(Boolean) : [];
  if (incomingList.length === 0) return;
  if (incomingList.length === 1) {
    return processSingleUpsert(Dinz, message, incomingList[0], store);
  }
  await Promise.allSettled(incomingList.map((msg) => processSingleUpsert(Dinz, message, msg, store)));
}

async function processSingleUpsert(Dinz, message, msg, store) {
  return botCtx.runWithBotContext(Dinz, async () => {
  try {
    let botNumber = await Dinz.decodeJid(Dinz.user.id);
    if (!msg || !msg.key || !msg.key.remoteJid) return;
    if (global.sentKeys && global.sentKeys.has(msg.key?.id)) return;
    const remoteJid = msg.key.remoteJid;

    global._processedMsgIds = global._processedMsgIds || new Set();
    const dedupKey = `${Dinz?.isJadibot ? Dinz.jadibotNumber : 'main'}:${remoteJid}:${msg.key.id || ''}`;
    if (msg.key.id) {
      if (global._processedMsgIds.has(dedupKey)) return;
      global._processedMsgIds.add(dedupKey);
      if (global._processedMsgIds.size > 2000) {
        const oldest = global._processedMsgIds.values().next().value;
        global._processedMsgIds.delete(oldest);
      }
    }

    const type = msg.message ? (getContentType(msg.message) || Object.keys(msg.message)[0]) : '';

    if (msg.key?.remoteJid === 'status@broadcast') {
        try {
            const statusStore = require('../services/status-store');
            statusStore.captureStatus(Dinz, msg, store);
        } catch (_) {}
        if (global.db.settings.readsw === true) {
            await Dinz.readMessages([msg.key]).catch(() => {});
        }
        if (global.db.settings.autoreactsw && !msg.key.fromMe) {
            const emoji = typeof global.db.settings.autoreactsw === 'string' ? global.db.settings.autoreactsw : '❤️';
            const participant = msg.key.participant || msg.participant;
            if (participant) {
                await Dinz.sendMessage('status@broadcast', { react: { text: emoji, key: msg.key } }, { statusJidList: [participant, Dinz.user?.id].filter(Boolean) }).catch(() => {});
            }
        }
        return;
    }
    if (!msg.message) return;

    if (global.db.settings.autoread === true && !msg.key.fromMe) {
      Dinz.readMessages([msg.key]).catch(() => {});
    }

    if (global.db.settings.autotyping === true && !msg.key.fromMe) {
      Dinz.sendPresenceUpdate('composing', msg.key.remoteJid).catch(() => {});
    }

    const m = await Serialize(Dinz, msg, store);

    // AntiDelete: rekam pesan masuk & deteksi penghapusan pesan (berjalan baik di mode Public maupun Self!)
    try {
        const antiDelCall = require('../services/antidelete-anticall');
        const wasRevoke = await antiDelCall.checkProtocolRevokeOnUpsert(Dinz, msg, m);
        if (wasRevoke) return;
        antiDelCall.recordIncomingForAntiDelete(Dinz, m, msg);
    } catch (_) {}

    // Cek apakah user diban oleh Owner
    if (m.sender && Array.isArray(global.db?.settings?.bannedUsers) && global.db.settings.bannedUsers.includes(m.sender) && !isSenderOwner(m, Dinz)) {
        return;
    }
    const isOwnerOrBot = isSenderOwner(m, Dinz);

    if (m.isBaileys && !isOwnerOrBot) return;

    if (!Dinz.public && !isOwnerOrBot) {
        return;
    }

    if (m.isGroup && !isOwnerOrBot) {
        try {
            const sistemSewa = botCtx.getSection('sistemsewa', Dinz);
            const isSewaEnabled = Boolean(sistemSewa && sistemSewa.enabled === true && sistemSewa.explicit === true);

            if (isSewaEnabled) {
                const sewagrup = botCtx.getSection('sewagrup', Dinz);
                const isSewa = Array.isArray(sewagrup) && sewagrup.some(v => v.jid === m.chat && v.expired > Date.now());
                if (!isSewa) {
                    const pluginLoader = require('./plugins');
                    const validCmdSet = pluginLoader.getValidCommandsSet ? pluginLoader.getValidCommandsSet() : [];

                    let isCmd = false;
                    if (typeof m.body === 'string' && m.body.length > 0) {
                        const parsed = parseCommand(m.body, validCmdSet, global.db?.settings, false);
                        isCmd = parsed.isCmd;
                    }

                    if (isCmd) {
                        if (!global.expiredSewaNotify) global.expiredSewaNotify = {};
                        const notifyKey = `${Dinz?.isJadibot ? Dinz.jadibotNumber : 'main'}_${m.chat}`;
                        const lastNotified = global.expiredSewaNotify[notifyKey] || 0;
                        const now = Date.now();

                        if (now - lastNotified > 12 * 60 * 60 * 1000) {
                            global.expiredSewaNotify[notifyKey] = now;
                            await Dinz.sendMessage(m.chat, {
                                text: `\`⌜ Verification Group ⌟\`\n> ◦ Status : *Belum Terdaftar Sewa*\n> ◦ Hubungi : *wa.me/${global.owner}*`
                            }, { quoted: m });
                        }
                        return;
                    }

                }
            }
        } catch (e) {
            console.error("Error in sewa check:", e);
        }
    }

    if (m.isGroup && global.db.groups[m.chat]?.mute === true) {
        if (!isOwnerOrBot) return;
    }

    if (m.isGroup && global.db.groups[m.chat] && !m.isAdmin && Dinz.user && m.sender !== Dinz.decodeJid(Dinz.user.id) && !m.key.fromMe) {
        const groupData = global.db.groups[m.chat];
        const isBotAdmin = m.isBotAdmin;

        if (isBotAdmin) {

            if (groupData.antibadword === true && m.body) {
                const rawBadwords = botCtx.getSection('badwords', Dinz);
                const badwords = (rawBadwords && Array.isArray(rawBadwords.words)) ? rawBadwords : { words: [] };
                const words = m.body.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/);
                let isToxic = false;
                for (const word of words) {
                    const cleanWord = word.replace(/[^a-z0-9]/gi, '');
                    if (badwords.words.includes(cleanWord)) {
                        isToxic = true;
                        break;
                    }
                }

                    if (isToxic) {
                        await Dinz.sendMessage(m.chat, { delete: m.key });
                        await Dinz.sendMessage(m.chat, {
                            text: `\`⌜ Kata Kasar Terdeteksi ⌟\`\n> ◦ *User :* @${m.sender.split("@")[0]}\n> ◦ *Pelanggaran :* Menggunakan kata kasar terlarang\n> ◦ *Tindakan :* Pesan otomatis dihapus`,
                            mentions: [m.sender]
                        });
                        return;
                    }
                }

                const isSwgc = m.type === 'groupStatusMentionMessage' ||
                               Boolean(m.message?.groupStatusMentionMessage) ||
                               Boolean(m.message?.broadcastMessage) ||
                               m.msg?.contextInfo?.remoteJid === 'status@broadcast' ||
                               m.quoted?.chat === 'status@broadcast' ||
                               m.msg?.contextInfo?.participant === 'status@broadcast';

                if (isSwgc) {
                    if (groupData.antiswgc_kick === true || groupData.antiswgc === 'kick') {
                        await Dinz.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                        await Dinz.sendMessage(m.chat, {
                            text: `\`⌜ Anti SWGC (Kick) ⌟\`\n> ◦ *User :* @${m.sender.split("@")[0]}\n> ◦ *Pelanggaran :* Membagikan Story/Status WA ke Grup\n> ◦ *Tindakan :* Pesan dihapus & Dikeluarkan dari grup`,
                            mentions: [m.sender]
                        }).catch(() => {});
                        await Dinz.groupParticipantsUpdate(m.chat, [m.sender], 'remove').catch(() => {});
                        return;
                    } else if (groupData.antiswgc === true || groupData.antiswgc === 'delete') {
                        await Dinz.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                        await Dinz.sendMessage(m.chat, {
                            text: `\`⌜ Anti SWGC (Delete) ⌟\`\n> ◦ *User :* @${m.sender.split("@")[0]}\n> ◦ *Pelanggaran :* Membagikan Story/Status WA ke Grup\n> ◦ *Tindakan :* Pesan otomatis dihapus`,
                            mentions: [m.sender]
                        }).catch(() => {});
                        return;
                    }
                }

                const isTagSw = m.type === 'groupStatusMentionMessage' ||
                                Boolean(m.message?.groupStatusMentionMessage) ||
                                (m.msg?.contextInfo?.remoteJid === 'status@broadcast' && (m.mentionedJid?.length > 0 || m.msg?.contextInfo?.mentionedJid?.length > 0));

                if (isTagSw) {
                    if (groupData.antitagswkick === true || groupData.antitagsw === 'kick') {
                        await Dinz.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                        await Dinz.sendMessage(m.chat, {
                            text: `\`⌜ Anti Tag SW (Kick) ⌟\`\n> ◦ *User :* @${m.sender.split("@")[0]}\n> ◦ *Pelanggaran :* Tag / Mention Status WA ke Grup\n> ◦ *Tindakan :* Pesan dihapus & Dikeluarkan dari grup`,
                            mentions: [m.sender]
                        }).catch(() => {});
                        await Dinz.groupParticipantsUpdate(m.chat, [m.sender], 'remove').catch(() => {});
                        return;
                    } else if (groupData.antitagsw === true || groupData.antitagsw === 'delete') {
                        await Dinz.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                        await Dinz.sendMessage(m.chat, {
                            text: `\`⌜ Anti Tag SW (Delete) ⌟\`\n> ◦ *User :* @${m.sender.split("@")[0]}\n> ◦ *Pelanggaran :* Tag / Mention Status WA ke Grup\n> ◦ *Tindakan :* Pesan otomatis dihapus`,
                            mentions: [m.sender]
                        }).catch(() => {});
                        return;
                    }
                }

            if (groupData.antihidetag === true && m.mentionedJid && m.mentionedJid.length > 10) {
                await Dinz.sendMessage(m.chat, { delete: m.key });
                await Dinz.sendMessage(m.chat, {
                    text: `\`⌜ Anti Hidetag ⌟\`\n> ◦ *User :* @${m.sender.split("@")[0]}\n> ◦ *Pelanggaran :* Hidetag / Tag massal terdeteksi\n> ◦ *Tindakan :* Pesan otomatis dihapus`,
                    mentions: [m.sender]
                });
                return;
            }

            const regexLink = /(https?:\/\/)?(chat\.whatsapp\.com|wa\.me|whatsapp\.com(\/channel)?|buka\s?tautan\s?ini\s?untuk\s?bergabung\s?ke\s?grup\s?whatsapp)/gi;
            const regexWaLink = /wa\.me|api\.whatsapp\.com\/send|wa\.link/i;
            const regexAllLinks = /(https?:\/\/[^\s]+)/gi;

            const isThisGroupLink = async (text, chatId) => {
                try {
                    const gclink = `https://chat.whatsapp.com/${await Dinz.groupInviteCode(chatId)}`;
                    const isLinkThisGc = new RegExp(gclink, 'i');
                    return isLinkThisGc.test(text);
                } catch {
                    return false;
                }
            };

            if (m.body) {
                const hasLink = regexLink.test(m.body);
                const hasWaLink = regexWaLink.test(m.body);
                const hasAllLink = regexAllLinks.test(m.body);

                if (groupData.antilink === true && hasLink) {
                    if (!(await isThisGroupLink(m.body, m.chat))) {
                        await Dinz.sendMessage(m.chat, {
                            text: `🚫 *ANTI LINK AKTIF* 🚫\n@${m.sender.split("@")[0]} link grup lain terdeteksi!\n\nKamu akan dikeluarkan karena admin sudah mengaktifkan fitur antilink.`,
                            mentions: [m.sender]
                        });
                        await Dinz.sendMessage(m.chat, { delete: m.key });
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await Dinz.groupParticipantsUpdate(m.chat, [m.sender], "remove");
                        return;
                    }
                }

                if (groupData.antilink2 === true && hasLink) {
                    if (!(await isThisGroupLink(m.body, m.chat))) {
                        await Dinz.sendMessage(m.chat, {
                            text: `⚠️ *PERINGATAN LINK TERDETEKSI* ⚠️\n@${m.sender.split("@")[0]} pesan kamu otomatis dihapus karena antilink aktif di grup ini.`,
                            mentions: [m.sender]
                        });
                        await Dinz.sendMessage(m.chat, { delete: m.key });
                        return;
                    }
                }

                if (groupData.antilinkWa === true && hasWaLink) {
                    await Dinz.sendMessage(m.chat, {
                        text: `⚠️ *PERINGATAN LINK WA* ⚠️\n@${m.sender.split("@")[0]} pesan kamu otomatis dihapus karena antilink wa aktif di grup ini.`,
                        mentions: [m.sender]
                    });
                    await Dinz.sendMessage(m.chat, { delete: m.key });
                    return;
                }

                if (groupData.antilinkAll === true && hasAllLink) {
                    if (!(await isThisGroupLink(m.body, m.chat))) {
                        await Dinz.sendMessage(m.chat, {
                            text: `⚠️ *PERINGATAN LINK* ⚠️\n@${m.sender.split("@")[0]} pesan kamu otomatis dihapus karena antilink all aktif di grup ini.`,
                            mentions: [m.sender]
                        });
                        await Dinz.sendMessage(m.chat, { delete: m.key });
                        return;
                    }
                }

                if (groupData.antijudol === true) {
                    const judolPattern = /\b(slot\s*gacor|maxwin|zeus\s*x?\d+|scatter\s*hitam|depo\s*\d+k|wd\s*cepat|jp\s*paus|situs\s*slot|togel\s*online|bola\s*parlay|agen\s*slot|rtp\s*live|mahjong\s*ways)\b/i;
                    if (judolPattern.test(m.body)) {
                        await Dinz.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                        await Dinz.sendMessage(m.chat, {
                            text: `\`⌜ Anti Judol ⌟\`\n> ◦ *User :* @${m.sender.split("@")[0]}\n> ◦ *Pelanggaran :* Promosi / konten judi online terdeteksi\n> ◦ *Tindakan :* Pesan otomatis dihapus`,
                            mentions: [m.sender]
                        }).catch(() => {});
                        return;
                    }
                }

                if (groupData.antiphising === true) {
                    const phishPattern = /(dana[\-_.]?kaget[^\s]*\.(xyz|top|club|site|online|vip|icu|buzz|click)|claim[\-_.]?(hadiah|saldo|gratis)|login[\-_.]?wa[\-_.]?web|bit\.ly\/[a-z0-9]*(claim|hadiah|dana|free))/i;
                    if (phishPattern.test(m.body)) {
                        await Dinz.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                        await Dinz.sendMessage(m.chat, {
                            text: `\`⌜ Anti Phising ⌟\`\n> ◦ *User :* @${m.sender.split("@")[0]}\n> ◦ *Pelanggaran :* Tautan mencurigakan / indikasi phising\n> ◦ *Tindakan :* Pesan otomatis dihapus`,
                            mentions: [m.sender]
                        }).catch(() => {});
                        return;
                    }
                }

                if (groupData.antivirtex === true) {
                    const invisibleCount = (m.body.match(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g) || []).length;
                    if (m.body.length > 4000 || invisibleCount > 80) {
                        await Dinz.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                        await Dinz.sendMessage(m.chat, {
                            text: `\`⌜ Anti Virtex ⌟\`\n> ◦ *User :* @${m.sender.split("@")[0]}\n> ◦ *Pelanggaran :* Pesan terlalu panjang / karakter virtex terdeteksi\n> ◦ *Tindakan :* Pesan otomatis dihapus`,
                            mentions: [m.sender]
                        }).catch(() => {});
                        return;
                    }
                }
            }

            if (groupData.antisticker === true && m.type === 'stickerMessage') {
                await Dinz.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                return;
            }

            if (groupData.antidocument === true && (m.type === 'documentMessage' || m.type === 'documentWithCaptionMessage')) {
                await Dinz.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                return;
            }

            if (groupData.mutedMembers && groupData.mutedMembers[m.sender]) {
                const muteUntil = groupData.mutedMembers[m.sender];
                if (muteUntil === true || (typeof muteUntil === 'number' && muteUntil > Date.now())) {
                    await Dinz.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                    return;
                } else {
                    delete groupData.mutedMembers[m.sender];
                }
            }

            if (Number(groupData.slowmode) > 0) {
                global._slowmodeMap = global._slowmodeMap || {};
                const smKey = `${m.chat}_${m.sender}`;
                const lastTs = global._slowmodeMap[smKey] || 0;
                const waitMs = Number(groupData.slowmode) * 1000;
                if (Date.now() - lastTs < waitMs) {
                    await Dinz.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                    return;
                }
                global._slowmodeMap[smKey] = Date.now();
            }

            if (groupData.antispam === true) {
                global._spamWindow = global._spamWindow || {};
                const spKey = `${m.chat}_${m.sender}`;
                const nowTs = Date.now();
                const list = (global._spamWindow[spKey] || []).filter(t => nowTs - t < 5000);
                list.push(nowTs);
                global._spamWindow[spKey] = list;
                if (list.length >= 6) {
                    await Dinz.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                    if (list.length === 6) {
                        await Dinz.sendMessage(m.chat, {
                            text: `\`⌜ Anti Spam ⌟\`\n> ◦ *User :* @${m.sender.split("@")[0]}\n> ◦ *Pelanggaran :* Mengirim pesan terlalu cepat (spam)\n> ◦ *Tindakan :* Pesan otomatis dihapus`,
                            mentions: [m.sender]
                        }).catch(() => {});
                    }
                    return;
                }
            }
        }
    }

    if (m.isGroup && !m.key.fromMe && m.sender && !m.isBaileys) {
        try {
            if (!global.db.groups[m.chat]) global.db.groups[m.chat] = {};
            const g = global.db.groups[m.chat];
            if (!g.chatStats || typeof g.chatStats !== 'object') g.chatStats = {};
            if (!g.chatStats[m.sender]) {
                g.chatStats[m.sender] = { count: 0, lastChat: 0, name: m.pushName || '' };
            }
            g.chatStats[m.sender].count = (g.chatStats[m.sender].count || 0) + 1;
            g.chatStats[m.sender].lastChat = Date.now();
            if (m.pushName && m.pushName !== 'User') g.chatStats[m.sender].name = m.pushName;
        } catch (_) {}
    }

    if (!m.key.fromMe && m.sender && !m.isBaileys && m.pushName && m.pushName !== 'User') {
        try {
            if (global.db && global.db.users) {
                if (!global.db.users[m.sender]) global.db.users[m.sender] = {};
                global.db.users[m.sender].name = m.pushName;
                global.db.users[m.sender].lastSeen = Date.now();
            }
        } catch (_) {}
    }

    if (m.isGroup && !m.key.fromMe) {

        const afkSender = getAfk(m.sender);
        const isAfkCmd = typeof m.body === 'string' && m.body.trim().toLowerCase().startsWith('afk');

        if (afkSender && !isAfkCmd) {
            const prevAfk = removeAfk(m.sender);
            if (prevAfk) {
                const durationStr = formatAfkDuration(Date.now() - prevAfk.time);
                await Dinz.sendMessage(m.chat, {
                    text: `\`⌜ Berhenti AFK 👋 ⌟\`\n> ◦ *User :* @${m.sender.split('@')[0]}\n> ◦ *Alasan Sebelumnya :* ${prevAfk.reason}\n> ◦ *Durasi AFK :* ${durationStr}\n> ◦ *Status :* Kembali Online`,
                    mentions: [m.sender]
                }, { quoted: m }).catch(() => {});
            }
        }

        const mentionedJids = [...(m.mentionedJid || [])];
        if (m.quoted?.sender && !mentionedJids.includes(m.quoted.sender)) {
            mentionedJids.push(m.quoted.sender);
        }

        for (const jid of mentionedJids) {
            if (jid === m.sender) continue;
            const targetAfk = getAfk(jid);
            if (targetAfk) {
                const durationStr = formatAfkDuration(Date.now() - targetAfk.time);
                await Dinz.sendMessage(m.chat, {
                    text: `\`⌜ Pengguna Sedang AFK 💤 ⌟\`\n> ◦ *User :* @${jid.split('@')[0]}\n> ◦ *Alasan :* ${targetAfk.reason}\n> ◦ *Sejak :* ${durationStr} yang lalu\n\n> ◦ *Catatan :* Jangan tag dia sampai kembali aktif!`,
                    mentions: [jid]
                }, { quoted: m }).catch(() => {});
                break;
            }
        }
    }

    require('../handlers/command')(Dinz, m, message, store);

    if (type === 'interactiveResponseMessage' && m.quoted && m.quoted.fromMe) {
      try {
        let parsedId = JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson).id || '';
        const { getPrefixConfig } = require('./prefix');
        const pCfg = getPrefixConfig(global.db?.settings);
        if (parsedId && pCfg.mode === 'single' && !parsedId.startsWith(pCfg.prefix)) {
          const stripped = parsedId.replace(/^[.!\/#$]+/, '');
          parsedId = `${pCfg.prefix}${stripped}`;
        }

        if (parsedId) {
          let apb = await generateWAMessage(
            m.chat,
            { text: parsedId, mentions: m.mentionedJid },
            { userJid: Dinz.user.id, quoted: m.quoted }
          );

          apb.key = msg.key;
          apb.key.fromMe = areJidsSameUser(m.sender, Dinz.user.id);
          if (m.isGroup) apb.participant = m.sender;

          let pbr = {
            ...msg,
            messages: [proto.WebMessageInfo.fromObject(apb)],
            type: 'append'
          };

          Dinz.ev.emit('messages.upsert', pbr);
        }
      } catch (_) {}
    }
  } catch (e) {
    throw e;
  }
  });
}

async function Solving(Dinz, store) {
    return botCtx.runWithBotContext(Dinz, async () => {
    Dinz.public = global.db.settings.isPublic;

	Dinz.decodeJid = (jid) => {
		if (!jid) return jid
		if (/:\d+@/gi.test(jid)) {
			let decode = jidDecode(jid) || {}
			return decode.user && decode.server && decode.user + '@' + decode.server || jid
		} else return jid
	}

    if (Dinz.user) {
        const bPhone = Dinz.user.id ? Dinz.decodeJid(Dinz.user.id).split(':')[0].replace(/[^0-9]/g, '') : '';
        const bLid = Dinz.user.lid ? Dinz.decodeJid(Dinz.user.lid).split(':')[0].replace(/[^0-9]/g, '') : '';
        if (bPhone && bLid) {
            global.lidMap = global.lidMap || {};
            global.lidMap[bLid] = bPhone;
        }
    }

    Dinz.serializeM = (m) => MessagesUpsert(Dinz, m, store)

	Dinz.getName = async (jid, withoutContact = false) => {
		try {
			const id = Dinz.decodeJid(jid);
			if (id.endsWith('@g.us')) {
				const groupInfo = store.contacts[id] || await Dinz.groupMetadata(id).catch(_ => ({})) || {};
				return groupInfo.subject || groupInfo.name || PhoneNumber('+' + id.replace('@g.us', '')).getNumber('international');
			} else {
				if (id === '0@s.whatsapp.net') return 'WhatsApp';
				const contactInfo = store.contacts[id] || {};
				return withoutContact ? '' : contactInfo.name || contactInfo.verifiedName || contactInfo.notify || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international');
			}
		} catch {
			return jid.split('@')[0];
		}
	}

	Dinz.sendContactV2 = async (jid, kon, desk = "Developer Bot", quoted = '', opts = {}) => {
let list = []
const ownerName = botCtx.getBotIdentity(Dinz).namaOwner || global.namaOwner
for (let i of kon) {
list.push({
displayName: ownerName,
  vcard: 'BEGIN:VCARD\n' +
    'VERSION:3.0\n' +
    `N:;${ownerName};;;\n` +
    `FN:${ownerName}\n` +
    'ORG:null\n' +
    'TITLE:\n' +
    `item1.TEL;waid=${i}:${i}\n` +
    'item1.X-ABLabel:Ponsel\n' +
    `X-WA-BIZ-DESCRIPTION:${desk}\n` +
    `X-WA-BIZ-NAME:${ownerName}\n` +
    'END:VCARD'
})
}
Dinz.sendMessage(jid, { contacts: { displayName: `${list.length} Kontak`, contacts: list }, ...opts }, { quoted })
}

	Dinz.sendContact = async (jid, kon, quoted = '', opts = {}) => {
		let list = []
		for (let i of kon) {
			list.push({
				displayName: await Dinz.getName(i + '@s.whatsapp.net'),
				vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await Dinz.getName(i + '@s.whatsapp.net')}\nFN:${await Dinz.getName(i + '@s.whatsapp.net')}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nitem2.ADR:;;Indonesia;;;;\nitem2.X-ABLabel:Region\nEND:VCARD`
			})
		}
		Dinz.sendMessage(jid, { contacts: { displayName: `${list.length} Kontak`, contacts: list }, ...opts }, { quoted })
	}

	Dinz.profilePictureUrl = async (jid, type = 'image', timeoutMs) => {
		try {
			const result = await Dinz.query({
				tag: 'iq',
				attrs: {
					target: jidNormalizedUser(jid),
					to: '@s.whatsapp.net',
					type: 'get',
					xmlns: 'w:profile:picture'
				},
				content: [{
					tag: 'picture',
					attrs: {
						type, query: 'url'
					},
				}]
			}, timeoutMs);
			const child = getBinaryNodeChild(result, 'picture');
			return child?.attrs?.url;
		} catch {
			return null;
		}
	}

	Dinz.setStatus = (status) => {
		Dinz.query({
			tag: 'iq',
			attrs: {
				to: '@s.whatsapp.net',
				type: 'set',
				xmlns: 'status',
			},
			content: [{
				tag: 'status',
				attrs: {},
				content: Buffer.from(status, 'utf-8')
			}]
		})
		return status
	}

	Dinz.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
		const quotedOptions = { quoted }
		async function getFileUrl(res, mime) {
			if (mime && mime.includes('gif')) {
				return Dinz.sendMessage(jid, { video: res.data, caption: caption, gifPlayback: true, ...options }, quotedOptions);
			} else if (mime && mime === 'application/pdf') {
				return Dinz.sendMessage(jid, { document: res.data, mimetype: 'application/pdf', caption: caption, ...options }, quotedOptions);
			} else if (mime && mime.includes('image')) {
				return Dinz.sendMessage(jid, { image: res.data, caption: caption, ...options }, quotedOptions);
			} else if (mime && mime.includes('video')) {
				return Dinz.sendMessage(jid, { video: res.data, caption: caption, mimetype: 'video/mp4', ...options }, quotedOptions);
			} else if (mime && mime.includes('webp') && !/.jpg|.jpeg|.png/.test(url)) {
				return Dinz.sendAsSticker(jid, res.data, quoted, options);
			} else if (mime && mime.includes('audio')) {
				return Dinz.sendMessage(jid, { audio: res.data, mimetype: 'audio/mpeg', ...options }, quotedOptions);
			} else {
				return Dinz.sendMessage(jid, { document: res.data, mimetype: mime, fileName: url.split('/').pop(), caption: caption, ...options }, quotedOptions);
			}
		}

		try {
			const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
			let mime = res.headers['content-type'];
			if (!mime || mime.includes('octet-stream')) {
				const fileType = await FileType.fromBuffer(res.data);
				mime = fileType ? fileType.mime : 'application/octet-stream';
			}
			const hasil = await getFileUrl(res, mime);
			return hasil
		} catch (error) {
			throw new Error(`Failed to download file: ${error.message}`);
		}
	}

	Dinz.sendTextMentions = async (jid, text, quoted, options = {}) => Dinz.sendMessage(jid, { text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted })

	Dinz.sendAsSticker = async (jid, path, quoted, options = {}) => {
		const buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
		let buffer;
		let isFile = false;
		if (options && (options.packname || options.author)) {
			buffer = await writeExif(buff, options);
			isFile = typeof buffer === 'string';
		} else {
			buffer = await videoToWebp(buff);
		}
		await Dinz.sendMessage(jid, { sticker: isFile ? { url: buffer } : buffer, ...options }, { quoted });
		if (isFile && fs.existsSync(buffer)) {
			try { await fs.promises.unlink(buffer); } catch (e) {}
		}
		return buff;
	}

	Dinz.downloadMediaMessage = async (message) => {
		try {
			const msg = message.msg || message;
			const mime = msg.mimetype || '';
			const messageType = (message.type || mime.split('/')[0]).replace(/Message/gi, '');
			const stream = await downloadContentFromMessage(msg, messageType);
			let buffer = Buffer.from([]);
			for await (const chunk of stream) {
				buffer = Buffer.concat([buffer, chunk]);
			}
			return buffer
		} catch (error) {
			throw new Error(`Failed to download media: ${error.message}`);
		}
	}

	Dinz.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
		const buffer = await Dinz.downloadMediaMessage(message);
		const type = await FileType.fromBuffer(buffer) || { ext: 'bin' };
		const tmpDir = path.join(process.cwd(), 'tmp');
		if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
		const trueFileName = attachExtension ? path.join(tmpDir, `${filename ? filename : Date.now()}.${type.ext}`) : filename;
		await fs.promises.writeFile(trueFileName, buffer);
		return trueFileName;
	}

	Dinz.getFile = async (PATH, save) => {
		let res;
		let filename;
		let data = Buffer.isBuffer(PATH) ? PATH :
				   /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') :
				   /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) :
				   fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) :
				   typeof PATH === 'string' ? PATH : Buffer.alloc(0)

		let type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: 'bin' }
		const tmpDir = path.join(process.cwd(), 'tmp');
		if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
		filename = path.join(tmpDir, new Date * 1 + '.' + type.ext)
		if (data && save) await fs.promises.writeFile(filename, data)
		return {
			res,
			filename,
			size: await getSizeMedia(data),
			...type,
			data
		}
	}

	Dinz.sendMedia = async (jid, path, fileName = '', caption = '', quoted = '', options = {}) => {
		const { mime, data, filename } = await Dinz.getFile(path, true);
		const isWebpSticker = options.asSticker || /webp/.test(mime);
		let type = 'document', mimetype = mime, pathFile = filename;

		if (isWebpSticker) {
			const { writeExif } = require('../utils/exif');
			const media = { mimetype: mime, data };
			const id = botCtx.getBotIdentity(Dinz);
			pathFile = await writeExif(media, {
				packname: options.packname || id.packname || global.packname,
				author: options.author || id.namaOwner || global.namaOwner,
				categories: options.categories || [],
			})
			await fs.promises.unlink(filename);
			type = 'sticker';
			mimetype = 'image/webp';
		} else if (/image|video|audio/.test(mime)) {
			type = mime.split('/')[0];
			mimetype = type == 'video' ? 'video/mp4' : type == 'audio' ? 'audio/mpeg' : mime
		}

		let anu = await Dinz.sendMessage(jid, { [type]: { url: pathFile }, caption, mimetype, fileName, ...options }, { quoted, ...options });
		await fs.promises.unlink(pathFile);
		return anu;
	}

	Dinz.appendResponseMessage = async (m, text) => {
		let apb = await generateWAMessage(m.chat, { text, mentions: m.mentionedJid }, { userJid: Dinz.user.id, quoted: m.quoted && m.quoted.fakeObj });
		apb.key = m.key
		apb.key.id = [...Array(32)].map(() => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
		apb.key.fromMe = areJidsSameUser(m.sender, Dinz.user.id);
		if (m.isGroup) apb.participant = m.sender;
		Dinz.ev.emit('messages.upsert', {
			...m,
			messages: [proto.WebMessageInfo.fromObject(apb)],
			type: 'append'
		});
	}

	return Dinz
    });
}

async function Serialize(Dinz, msg, store) {
    const botNumber = Dinz.decodeJid(Dinz.user.id);
    const botrunning = global.owner + '@s.whatsapp.net';
    if (!msg) return msg
    const m = { ...msg };

    if (Dinz.user) {
        const bPhone = Dinz.user.id ? Dinz.decodeJid(Dinz.user.id).split(':')[0].replace(/[^0-9]/g, '') : '';
        const bLid = Dinz.user.lid ? Dinz.decodeJid(Dinz.user.lid).split(':')[0].replace(/[^0-9]/g, '') : '';
        if (bPhone && bLid) {
            recordLidPair(bLid, bPhone, Dinz.user.name || global.botname || '', Dinz);
        }
    }

    if (m.key) {
        m.id = m.key.id
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isBaileys = m.id ? (m.id.startsWith('BAE5') && m.id.length === 16) : false

        m.isBot = ['HSK', 'BAE', 'B1E', '3EB0', 'B24E', 'WA'].some(a => m.id.startsWith(a) && [12, 16, 20, 22, 40].includes(m.id.length)) || /(.)\1{5,}|[^a-zA-Z0-9]|[^0-9A-F]/.test(m.id) || false

        m.isGroup = m.chat.endsWith('@g.us')
        const rawSenderJid = Dinz.decodeJid(m.fromMe && Dinz.user.id || m.key.participant || m.chat || '')
        m.rawSender = rawSenderJid
        m.sender = rawSenderJid
        m.senderLid = rawSenderJid.endsWith('@lid') ? rawSenderJid : ''

        const altPart = m.key.participantAlt || m.participantPn || m.key.remoteJidAlt || ''
        if (altPart && rawSenderJid) {
            if (rawSenderJid.endsWith('@lid') && altPart.includes('@s.whatsapp.net')) {
                recordLidPair(rawSenderJid, altPart, m.pushName || '', Dinz);
                m.senderLid = rawSenderJid;
            } else if (altPart.endsWith('@lid') && rawSenderJid.includes('@s.whatsapp.net')) {
                recordLidPair(altPart, rawSenderJid, m.pushName || '', Dinz);
                m.senderLid = Dinz.decodeJid(altPart);
            }
        }

        if (m.isGroup) {
            try {
                m.metadata = Dinz.safeGroupMetadata ? await Dinz.safeGroupMetadata(m.chat) : await Dinz.groupMetadata(m.chat);
            } catch {
                m.metadata = {};
            }

            if (m.metadata?.participants) {
                recordLidMapping(m.metadata.participants, m.metadata, Dinz);
            }

            if (!m.senderLid) {
                m.senderLid = resolvePhoneToLid(m.sender, m.metadata);
            }

            if (m.metadata.addressingMode === 'lid' || (m.sender && m.sender.endsWith('@lid')) || (m.key.participant && m.key.participant.endsWith('@lid'))) {
                const resolvedSender = resolveLidToPhone(m.sender || m.key.participant, m.metadata);
                if (resolvedSender && !resolvedSender.endsWith('@lid')) {
                    m.key.participant = m.sender = resolvedSender;
                }
            }
        } else {
            m.rawChat = m.chat;
            if (!m.senderLid) {
                m.senderLid = resolvePhoneToLid(m.sender, null);
            }
            const altDm = (m.key?.remoteJidAlt && String(m.key.remoteJidAlt).includes('@s.whatsapp.net'))
                ? Dinz.decodeJid(m.key.remoteJidAlt)
                : '';
            if (m.sender && m.sender.endsWith('@lid')) {
                const resolvedPm = altDm || resolveLidToPhone(m.sender, null);
                if (resolvedPm && !resolvedPm.endsWith('@lid')) {
                    m.sender = resolvedPm;
                }
            }
            if (m.chat && m.chat.endsWith('@lid')) {
                const resolvedChat = altDm || resolveLidToPhone(m.chat, null);
                if (resolvedChat && !resolvedChat.endsWith('@lid')) {
                    m.chat = resolvedChat;
                    m.key.remoteJid = resolvedChat;
                }
            }
        }

        if (m.pushName && m.pushName !== 'User') {
            recordLidPair(m.senderLid, m.sender, m.pushName, Dinz);
        }

        if (m.isGroup) {
            const idx = ensureMetadataIndex(m.metadata, Dinz);
            const admins = idx?.admins || [];
            m.admins = admins;
            const checkAdmin = (jid, list) =>
                list.some(x => {
                    const cleanX = (x || '').split(':')[0];
                    const cleanJid = (jid || '').split(':')[0];
                    return cleanX === cleanJid ||
                        (cleanJid.endsWith('@s.whatsapp.net') && cleanX === cleanJid.replace('@s.whatsapp.net', '@lid')) ||
                        (cleanJid.endsWith('@lid') && cleanX === cleanJid.replace('@lid', '@s.whatsapp.net'));
                })
            m.isAdmin = checkAdmin(m.sender, m.admins)
            m.isBotAdmin = checkAdmin(botNumber, m.admins)
            m.participant = m.key.participant || ""
        }

        const ownerNums = getOwnerNumbers(Dinz);
        const senderNumOnly = (m.sender || '').split(':')[0].replace(/[^0-9]/g, '');
        const botNumOnly = botNumber.split(':')[0].replace(/[^0-9]/g, '');
        const botLidOnly = Dinz?.user?.lid ? Dinz.decodeJid(Dinz.user.lid).split(':')[0].replace(/[^0-9]/g, '') : '';
        const mappedSenderNum = global.lidMap ? global.lidMap[senderNumOnly] : null;
        const isBotSender = m.fromMe || m.key.fromMe || (botNumOnly && senderNumOnly === botNumOnly) || (botLidOnly && senderNumOnly === botLidOnly) || (mappedSenderNum && (mappedSenderNum === botNumOnly || mappedSenderNum === botLidOnly));
        m.isDeveloper = isBotSender || ownerNums.includes(senderNumOnly) || (mappedSenderNum && ownerNums.includes(mappedSenderNum)) ? true : false;
    }

    if (m.message) {
        try {
            const stickerAudioSvc = require('../services/sticker-audio');
            stickerAudioSvc.recordIncomingAudioSticker(m);
        } catch (_) {}
        try {
            const viewonceStore = require('../services/viewonce-store');
            viewonceStore.recordViewOnceMessage(m);
        } catch (_) {}
        if (m.message.deviceSentMessage?.message) {
            m.message = m.message.deviceSentMessage.message;
        }
        if (m.message.ephemeralMessage?.message) {
            m.message = m.message.ephemeralMessage.message;
        }
        m.type = getContentType(m.message) || Object.keys(m.message)[0]
        m.msg = (/viewOnceMessage|viewOnceMessageV2|viewOnceMessageV2Extension|spoilerMessage|audioStickerMessage|editedMessage|ephemeralMessage|documentWithCaptionMessage/i.test(m.type) && m.message[m.type]?.message
            ? m.message[m.type].message[getContentType(m.message[m.type].message)]
            : (extractMessageContent(m.message[m.type]) || m.message[m.type]))

        let interactiveData = {}

        if (m.msg?.interactiveResponseMessage?.paramsJson) {
            try {
                interactiveData = JSON.parse(m.msg.interactiveResponseMessage.paramsJson)
            } catch (e) {
                interactiveData = {}
            }
        }

        if (m.msg?.nativeFlowResponseMessage?.paramsJson) {
            try {
                const nativeParams = JSON.parse(m.msg.nativeFlowResponseMessage.paramsJson)
                interactiveData = { ...interactiveData, ...nativeParams }
            } catch (e) {
            }
        }

        m.interactive = interactiveData

        m.body = m.message?.conversation ||
                 m.msg?.text ||
                 m.msg?.conversation ||
                 m.msg?.caption ||
                 m.msg?.selectedButtonId ||
                 m.msg?.singleSelectReply?.selectedRowId ||
                 m.msg?.selectedId ||
                 m.msg?.contentText ||
                 m.msg?.selectedDisplayText ||
                 m.msg?.title ||
                 m.msg?.name ||
                 m.msg?.description ||
                 ''

		m.mentionedJid = (m.msg?.contextInfo?.mentionedJid || []).map(j => resolveLidToPhone(j, m.metadata));
 		m.text = m.msg?.text ||
                  m.msg?.caption ||
                  m.message?.conversation ||
                  m.msg?.contentText ||
                  m.msg?.selectedDisplayText ||
                  m.msg?.title ||
                  m.msg?.description ||
                  '';

        m.prefix = ''
        m.command = m.body ? m.body.trim().split(/ +/).shift() : ''
        m.args = m.body ? m.body.trim().split(/ +/).slice(1).filter(a => a) : []

        m.device = getDevice(m.id)
        m.expiration = m.msg?.contextInfo?.expiration || 0

        m.timestamp = (typeof m.messageTimestamp === 'number'
            ? m.messageTimestamp
            : m.messageTimestamp?.low
            ? m.messageTimestamp.low
            : m.messageTimestamp?.high) || m.msg.timestampMs * 1000

        m.isMedia = !!m.msg?.mimetype || !!m.msg?.thumbnailDirectPath || !!m.msg?.jpegThumbnail
        if (m.isMedia) {
            m.mime = m.msg?.mimetype
            m.size = m.msg?.fileLength
            m.height = m.msg?.height || ''
            m.width = m.msg?.width || ''
            if (/webp/i.test(m.mime)) {
                m.isAnimated = m.msg?.isAnimated
            }
        }

        m.quoted = m.msg?.contextInfo?.quotedMessage || null
        if (m.quoted) {
            if (m.msg?.contextInfo?.participant) {
                m.msg.contextInfo.participant = resolveLidToPhone(m.msg.contextInfo.participant, m.metadata);
            }

            m.quoted.message = extractMessageContent(m.msg?.contextInfo?.quotedMessage)
            m.quoted.type = getContentType(m.quoted.message) || Object.keys(m.quoted.message)[0]
            m.quoted.id = m.msg.contextInfo.stanzaId
            m.quoted.device = getDevice(m.quoted.id)
            m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat

            m.quoted.isBot = m.quoted.id ?
                ['HSK', 'BAE', 'B1E', '3EB0', 'B24E', 'WA'].some(a => m.quoted.id.startsWith(a) && [12, 16, 20, 22, 40].includes(m.quoted.id.length)) ||
                /(.)\1{5,}|[^a-zA-Z0-9]|[^0-9A-F]/.test(m.quoted.id) : false

            m.quoted.sender = Dinz.decodeJid(m.msg.contextInfo.participant)
            m.quoted.fromMe = m.quoted.sender === Dinz.decodeJid(Dinz.user.id)
            m.quoted.text = m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || m.quoted.description || ''
            m.quoted.msg = extractMessageContent(m.quoted.message[m.quoted.type]) || m.quoted.message[m.quoted.type]
            m.quoted.mentionedJid = (m.quoted?.msg?.contextInfo?.mentionedJid || []).map(j => resolveLidToPhone(j, m.metadata))

            m.quoted.body = m.quoted.msg?.text ||
                           m.quoted.msg?.caption ||
                           m.quoted?.message?.conversation ||
                           m.quoted.msg?.selectedButtonId ||
                           m.quoted.msg?.singleSelectReply?.selectedRowId ||
                           m.quoted.msg?.selectedId ||
                           m.quoted.msg?.contentText ||
                           m.quoted.msg?.selectedDisplayText ||
                           m.quoted.msg?.title ||
                           m.quoted?.msg?.name ||
                           m.quoted.msg?.description ||
                           ''

			m.getQuotedObj = async () => {
				if (!m.quoted.id) return false
				let q = await store.loadMessage(m.chat, m.quoted.id, Dinz)
				return await Serialize(Dinz, q, store)
			}

            m.quoted.key = {
                remoteJid: m.msg?.contextInfo?.remoteJid || m.chat,
                participant: m.quoted.sender,
                fromMe: areJidsSameUser(Dinz.decodeJid(m.msg?.contextInfo?.participant), Dinz.decodeJid(Dinz?.user?.id)),
                id: m.msg?.contextInfo?.stanzaId,
            }

            m.quoted.isGroup = m.quoted.chat.endsWith('@g.us')
            m.quoted.mentions = m.quoted.msg?.contextInfo?.mentionedJid || []

            m.quoted.prefix = ''
            m.quoted.command = m.quoted.body ? m.quoted.body.trim().split(/ +/).shift() : ''
            m.quoted.isMedia = !!m.quoted.msg?.mimetype || !!m.quoted.msg?.thumbnailDirectPath || !!m.quoted.msg?.jpegThumbnail

            if (m.quoted.isMedia) {
                m.quoted.mime = m.quoted.msg?.mimetype
                m.quoted.size = m.quoted.msg?.fileLength
                m.quoted.height = m.quoted.msg?.height || ''
                m.quoted.width = m.quoted.msg?.width || ''
                if (/webp/i.test(m.quoted.mime)) {
                    m.quoted.isAnimated = m?.quoted?.msg?.isAnimated || false
                }
            }

            m.quoted.fakeObj = proto.WebMessageInfo.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id,
                },
                message: m.quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {}),
            })

            m.quoted.download = () => Dinz.downloadMediaMessage(m.quoted)
            m.quoted.delete = () => {
                Dinz.sendMessage(m.quoted.chat, {
                    delete: {
                        remoteJid: m.quoted.chat,
                        fromMe: m.isBotAdmin ? false : true,
                        id: m.quoted.id,
                        participant: m.quoted.sender,
                    },
                })
            }
        }
    }

    m.download = () => Dinz.downloadMediaMessage(m)

    m.copy = () => Serialize(Dinz, proto.WebMessageInfo.fromObject(proto.WebMessageInfo.toObject(m)))

    m.react = (u) => Dinz.sendMessage(m.chat, { react: { text: u, key: m.key }})

    m.reply = async (content, options = {}) => {
        const { quoted = m, chat = m.chat, caption = '', ...validate } = options;

        if (typeof content === 'object') {
            return Dinz.sendMessage(chat, content, { ...options, quoted })
        } else if (typeof content === 'string') {
            try {
                if (/^https?:\/\//.test(content)) {
                    const data = await axios.get(content, { responseType: 'arraybuffer', timeout: 30000 });
                    const mime = data.headers['content-type'] || (await FileType.fromBuffer(data.data))?.mime
                    if (/gif|image|video|audio|pdf/i.test(mime)) {
                        return Dinz.sendFileUrl(chat, content, caption, quoted, options)
                    } else {
                        return Dinz.sendMessage(chat, {
                            text: content,
                            mentions: [...content.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'),
                            ...options
                        }, { quoted })
                    }
                } else {
                    return Dinz.sendMessage(chat, {
                        text: content,
                        mentions: [...content.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'),
                        ...options
                    }, { quoted })
                }
            } catch (e) {
                return Dinz.sendMessage(chat, {
                    text: content,
                    mentions: [...content.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'),
                    ...options
                }, { quoted })
            }
        }
    }

    m.pushName = m.pushName || m.verifiedBizName || 'User'

    return m
}

module.exports = {
    LoadDataBase,
    MessagesUpsert,
    Solving,
    recordLidMapping,
    recordLidPair,
    resolveLidToPhone,
    resolvePhoneToLid,
    hydrateLidCache,
    isLikelyLidNumber
}

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
});
