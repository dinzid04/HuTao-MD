require('../../settings');
require('./menu');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const chalk = require('chalk');
const moment = require("moment-timezone");
const axios = require("axios");
const botCtx = require('../core/context');
const { gamesConfig, startGame, handleGameAnswer } = require('../services/game');
const { handleExtraGameMessage } = require('../services/games-extra');
const { getBratBuffer, getBratVidBuffer, renderBratCanvas, renderBratHD, renderBratGura, renderBratAnime } = require('../services/brat');
const {
    checkLimit,
    addLimit,
    claimLimit,
    addBonusLimit,
    setUserCustomLimit,
    setDefaultDailyLimit,
    getLimitConfig,
    resetAllLimitUsage,
    getUserLimitInfo
} = require('../services/limit');
const primbon = require('../services/primbon');
const { upscaleImage, removeBackground } = require('../services/image-editor');
const { downloadCapcut } = require('../services/capcut');
const { downloadFacebook } = require('../services/facebook');
const { downloadSpotify } = require('../services/spotify');
const { setAfk } = require('../services/afk');
const { HITORI_RPG, initRpgUser } = require('../services/rpg');
const { CPANEL, initCpanelDb } = require('../services/cpanel');
const { ISLAMIC_ENGINE } = require('../services/islamic');
const { toVideo, toAudio, toPTT, toImage, toVideoFromSticker, toGif } = require('../utils/converter');
const { uploadTop4Top, uploadCatbox, uploadQuax, uploadUguu, uploadPixhost, uploadUniversalTourl, getMimeExt } = require('../services/uploader');
const { formatFancyFont, getAllFancyFonts, FONT_MAPS } = require('../services/fancy-fonts');
const { addPremiumUser, delPremiumUser, isPremiumUser, getPremiumList, formatRemainingTime } = require('../services/premium');
const amRoles = require('../services/amroles');

const { LoadDataBase } = require('../core/message');
const DataBase = require('../core/database');
const database = new DataBase();
const jadibotMgr = require('./jadibot');
const pluginLoader = require('../core/plugins');
const prefixMgr = require('../core/prefix');
const menuRenderer = require('../services/menu-renderer');
const { toBoldSans, toSmallCaps, toMono } = require('../utils/formatter');
const loadOwners = (Dinz) => {
    try {
        const owners = botCtx.getSection("owner", Dinz);
        return Array.isArray(owners) ? owners : [];
    } catch {
        return [];
    }
};

const resolveTargetNumber = (raw, m) => {
    if (!raw) return '';
    let clean = String(raw).split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (!clean) return '';
    if (global.lidMap && global.lidMap[clean]) {
        return global.lidMap[clean];
    }
    if (m?.metadata?.participants) {
        for (const p of m.metadata.participants) {
            const fields = [p.id, p.jid, p.lid, p.phoneNumber].filter(Boolean).map(x => String(x).split('@')[0].split(':')[0].replace(/[^0-9]/g, ''));
            if (fields.includes(clean)) {
                for (const f of [p.jid, p.id, p.phoneNumber, p.lid].filter(Boolean)) {
                    const str = String(f);
                    if (str.includes('@s.whatsapp.net')) {
                        const phone = str.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                        if (phone) {
                            if (global.lidMap) global.lidMap[clean] = phone;
                            return phone;
                        }
                    }
                }
                for (const f of [p.jid, p.id, p.phoneNumber, p.lid].filter(Boolean)) {
                    const str = String(f);
                    if (!str.includes('@lid')) {
                        const phone = str.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                        if (phone && phone !== clean) {
                            if (global.lidMap) global.lidMap[clean] = phone;
                            return phone;
                        }
                    }
                }
            }
        }
    }
    return clean;
};

const getTargetNumber = (m, fallbackText) => {
    const raw = m?.mentionedJid?.[0] || m?.quoted?.sender || fallbackText || '';
    return resolveTargetNumber(raw, m);
};

const getSenderNumber = (m) => resolveTargetNumber(m?.sender || m?.key?.participant || '', m);

function loadLists(Dinz) {
    try {
        const data = botCtx.getSection('lists', Dinz);
        return data && typeof data === 'object' ? data : {};
    } catch (e) {
        return {};
    }
}

function saveLists(data, Dinz) {
    botCtx.setSection('lists', data, Dinz);
}

function loadListSettings(Dinz) {
    try {
        const data = botCtx.getSection('list_settings', Dinz);
        return data && typeof data === 'object' ? data : {};
    } catch (e) {
        return {};
    }
}

function saveListSettings(data, Dinz) {
    botCtx.setSection('list_settings', data, Dinz);
}

function getListWithTemplate(chatId, userName, groupName, listItems) {
    const settings = loadListSettings();
    const chatSettings = settings[chatId];
    const sortedItems = [...listItems].sort((a, b) => {
        return a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
    });

    if (!chatSettings || !chatSettings.template) {
        let defaultText = `\`⌜ DAFTAR LIST ⌟\`\n`;
        sortedItems.forEach((item, index) => {
            defaultText += `${chatSettings?.prefix || "> ◦"} ${item.name}\n`;
        });
        defaultText += `\nKetik nama item untuk melihat detail`;
        return defaultText;
    }

    const now = moment().tz('Asia/Jakarta');
    const hour = now.hour();
    let waktuHari = '';

    if (hour >= 0 && hour < 5) waktuHari = 'Dini Hari';
    else if (hour >= 5 && hour < 10) waktuHari = 'Pagi';
    else if (hour >= 10 && hour < 15) waktuHari = 'Siang';
    else if (hour >= 15 && hour < 18) waktuHari = 'Sore';
    else if (hour >= 18 && hour < 24) waktuHari = 'Malam';

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const tanggalLengkap = `${dayNames[now.day()]}, ${now.date()} ${monthNames[now.month()]} ${now.year()}`;

    let template = chatSettings.template;
    template = template
        .replace(/@name/g, userName || 'User')
        .replace(/@group/g, groupName || 'Grup')
        .replace(/@time/g, now.format('HH:mm:ss'))
        .replace(/@date/g, now.format('DD/MM/YYYY'))
        .replace(/@fulldate/g, tanggalLengkap)
        .replace(/@daytime/g, waktuHari)
        .replace(/@prefix\s+[^\n]+/gi, '')
        .replace(/^([^\n]*?)@x/gm, (_, linePrefix) => {
            const inlinePref = String(linePrefix || '').trim();
            const pref = chatSettings?.prefix !== undefined
                ? chatSettings.prefix
                : (inlinePref || '> ◦');
            const separator = pref.endsWith(' ') ? '' : ' ';
            return sortedItems.map((item) => `${pref}${separator}${item.name}`).join('\n');
        });

    return template.trim();
}

async function downloadAndSaveMedia(m, type = 'image') {
    try {
        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
        const mediaBuffer = await downloadContentFromMessage(m.message[`${type}Message`], type);
        let buffer = Buffer.from([]);
        for await (const chunk of mediaBuffer) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        const mediaDir = botCtx.getListMediaDir();
        if (!fs.existsSync(mediaDir)) {
            fs.mkdirSync(mediaDir, { recursive: true });
        }
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        let ext = '.jpg';
        if (type === 'video') ext = '.mp4';
        else if (type === 'audio') ext = '.mp3';
        else if (type === 'sticker') ext = '.webp';
        else if (type === 'document') ext = '.bin';

        const filename = `${timestamp}_${random}${ext}`;
        const filepath = path.join(mediaDir, filename);
        fs.writeFileSync(filepath, buffer);
        return filepath;
    } catch (error) {
        throw error;
    }
}

async function uploadToCDN(buffer, mimeType) {
    try {
        const { uploadUniversalTourl } = require('../services/uploader');
        const res = await uploadUniversalTourl(buffer, mimeType);
        if (res && res.url) return res.url;
        return null;
    } catch (e) {
        console.error('[Upload CDN Error]', e.message);
        return null;
    }
}

function loadBadwords(Dinz) {
    try {
        const data = botCtx.getSection('badwords', Dinz);
        return (data && Array.isArray(data.words)) ? data : { words: [] };
    } catch (e) {
        return { words: [] };
    }
}

function saveBadwords(data, Dinz) {
    botCtx.setSection('badwords', data, Dinz);
}

function getSewaNotified(Dinz) {
    try {
        const data = botCtx.getSection('sewa_notified', Dinz);
        return data && typeof data === 'object' ? data : {};
    } catch (e) {
        return {};
    }
}

function saveSewaNotified(data, Dinz) {
    try {
        botCtx.setSection('sewa_notified', data, Dinz);
    } catch (e) {}
}

const getValidCommands = () => pluginLoader.getValidCommands();
const getValidCommandsSet = () => (pluginLoader.getValidCommandsSet ? pluginLoader.getValidCommandsSet() : new Set(pluginLoader.getValidCommands()));
const limitSvcCached = require('../services/limit');
const chessPvpCached = require('../services/chess-pvp');
const stlyModCached = require('../services/stickerly');
const FREE_LIMIT_CMDS = new Set([
    'menu', 'allmenu', 'listmenu', 'help', 'limit', 'ceklimit', 'claim',
    'buylimit', 'belilimit', 'shoplimit', 'shop', 'me', 'profile', 'profil',
    'leaderboard', 'lb', 'toprpg', 'top', 'ping', 'owner', 'developer', 'dev',
    'ownerblog', 'bioowner', 'pay', 'payment', 'list', 'ceksetup', 'cekcloner',
    'setlimit', 'limitmode', 'setlimitmode', 'setlimitharian', 'resetlimitall',
    'addlimit', 'dellimit', 'daily', 'weekly', 'monthly', 'kerja', 'nguli',
    'mulung', 'beg', 'nabung', 'tarik', 'atm', 'setblog', 'setam'
]);

const handler = async (Dinz, m, chatUpdate, store) => {
    return botCtx.runWithBotContext(Dinz, async () => {
    try {
        await LoadDataBase(Dinz, m)
        const botNumber = await Dinz.decodeJid(Dinz.user.id)
		const body = ((m.type === 'conversation') ? m.message.conversation :
		(m.type == 'imageMessage') ? m.message.imageMessage.caption :
		(m.type == 'videoMessage') ? m.message.videoMessage.caption :
		(m.type == 'audioMessage') ? (m.message.audioMessage.caption || '') :
		(m.type == 'extendedTextMessage') ? m.message.extendedTextMessage.text :
		(m.type == 'reactionMessage') ? m.message.reactionMessage.text :
		(m.type == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId :
		(m.type == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId :
		(m.type == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId :
		(m.type == 'interactiveResponseMessage') ? (m.interactive?.id || (m.message?.interactiveResponseMessage?.nativeFlowResponseMessage ? (() => { try { return JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id || '' } catch { return '' } })() : '')) :
		(m.type == 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || '') :
		(m.type == 'editedMessage') ? (m.message.editedMessage?.message?.protocolMessage?.editedMessage?.extendedTextMessage?.text || m.message.editedMessage?.message?.protocolMessage?.editedMessage?.conversation || '') :
		(m.type == 'protocolMessage') ? (m.message.protocolMessage?.editedMessage?.extendedTextMessage?.text || m.message.protocolMessage?.editedMessage?.conversation || m.message.protocolMessage?.editedMessage?.imageMessage?.caption || m.message.protocolMessage?.editedMessage?.videoMessage?.caption || '') : (m.body || '')) || m.body || '';

        const validCommandsList = getValidCommands();
        const validCommands = validCommandsList;
        const validCommandsSet = getValidCommandsSet();
		const getQuoted = (m.quoted || m)
		const quoted = (getQuoted.type == 'buttonsMessage') ? getQuoted[Object.keys(getQuoted)[1]] : (getQuoted.type == 'templateMessage') ? getQuoted.hydratedTemplate[Object.keys(getQuoted.hydratedTemplate)[1]] : (getQuoted.type == 'product') ? getQuoted[Object.keys(getQuoted)[0]] : m.quoted ? m.quoted : m
		const senderNumber = (m.sender || '').split(':')[0].replace(/[^0-9]/g, '')
		const botNumberOnly = botNumber.split(':')[0].replace(/[^0-9]/g, '')
		const botLidOnly = Dinz?.user?.lid ? Dinz.decodeJid(Dinz.user.lid).split(':')[0].replace(/[^0-9]/g, '') : ''
		const ownerNumbers = [global.owner, ...(loadOwners() || [])].map(v => String(v).replace(/[^0-9]/g, '')).filter(Boolean)
		if (Dinz.isJadibot) {
			const jNum = Dinz.jadibotNumber || '';
			const jOwner = Dinz.jadibotConfig?.owner ? String(Dinz.jadibotConfig.owner).replace(/[^0-9]/g, '') : '';
			if (jOwner && !ownerNumbers.includes(jOwner)) ownerNumbers.push(jOwner);
			try {
				const jOwners = jadibotMgr.getJadibotOwners(jNum) || [];
				for (const o of jOwners) {
					const clean = String(o).replace(/[^0-9]/g, '');
					if (clean && !ownerNumbers.includes(clean)) ownerNumbers.push(clean);
				}
			} catch (e) {}
		}
		const mappedSenderNum = global.lidMap ? global.lidMap[senderNumber] : null

		const isBotSender = m.key.fromMe || m.fromMe || (botNumberOnly && senderNumber === botNumberOnly) || (botLidOnly && senderNumber === botLidOnly) || (mappedSenderNum && (mappedSenderNum === botNumberOnly || mappedSenderNum === botLidOnly));
		const isOwnerSender = isBotSender || ownerNumbers.includes(senderNumber) || m.isDeveloper || (mappedSenderNum && ownerNumbers.includes(mappedSenderNum));
		const isCreator = isOwner = isOwnerSender ? true : false

        const isButtonReply = [
            'buttonsResponseMessage',
            'listResponseMessage',
            'templateButtonReplyMessage',
            'interactiveResponseMessage'
        ].includes(m.type) || Boolean(m.interactive?.id);
        const parsedCmd = prefixMgr.parseCommand(body, validCommandsSet, global.db?.settings, isCreator, isButtonReply);
        let isCmd = parsedCmd.isCmd;
        let command = parsedCmd.command;
        let args = parsedCmd.args;
        const usedPrefix = parsedCmd.usedPrefix || prefixMgr.getDisplayPrefix(global.db?.settings);

		const mainOwnersList = (() => {
			try {
				const extra = botCtx.getMainSection('owner');
				return [botCtx.getMainOwner(), ...(Array.isArray(extra) ? extra : [])]
					.map(v => String(v).replace(/[^0-9]/g, ''))
					.filter(Boolean);
			} catch (e) {
				return [String(botCtx.getMainOwner() || '').replace(/[^0-9]/g, '')].filter(Boolean);
			}
		})();
		const isMainOwner = (!Dinz.isJadibot && isBotSender) || mainOwnersList.includes(senderNumber) || m.isDeveloper || (mappedSenderNum && mainOwnersList.includes(mappedSenderNum));
		const isPrem = isPremiumUser(m.sender, isCreator);
		const text = q = args.join(' ')
		const mime = (quoted.msg || quoted).mimetype || ''
		const qmsg = (quoted.msg || quoted)

		const example = (teks) => {
			return `\`📌 ${toBoldSans('CONTOH PENGGUNAAN')}\`\n> ${toMono(`${usedPrefix}${command}`)} ${teks}`;
		}

		const Reply = async (teks, mentions = []) => {
			const payload = { text: teks };
			if (Array.isArray(mentions) && mentions.length > 0) {
				payload.contextInfo = { mentionedJid: mentions };
			}
			return Dinz.sendMessage(m.chat, payload, { quoted: m });
		}

		if (isCmd && jadibotMgr.isSensitiveBlocked(Dinz, m, command)) {
			const blockMsg = typeof jadibotMgr.getSensitiveBlockMessage === 'function'
				? jadibotMgr.getSensitiveBlockMessage(Dinz, m, command)
				: '🔒 Fitur ini tidak tersedia untuk jadibot';
			return Reply(blockMsg || '🔒 Fitur ini tidak tersedia untuk jadibot');
		}

		if (isCmd && command) {
			const disabledCmds = botCtx.getRootDb()?.settings?.disabledCommands;
			if (Array.isArray(disabledCmds) && disabledCmds.includes(String(command).toLowerCase())) {
				return Reply(`⛔ *Fitur Dinonaktifkan*\n> ◦ Command *${command}* sedang dinonaktifkan sementara oleh Owner.`);
			}
		}

		if (isCmd && Dinz.isJadibot && typeof jadibotMgr.checkClonerBroadcastCooldown === 'function') {
			const cdCheck = jadibotMgr.checkClonerBroadcastCooldown(Dinz, command);
			if (cdCheck && cdCheck.blocked) {
				return Reply(cdCheck.message);
			}
		}

		if (isCmd) {
			const logTime = moment().tz(global.db?.settings?.timezone || global.timezone || 'Asia/Jakarta').format('HH:mm:ss');
			const roleBadge = isCreator
				? chalk.bgHex('#E63946').white.bold(' OWNER ')
				: isPrem
					? chalk.bgHex('#D97706').white.bold(' PREM ')
					: chalk.bgHex('#2563EB').white.bold(' USER ');
			const selfBadge = m.fromMe ? chalk.bgHex('#059669').white.bold(' SELF-WA ') : '';
			const locLabel = m.isGroup
				? `${chalk.hex('#38BDF8').bold(m.metadata?.subject || 'Group')} ${chalk.hex('#64748B')(`(${m.chat})`)}`
				: `${chalk.hex('#A78BFA').bold('Private Chat')} ${chalk.hex('#64748B')(`(${m.chat})`)}`;
			const msgPreview = String(body || '').replace(/\s+/g, ' ').trim().slice(0, 90);
			const contactName = m.pushName || 'User';
			const jidDisplay = m.sender || '-';
			const lidDisplay = m.senderLid || (global.phoneToLidMap?.[senderNumber] ? `${global.phoneToLidMap[senderNumber]}@lid` : '-');
			const devDisplay = m.fromMe ? 'paired-wa' : (m.device || 'unknown');
			const borderC = chalk.hex('#475569');
			const lbl = chalk.hex('#94A3B8');

			console.log(
				borderC('╭─ ') + chalk.hex('#FFD166').bold(logTime) + borderC(' ─ ') +
				roleBadge + (selfBadge ? ' ' + selfBadge : '') + ' ' +
				chalk.hex('#06D6A0').bold(`${usedPrefix}${command}`) + '\n' +
				borderC('│ ') + lbl('Kontak  : ') + chalk.white.bold(contactName) + chalk.hex('#64748B')(` (${devDisplay})`) + '\n' +
				borderC('│ ') + lbl('JID     : ') + chalk.hex('#38BDF8')(jidDisplay) + '\n' +
				borderC('│ ') + lbl('LID     : ') + chalk.hex('#C084FC')(lidDisplay) + '\n' +
				borderC('│ ') + lbl('Lokasi  : ') + locLabel + '\n' +
				borderC('│ ') + lbl('Pesan   : ') + chalk.hex('#E2E8F0')(msgPreview || '-') + '\n' +
				borderC('╰──────────────────────────────────────────────────────')
			);
		}

        if (body && typeof body === 'string' && body.trim().length > 0 && !m.isBaileys) {
            const isChessHandled = !isCmd ? await chessPvpCached.handleQuickChessMove(Dinz, m, body, botCtx.getBotIdentity(Dinz).botname || global.botname) : false;
            if (isChessHandled) return;
            const isExtraGameHandled = !isCmd ? await handleExtraGameMessage(Dinz, m, body) : false;
            if (isExtraGameHandled) return;
            const isGameHandled = await handleGameAnswer(Dinz, m, body, isCmd, command);
            if (isGameHandled) return;
        }

        if (!isCmd && m.isGroup && body && typeof body === 'string' && body.trim().length > 0 && !m.isBaileys) {
          const chatId = m.chat;
          let listDb = loadLists();
          let listGrup = listDb[chatId] || [];

          if (listGrup.length > 0) {
            const searchText = body.toLowerCase().trim();
            let cari = listGrup.find(item =>
              item.name.toLowerCase() === searchText
            );

            if (cari) {
              if (cari.hasImage && cari.image && fs.existsSync(cari.image)) {
                const ext = cari.image.split('.').pop().toLowerCase();
                let payload = {};
                if (ext === 'mp4') {
                    payload = { video: fs.readFileSync(cari.image), caption: cari.desc };
                } else if (ext === 'mp3' || ext === 'ogg' || ext === 'm4a') {
                    payload = { audio: fs.readFileSync(cari.image), mimetype: 'audio/mpeg', ptt: false };
                } else if (ext === 'webp') {
                    payload = { sticker: fs.readFileSync(cari.image) };
                } else {
                    payload = { image: fs.readFileSync(cari.image), caption: cari.desc };
                }

                await Dinz.sendMessage(m.chat, payload, { quoted: m });
                if ((ext === 'mp3' || ext === 'ogg' || ext === 'm4a' || ext === 'webp') && cari.desc && cari.desc.trim() !== '') {
                    await Dinz.sendMessage(m.chat, { text: cari.desc }, { quoted: m });
                }
              } else {
                await Dinz.sendMessage(m.chat, { text: cari.desc }, { quoted: m });
              }
            }
          }
        }

        const formatWithPrefix = (text) => {
            if (!text) return '';
            return text;
        };

        const menureply = async (categoryTeks = '', options = {}) => {
            return menuRenderer.sendStyledMenu({
                Dinz,
                m,
                botCtx,
                prefixMgr,
                validCommandsList,
                isCreator,
                isPrem,
                getUserLimitInfo,
                categoryTeks: categoryTeks ? formatWithPrefix(categoryTeks) : '',
                options
            });
        };

        const sendMenuAudio = async () => {
            try {
                const dbAudioFlag = global.db?.settings?.audiomenu;
                const isAudioActive = (typeof dbAudioFlag === 'boolean')
                    ? dbAudioFlag
                    : ((typeof global.audiomenu !== 'undefined') ? (global.audiomenu === true) : true);
                if (!isAudioActive) {
                    console.log('[AudioMenu] Audio menu dinonaktifkan (audiomenu === false)');
                    return;
                }

                const primaryDir = botCtx.getAudioMenuDir(Dinz);
                const fallbackDir = path.join(process.cwd(), 'assets', 'media');
                const candidates = ['menu.ogg', 'menu.mp3', 'menu.m4a'];

                let audioPath = '';
                for (const f of candidates) {
                    const p = path.join(primaryDir, f);
                    if (fs.existsSync(p)) { audioPath = p; break; }
                }
                if (!audioPath && primaryDir !== fallbackDir) {
                    for (const f of candidates) {
                        const p = path.join(fallbackDir, f);
                        if (fs.existsSync(p)) { audioPath = p; break; }
                    }
                }

                if (!audioPath) {
                    console.log('[AudioMenu] File audio menu tidak ditemukan di:', primaryDir, fallbackDir);
                    return;
                }

                const stat = fs.statSync(audioPath);
                if (!(global._audioMenuCache instanceof Map)) {
                    global._audioMenuCache = new Map();
                }
                let cached = global._audioMenuCache.get(audioPath);
                if (!cached || cached.mtime !== stat.mtimeMs || !cached.buffer) {
                    const buffer = fs.readFileSync(audioPath);
                    const isOgg = audioPath.endsWith('.ogg');
                    cached = {
                        path: audioPath,
                        mtime: stat.mtimeMs,
                        buffer,
                        isOgg,
                        mimetype: isOgg ? 'audio/ogg; codecs=opus' : audioPath.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg'
                    };
                    global._audioMenuCache.set(audioPath, cached);
                }

                await new Promise(r => setTimeout(r, 150));

                const audioPayload = {
                    audio: cached.buffer,
                    mimetype: cached.mimetype,
                    ptt: cached.isOgg
                };

                console.log(`[AudioMenu] Mengirim audio menu (${path.basename(cached.path)}) ke ${m.chat}`);

                let sent = false;
                if (m && m.key && !m.key.fromMe) {
                    try {
                        await Dinz.sendMessage(m.chat, audioPayload, { quoted: m });
                        sent = true;
                    } catch (quoteErr) {
                        console.log('[AudioMenu] Quoted send failed, retrying unquoted:', quoteErr.message);
                    }
                }
                if (!sent) {
                    await Dinz.sendMessage(m.chat, audioPayload).catch((e) => {
                        console.log('[AudioMenu] Unquoted send error:', e.message);
                    });
                }
            } catch (err) {
                console.log('[AudioMenu] sendMenuAudio error:', err.message);
            }
        };

        const sendMenuCard = menureply;
        const replyWithImageMenu = menureply;

        const sendSelectList = async ({ title, buttonTitle, captionText, rows, headerImage }) => {
            const identity = botCtx.getBotIdentity(Dinz);
            const imageUrl = headerImage || identity.image?.menu || global.image?.menu || 'https://image2url.com/r2/default/images/1773625179709-bccac35a-f5a7-4722-88a3-d2fe955d8526.jpg';
            const senderJid = String(m.sender || '').replace(/:\d+@/, '@');
            const senderTag = senderJid.split('@')[0].split(':')[0];
            const botname = identity.botname || global.botname || 'HuTao - MD';
            const fullCaption = captionText || '';
            const hasSenderMention = Boolean(senderTag && fullCaption.includes(`@${senderTag}`));
            const selectMentions = hasSenderMention && senderJid ? [senderJid] : [];

            const sections = [
                {
                    title: toSmallCaps(title || 'Daftar Pilihan'),
                    rows: rows
                }
            ];

            try {
                const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
                const https = require('https');
                const axios = require('axios');
                let imageBuffer = null;
                try {
                    const res = await axios.get(imageUrl, {
                        responseType: 'arraybuffer',
                        timeout: 20000,
                        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                        validateStatus: () => true
                    });
                    if (res.status === 200 && res.data && res.data.length) {
                        imageBuffer = Buffer.from(res.data);
                    }
                } catch (e) {
                    console.log('sendSelectList image download error:', e?.message || e);
                }
                let media = imageBuffer
                    ? await prepareWAMessageMedia({ image: imageBuffer }, { upload: Dinz.waUploadToServer })
                    : await prepareWAMessageMedia({ image: { url: imageUrl } }, { upload: Dinz.waUploadToServer });
                let msg = await generateWAMessageFromContent(m.chat, {
                    viewOnceMessage: {
                        message: {
                            interactiveMessage: proto.Message.InteractiveMessage.create({
                                ...(selectMentions.length ? { contextInfo: { mentionedJid: selectMentions } } : {}),
                                body: proto.Message.InteractiveMessage.Body.create({
                                    text: fullCaption
                                }),
                                footer: proto.Message.InteractiveMessage.Footer.create({
                                    text: `© ${toSmallCaps(botname)}`
                                }),
                                header: proto.Message.InteractiveMessage.Header.create({
                                    hasMediaAttachment: true,
                                    imageMessage: media.imageMessage
                                }),
                                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                    buttons: [
                                        {
                                            name: "single_select",
                                            buttonParamsJson: JSON.stringify({
                                                title: buttonTitle || toSmallCaps('Pilih Menu'),
                                                sections: sections
                                            })
                                        }
                                    ]
                                })
                            })
                        }
                    }
                }, { quoted: m });
                await Dinz.relayMessage(m.chat, msg.message, { messageId: msg.key.id, AI: false });
            } catch (err) {
                console.log('sendSelectList error:', err?.message || err);
                try {
                    const https = require('https');
                    const axios = require('axios');
                    let imageBuffer = null;
                    try {
                        const res = await axios.get(imageUrl, {
                            responseType: 'arraybuffer',
                            timeout: 20000,
                            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                            validateStatus: () => true
                        });
                        if (res.status === 200 && res.data && res.data.length) {
                            imageBuffer = Buffer.from(res.data);
                        }
                    } catch (e) {}
                    const fallbackCtx = selectMentions.length ? { contextInfo: { mentionedJid: selectMentions } } : {};
                    if (imageBuffer) {
                        await Dinz.sendMessage(m.chat, {
                            image: imageBuffer,
                            caption: fullCaption,
                            ...fallbackCtx
                        }, { quoted: m });
                    } else {
                        await Dinz.sendMessage(m.chat, {
                            image: { url: imageUrl },
                            caption: fullCaption,
                            ...fallbackCtx
                        }, { quoted: m });
                    }
                } catch (err2) {
                    const fallbackCtx = selectMentions.length ? { contextInfo: { mentionedJid: selectMentions } } : {};
                    await Dinz.sendMessage(m.chat, {
                        text: fullCaption,
                        ...fallbackCtx
                    }, { quoted: m });
                }
            }
        };

        const pendingJbPrompt = jadibotMgr.getPendingJadibotPrompt(m.chat, senderNumber);
        if (pendingJbPrompt && pendingJbPrompt.step === 'wait_botname' && pendingJbPrompt.lastMsgId !== m.key.id && !isCmd && body && typeof body === 'string' && body.trim().length > 0 && !m.isBaileys) {
            if (Dinz.isJadibot) await new Promise(r => setTimeout(r, 150));
            if (!jadibotMgr.claimCommandExecution(m.key.id)) return;
            jadibotMgr.clearPendingJadibotPrompt(m.chat, senderNumber);
            const inputName = body.trim();
            if (['batal', 'cancel'].includes(inputName.toLowerCase())) {
                return Reply(`❌ Perubahan nama bot jadibot dibatalkan.`);
            }
            const res = jadibotMgr.autoConfigureClone(pendingJbPrompt.targetNumber, inputName, {
                requester: senderNumber,
                pushName: m.pushName
            });
            return Reply(res.ok ? res.message : `❌ ${res.message}`);
        }

        if (!isCmd) {
            global._amVerifState = global._amVerifState || {};
            const amKey = getSenderNumber(m) || m.sender;
            const amSt = global._amVerifState[amKey];
            if (amSt && amSt.step === 'wait_link' && body && typeof body === 'string') {
                const linkMatch = body.trim().match(/https?:\/\/\S+/i);
                if (!linkMatch) return;
                if (amSt.lastMsgId === m.key.id) return;
                amSt.lastMsgId = m.key.id;
                const link = linkMatch[0];
                const email = amSt.email;
                delete global._amVerifState[amKey];

                await Reply(global.mess.wait);
                try {
                    const amEngine = require('../services/am-engine');
                    const vRes = await amEngine.verifyAmLink(email, link);
                    const statusIcon = vRes.ok ? '✅ Berhasil' : '❌ Gagal';
                    const detail = vRes.message ? `\n> ◦ Info : *${vRes.message}*` : '';
                    const subInfo = vRes.data?.subscription ? `\n> ◦ Subscription : *${vRes.data.subscription}*` : '';
                    await Reply(`\`⌜ AM Premium Verif ⌟\`\n> ◦ Status : *${statusIcon}*\n> ◦ Email : *${email}*${detail}${subInfo}`);
                } catch (e) {
                    const msg = e.response?.data?.message || e.message;
                    await Reply(`\`⌜ AM Premium Verif ⌟\`\n> ◦ Status : *❌ Gagal*\n> ◦ Email : *${email}*\n> ◦ Info : *${msg}*`);
                }
                return;
            }
        }

        if (!isCmd && isCreator) {
            try {
                const chSender = require('../services/channel-sender');
                const chDraft = chSender.getDraft(Dinz, m.chat, senderNumber);
                if (chDraft && chDraft.step === 'wait_ch_name' && chDraft.lastMsgId !== m.key.id && body && typeof body === 'string' && body.trim().length > 0 && !m.isBaileys) {
                    const inputName = body.trim();
                    if (['batal', 'cancel'].includes(inputName.toLowerCase())) {
                        chSender.clearDraft(Dinz, m.chat, senderNumber);
                        return Reply('❌ Pengiriman audio forward ke saluran dibatalkan.');
                    }
                    if (!chDraft.mediaPath || !fs.existsSync(chDraft.mediaPath)) {
                        chSender.clearDraft(Dinz, m.chat, senderNumber);
                        return Reply('❌ Draft audio sudah kadaluarsa. Silakan ulangi perintah kirimch.');
                    }
                    await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                    await Reply(`⏳ Mengirim audio forward dengan nama CH *"${inputName}"* ke saluran *${chDraft.chInfo.name}*...\n_⚠️ Pastikan nomor bot sudah jadi Admin di saluran tersebut._`);
                    try {
                        const buf = fs.readFileSync(chDraft.mediaPath);
                        await chSender.sendAudioToChannel(Dinz, chDraft.chInfo.id, buf, {
                            mode: 'forward',
                            customChName: inputName,
                            asFileMp3: chDraft.asFileMp3,
                            extHint: chDraft.extHint || 'mp3'
                        });
                        chSender.clearDraft(Dinz, m.chat, senderNumber);
                        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                        return Reply(
                            `\`✅ AUDIO FORWARD CH TERKIRIM\`\n` +
                            `> ◦ *Saluran Tujuan :* ${chDraft.chInfo.name}\n` +
                            `> ◦ *Nama CH Custom :* ${inputName}\n` +
                            `> ◦ *Format :* ${chDraft.asFileMp3 ? 'Audio MP3' : 'Voice Note (Opus)'}`
                        );
                    } catch (chErr) {
                        chSender.clearDraft(Dinz, m.chat, senderNumber);
                        await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                        return Reply(`❌ Gagal mengirim audio ke saluran *${chDraft.chInfo.name}*: ${chErr?.message || chErr}\n\n⚠️ *Pastikan nomor bot sudah menjadi Admin di saluran tersebut!*`);
                    }
                }
            } catch (_) {}

            if (global._jpmDirectTarget?.[m.sender]) {
                const { targetJid, groupSubject } = global._jpmDirectTarget[m.sender];
                delete global._jpmDirectTarget[m.sender];

                const isMedia = /image|video/.test(mime);
                const broadcastText = body.trim();

                await Reply(global.mess.wait);
                try {
                    if (isMedia && qmsg.download) {
                        const buf = await qmsg.download();
                        if (/image/.test(mime)) {
                            await Dinz.sendMessage(targetJid, { image: buf, caption: broadcastText });
                        } else {
                            await Dinz.sendMessage(targetJid, { video: buf, caption: broadcastText, mimetype: mime });
                        }
                    } else {
                        await Dinz.sendMessage(targetJid, { text: broadcastText });
                    }
                    return Reply(`\`⌜ JPM Berhasil ⌟\`\n> ◦ Terkirim ke : *${groupSubject}*\n> ◦ Pesan : *${broadcastText || '[Media]'}*`);
                } catch (e) {
                    return Reply(`❌ Gagal kirim JPM ke ${groupSubject}: ${e.message}`);
                }
            }

            global._jpmState = global._jpmState || {};
            global._outState = global._outState || {};
            const jpmSt = global._jpmState[m.sender];
            const outSt = global._outState[m.sender];

            if (jpmSt && jpmSt.step === 'pilih_nomor' && body && /^[\d\s.,]+$/.test(body.trim())) {
                if (jpmSt.lastMsgId === m.key.id) return;
                const nomorInput = body.trim().replace(/[.,\s]+/g, ',');
                const indices = nomorInput.split(',').map(v => parseInt(v.trim()) - 1)
                    .filter(v => !isNaN(v) && v >= 0 && v < (global._jpmPilihList || []).length);

                if (indices.length === 0) return Reply("❌ Nomor tidak valid. Coba lagi.");

                const selected = indices.map(i => global._jpmPilihList[i]);
                global._jpmState[m.sender] = { step: 'tunggu_pesan', selected, chat: jpmSt.chat, lastMsgId: m.key.id };

                const namaGrup = selected.map((g, i) => `*${i+1}.* ${g.name}`).join('\n');
                return Reply(`\`⌜ Grup Dipilih ⌟\`\n> ◦ Total : *${selected.length} Grup*\n\n${namaGrup}\n\n📝 *Sekarang kirim pesan yang ingin di-broadcast:*`);
            }

            if (jpmSt && jpmSt.step === 'tunggu_pesan') {
                if (jpmSt.lastMsgId === m.key.id) return;
                const targetList = jpmSt.selected || [];
                const isMedia = /image|video/.test(mime);
                const pesanJpm = body.trim();
                let count = 0;
                const delayJpm = global.db.settings.delayJpm || 3000;

                delete global._jpmState[m.sender];

                await Reply(`\`⌜ JPM Dimulai ⌟\`\n> ◦ Target : *${targetList.length} Grup*\n> ◦ Delay : *${delayJpm}ms*`);

                for (let g of targetList) {
                    try {
                        if (isMedia && qmsg.download) {
                            const buf = await qmsg.download();
                            if (/image/.test(mime)) {
                                await Dinz.sendMessage(g.id, { image: buf, caption: pesanJpm });
                            } else {
                                await Dinz.sendMessage(g.id, { video: buf, caption: pesanJpm, mimetype: mime });
                            }
                        } else {
                            await Dinz.sendMessage(g.id, { text: pesanJpm });
                        }
                        count++;
                    } catch (e) {
                        console.error(`Gagal jpmpilih ke ${g.id}:`, e.message);
                    }
                    await new Promise(r => setTimeout(r, delayJpm));
                }

                return Reply(`\`⌜ JPM Selesai ⌟\`\n> ◦ Berhasil : *${count} Grup*\n> ◦ Gagal : *${targetList.length - count} Grup*`);
            }

            if (outSt && outSt.step === 'pilih_nomor' && body && /^[\d\s.,]+$/.test(body.trim())) {
                if (outSt.lastMsgId === m.key.id) return;
                const nomorInput = body.trim().replace(/[.,\s]+/g, ',');
                const indices = nomorInput.split(',').map(v => parseInt(v.trim()) - 1)
                    .filter(v => !isNaN(v) && v >= 0 && v < (global._outPilihList || []).length);

                if (indices.length === 0) return Reply("❌ Nomor tidak valid. Coba lagi.");

                outSt.lastMsgId = m.key.id;
                delete global._outState[m.sender];
                const selected = indices.map(i => global._outPilihList[i]);

                let count = 0;
                await Reply(`\`⌜ Keluar Grup ⌟\`\n> ◦ Target : *${selected.length} Grup*\n> ◦ Proses keluar...`);

                for (let g of selected) {
                    try {
                        await Dinz.groupLeave(g.id);
                        count++;
                    } catch (e) {}
                    await new Promise(r => setTimeout(r, 1500));
                }

                return Reply(`\`⌜ Out Pilih Selesai ⌟\`\n> ◦ Berhasil keluar : *${count} Grup*`);
            }

            if (global._blState?.[m.sender]?.step === 'pilih_nomor' && body && /^[\d\s.,]+$/.test(body.trim())) {
                if (global._blState[m.sender].lastMsgId === m.key.id) return;
                const nomorInput = body.trim().replace(/[.,\s]+/g, ',');
                const indices = nomorInput.split(',').map(v => parseInt(v.trim()) - 1)
                    .filter(v => !isNaN(v) && v >= 0 && v < (global._blPilihList || []).length);

                if (indices.length === 0) return Reply("❌ Nomor tidak valid. Coba lagi.");

                global._blState[m.sender].lastMsgId = m.key.id;
                delete global._blState[m.sender];
                const selected = indices.map(i => global._blPilihList[i]);

                let added = 0, removed = 0;
                for (let g of selected) {
                    if (!global.db.groups[g.id]) global.db.groups[g.id] = {};
                    if (global.db.groups[g.id].blacklistjpm) {
                        global.db.groups[g.id].blacklistjpm = false;
                        removed++;
                    } else {
                        global.db.groups[g.id].blacklistjpm = true;
                        added++;
                    }
                }

                return Reply(`\`⌜ Blacklist JPM ⌟\`\n> ◦ Ditambahkan : *${added} Grup*\n> ◦ Dihapus : *${removed} Grup*`);
            }

            if (global._blState?.[m.sender]?.step === 'delbl' && body && /^[\d\s.,]+$/.test(body.trim())) {
                if (global._blState[m.sender].lastMsgId === m.key.id) return;
                const blList = global._delBlList || [];
                const nomorInput = body.trim().replace(/[.,\s]+/g, ',');
                const indices = nomorInput.split(',').map(v => parseInt(v.trim()) - 1)
                    .filter(v => !isNaN(v) && v >= 0 && v < blList.length);

                if (indices.length === 0) return Reply("❌ Nomor tidak valid. Coba lagi.");

                global._blState[m.sender].lastMsgId = m.key.id;
                delete global._blState[m.sender];
                let count = 0;
                for (let idx of indices) {
                    const [jid] = blList[idx];
                    if (global.db.groups[jid]) {
                        global.db.groups[jid].blacklistjpm = false;
                        count++;
                    }
                }

                return Reply(`\`⌜ Delbl ⌟\`\n> ◦ Dihapus dari blacklist : *${count} Grup*`);
            }
        }

        let quickPickText = null;
        if (!isCmd && !m.isBaileys && body && /^\d{1,2}(\s+(?:single|satuan|pisah))?$/i.test(body.trim())) {
            const stlySession = stlyModCached.getSearchSession(Dinz, m.chat, m.sender);
            if (stlySession && stlySession.lastMsgId !== m.key.id) {
                const numPick = parseInt(body.trim().split(/\s+/)[0], 10);
                if (numPick >= 1 && numPick <= (stlySession.items || []).length) {
                    isCmd = true;
                    command = 'stikerlydl';
                    args = body.trim().split(/\s+/);
                    quickPickText = body.trim();
                }
            }
        }

        if (isCmd && command) {
            const cmdLower = String(command).toLowerCase();
            const limitSvc = limitSvcCached;
            const isExemptLimit = isCreator || isPrem || FREE_LIMIT_CMDS.has(cmdLower) || cmdLower.startsWith('menu');

            if (!isExemptLimit && limitSvc.isLimitEnabled() && checkLimit(m.sender, isCreator)) {
                const lCfg = limitSvc.getLimitConfig();
                return Reply(
                    `${global.mess.limit}\n` +
                    `> 🛒 Beli limit pakai uang RPG: \`${usedPrefix}buylimit 10\` (Rp ${(lCfg.limitPrice || 1500).toLocaleString('id-ID')}/limit)`
                );
            }

            let pluginDeductedLimit = false;
            const trackedAddLimit = (jid, creatorFlag, amt) => {
                pluginDeductedLimit = true;
                return addLimit(jid, creatorFlag, amt);
            };

            const ctx = {
                Dinz, m, chatUpdate, store, command, args,
                text: quickPickText !== null ? quickPickText : text,
                q: quickPickText !== null ? quickPickText : q,
                body,
                quoted, mime, qmsg, botNumber, senderNumber, botNumberOnly, botLidOnly,
                isCreator, isOwner, isMainOwner, isPrem, isCmd,
                Reply, example, menureply, sendMenuAudio, sendMenuCard,
                replyWithImageMenu, sendSelectList,
                getTargetNumber, getSenderNumber, resolveTargetNumber,
                loadOwners, loadLists, saveLists, loadListSettings, saveListSettings,
                getListWithTemplate, downloadAndSaveMedia, uploadToCDN,
                loadBadwords, saveBadwords, getSewaNotified, saveSewaNotified,
                validCommands, validCommandsList,
                fs, path, exec, chalk, moment, axios, botCtx, database, jadibotMgr, pluginLoader, prefixMgr, usedPrefix, menuRenderer, formatWithPrefix,
                gamesConfig, startGame, handleGameAnswer,
                getBratBuffer, getBratVidBuffer, renderBratCanvas, renderBratHD, renderBratGura, renderBratAnime,
                checkLimit, addLimit: trackedAddLimit, claimLimit, addBonusLimit, setUserCustomLimit,
                setDefaultDailyLimit, getLimitConfig, resetAllLimitUsage, getUserLimitInfo,
                primbon, upscaleImage, removeBackground,
                downloadCapcut, downloadFacebook, downloadSpotify,
                setAfk, HITORI_RPG, initRpgUser, CPANEL, initCpanelDb, ISLAMIC_ENGINE,
                toVideo, toAudio, toPTT, toImage, toVideoFromSticker, toGif,
                uploadTop4Top, uploadCatbox, uploadQuax, uploadUguu, uploadPixhost, uploadUniversalTourl, getMimeExt,
                formatFancyFont, getAllFancyFonts, FONT_MAPS,
                addPremiumUser, delPremiumUser, isPremiumUser, getPremiumList, formatRemainingTime,
                amRoles, LoadDataBase
            };
            const dispatched = await pluginLoader.dispatch(command, ctx);

            if (dispatched !== false && !pluginDeductedLimit && !isExemptLimit && limitSvc.isLimitEnabled()) {
                try { addLimit(m.sender, isCreator); } catch (_) {}
            }

            const isValidXpUser = m.sender && !m.sender.endsWith('@newsletter') && !m.sender.endsWith('@g.us') && !m.sender.includes('broadcast');
            if (dispatched !== false && isValidXpUser) {
                try {
                    const userObj = global.db.users[m.sender] || (global.db.users[m.sender] = {});
                    const xpRes = HITORI_RPG.grantCommandExp(userObj, { userKey: m.sender });

                    const isNotifActive = (() => {
                        if (m.isGroup) {
                            const grp = global.db.groups?.[m.chat];
                            if (grp && grp.levelupNotif === true) return true;
                            if (grp && grp.levelupNotifExplicit === true && grp.levelupNotif === false) return false;
                            return Boolean(global.db.settings?.levelupNotif === true);
                        }
                        return Boolean(global.db.settings?.levelupNotif === true);
                    })();

                    if (xpRes.leveledUp && isNotifActive) {
                        const senderJid = String(m.sender || '').replace(/:\d+@/, '@');
                        const senderTag = senderJid.split('@')[0].split(':')[0];
                        const statusIcon = isCreator ? 'OWNER' : (isPrem ? 'PREMIUM' : 'MEMBER');
                        const { min, xp } = HITORI_RPG.xpRange(userObj.level || 0);
                        const curExp = Math.max(0, (userObj.exp || 0) - min);
                        const pct = Math.min(100, Math.round((curExp / Math.max(1, xp)) * 100));

                        let ppUrl = '';
                        try {
                            ppUrl = await Dinz.profilePictureUrl(senderJid, 'image').catch(() => '');
                        } catch (_) {}

                        const cardBuffer = await HITORI_RPG.renderLevelCard(
                            userObj,
                            m.pushName || 'Player',
                            xpRes.beforeLevel,
                            true,
                            ppUrl,
                            statusIcon,
                            senderTag,
                            { moneyBonus: xpRes.moneyBonus }
                        ).catch(() => null);

                        const lvlCaption =
                            `\`🎉 ${toBoldSans('LEVEL UP!')}\`\n` +
                            `> ᴜsᴇʀ : @${senderTag}\n` +
                            `> ʟᴇᴠᴇʟ : ${toMono(`Lv. ${xpRes.beforeLevel} ➔ Lv. ${xpRes.afterLevel}`)}\n` +
                            `> ʀᴏʟᴇ : *${xpRes.role}*\n` +
                            `> ʙᴏɴᴜs : ${toMono(`+Rp ${xpRes.moneyBonus.toLocaleString('id-ID')}`)} ᴍᴏɴᴇʏ\n` +
                            `> ᴇxᴘ : ${toMono(`${curExp.toLocaleString('id-ID')}/${xp.toLocaleString('id-ID')} (${pct}%)`)}\n\n` +
                            `_${toSmallCaps('selamat! terus gunakan bot untuk menaikkan levelmu')}_`;

                        if (cardBuffer && Buffer.isBuffer(cardBuffer)) {
                            await Dinz.sendMessage(m.chat, {
                                image: cardBuffer,
                                caption: lvlCaption,
                                contextInfo: { mentionedJid: [senderJid] }
                            }, { quoted: m }).catch(() => {});
                        } else {
                            await Reply(lvlCaption, [senderJid]).catch(() => {});
                        }
                    }
                } catch (xpErr) {
                    console.log('[AutoEXP Error]', xpErr?.message || xpErr);
                }
            }
        }
    } catch (err) {
        console.error(err);
    }
    });
};

Object.defineProperty(handler, "validCommands", {
    get: () => pluginLoader.getValidCommands(),
    enumerable: true
});

module.exports = handler;

let file = require.resolve(__filename);
fs.unwatchFile(file);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.blue("Update"), __filename);
    delete require.cache[file];
    try {
        delete require.cache[require.resolve("../services/game")];
    } catch (e) {}
    require(file);
});
