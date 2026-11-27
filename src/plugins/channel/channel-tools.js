const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { randomBytes } = require('crypto');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const { runFfmpegFile } = require('../audio/_helper');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function extractChannelInvite(input) {
    const raw = String(input || '').trim().replace(/^<|>$/g, '');
    const m = raw.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]{10,60})/i);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{15,60}$/.test(raw) && !raw.includes('@')) return raw;
    return '';
}

async function resolveChannelJid(Dinz, input) {
    const raw = String(input || '').trim();
    if (/^\d+@newsletter$/.test(raw)) return raw;
    const code = extractChannelInvite(raw);
    if (code && typeof Dinz.newsletterMetadata === 'function') {
        const meta = await Dinz.newsletterMetadata('invite', code);
        if (meta?.id) return meta.id;
    }
    const saved = global.db?.settings?.defaultChannelId || '';
    if (/^\d+@newsletter$/.test(saved)) return saved;
    return '';
}

async function scrapeChannelInfo(code) {
    const url = `https://whatsapp.com/channel/${code}`;
    const { data } = await axios.get(url, {
        headers: { 'User-Agent': UA },
        timeout: 15000,
        responseType: 'text'
    });
    const html = String(data || '');
    const $ = cheerio.load(html);
    const og = (p) => $(`meta[property="og:${p}"]`).attr('content') || '';
    let name = og('title') || $('title').text().trim();
    const rawDesc = og('description') || $('meta[name="description"]').attr('content') || '';
    let followers = '';
    let desc = rawDesc;
    const head = rawDesc.match(/^(?:Channel|Community|Group)\s*[•·]\s*([\d.,]+\s?[KMB]?)\s*(?:followers?|pengikut)/i);
    if (head) {
        followers = head[1];
        desc = rawDesc.slice(head[0].length).replace(/^[\s•·\-–—]+/, '');
    } else {
        const f = rawDesc.match(/([\d.,]+\s?[KMB]?)\s*(?:followers?|pengikut)/i);
        if (f) followers = f[1];
    }
    if (/^whatsapp\b/i.test(name)) name = $('h1').first().text().trim() || name;
    const verified = /verified_badge|"is_verified":true|"verified":true/.test(html);
    return { name: name.trim(), followers, desc: desc.trim(), verified, image: og('image'), url };
}

module.exports = {
    name: 'channel-tools',
    category: 'channel',
    commands: [
        'idch', 'cekidch', 'channelid',
        'stalkch', 'chinfo',
        'setch', 'chcreate', 'chname', 'chdesc', 'chpp',
        'chfollow', 'chunfollow', 'chmute', 'chunmute',
        'chptv', 'chvn'
    ],

    async execute(ctx) {
        const { Dinz, m, command, text, args, quoted, qmsg, mime, isCreator, Reply, checkLimit, addLimit, usedPrefix } = ctx;
        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();

        const OWNER_ONLY = new Set(['setch', 'chcreate', 'chname', 'chdesc', 'chpp', 'chfollow', 'chunfollow', 'chmute', 'chunmute', 'chptv', 'chvn']);
        if (OWNER_ONLY.has(cmd) && !isCreator) {
            return Reply(global.mess.owner);
        }
        if (!OWNER_ONLY.has(cmd) && checkLimit(m.sender, isCreator)) {
            return Reply(global.mess.limit);
        }

        try {
            // 1. Ambil ID Saluran WA (.idch <link>)
            if (cmd === 'idch' || cmd === 'cekidch' || cmd === 'channelid') {
                const code = extractChannelInvite(args[0] || text);
                if (!code) {
                    return Reply(`📢 Masukkan link saluran WhatsApp!\n> Contoh: \`${pfx}idch https://whatsapp.com/channel/0029VbAuu0fFHWpvAZAS3d17\``);
                }
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const meta = await Dinz.newsletterMetadata('invite', code);
                if (!meta?.id) return Reply('❌ Tidak dapat menemukan ID saluran dari link tersebut.');

                const name = meta.thread_metadata?.name?.text || meta.name || 'WhatsApp Channel';
                const subs = meta.thread_metadata?.subscribers_count ?? meta.subscribers ?? '-';
                const body =
                    `\`📢 WHATSAPP CHANNEL ID\`\n` +
                    `> ◦ *Nama :* ${name}\n` +
                    `> ◦ *Pengikut :* ${subs}\n` +
                    `> ◦ *ID Saluran :* \`${meta.id}\``;

                try {
                    const msg = await generateWAMessageFromContent(m.chat, {
                        viewOnceMessage: {
                            message: {
                                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                interactiveMessage: proto.Message.InteractiveMessage.create({
                                    body: proto.Message.InteractiveMessage.Body.create({ text: body }),
                                    footer: proto.Message.InteractiveMessage.Footer.create({ text: global.botname || 'HuTao - MD' }),
                                    header: proto.Message.InteractiveMessage.Header.create({ title: '', hasMediaAttachment: false }),
                                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                        buttons: [{
                                            name: 'cta_copy',
                                            buttonParamsJson: JSON.stringify({
                                                display_text: '📋 Copy ID Channel',
                                                copy_code: meta.id
                                            })
                                        }]
                                    })
                                })
                            }
                        }
                    }, { quoted: m });
                    await Dinz.relayMessage(m.chat, msg.message, { messageId: msg.key.id, AI: false });
                } catch (_) {
                    await Reply(body);
                }
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            // 2. Stalk / Info lengkap saluran WA (.stalkch / .chinfo <link>)
            if (cmd === 'stalkch' || cmd === 'chinfo') {
                const code = extractChannelInvite(args[0] || text);
                if (!code) return Reply(`📡 Format: \`${pfx}${cmd} <link saluran WA>\``);
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

                let meta = null;
                try { meta = await Dinz.newsletterMetadata('invite', code); } catch (_) {}
                let scraped = null;
                try { scraped = await scrapeChannelInfo(code); } catch (_) {}

                if (!meta && !scraped?.name) {
                    return Reply('❌ Gagal membaca info saluran. Pastikan link saluran valid.');
                }

                const name = meta?.thread_metadata?.name?.text || meta?.name || scraped?.name || '-';
                const desc = meta?.thread_metadata?.description?.text || meta?.description || scraped?.desc || '-';
                const subs = meta?.thread_metadata?.subscribers_count ?? meta?.subscribers ?? scraped?.followers ?? '-';
                const verified = meta?.thread_metadata?.verification === 'VERIFIED' || scraped?.verified;

                const cap =
                    `\`📡 INFO SALURAN WHATSAPP\`\n` +
                    `> ◦ *Nama :* ${name}\n` +
                    (meta?.id ? `> ◦ *ID :* \`${meta.id}\`\n` : '') +
                    `> ◦ *Pengikut :* ${subs}\n` +
                    `> ◦ *Verifikasi :* ${verified ? '✅ Terverifikasi' : 'Belum'}\n` +
                    `> ◦ *Link :* https://whatsapp.com/channel/${code}\n\n` +
                    `📝 *Deskripsi:*\n${String(desc).slice(0, 600)}`;

                if (scraped?.image) {
                    try {
                        const r = await axios.get(scraped.image, { responseType: 'arraybuffer', timeout: 15000, headers: { 'User-Agent': UA } });
                        await Dinz.sendMessage(m.chat, { image: Buffer.from(r.data), caption: cap }, { quoted: m });
                        addLimit(m.sender, isCreator);
                        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                        return true;
                    } catch (_) {}
                }
                await Reply(cap);
                addLimit(m.sender, isCreator);
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
            }

            // 3. Set saluran default Owner (.setch <link/id|off>)
            if (cmd === 'setch') {
                if (!args[0]) {
                    const cur = global.db?.settings?.defaultChannelId || 'Belum diset';
                    return Reply(`📢 Saluran default saat ini: \`${cur}\`\n> Set: \`${pfx}setch <link/id saluran>\`\n> Hapus: \`${pfx}setch off\``);
                }
                if (args[0].toLowerCase() === 'off' || args[0].toLowerCase() === 'reset') {
                    global.db.settings.defaultChannelId = '';
                    return Reply('✅ Saluran default dihapus.');
                }
                const jid = await resolveChannelJid(Dinz, args[0]);
                if (!jid) return Reply('❌ Link/ID saluran tidak valid.');
                global.db.settings.defaultChannelId = jid;
                return Reply(`✅ Saluran default diset ke \`${jid}\`.\nSekarang perintah seperti \`${pfx}chname\`, \`${pfx}chdesc\`, \`${pfx}chpp\`, \`${pfx}chptv\`, \`${pfx}chvn\` bisa dipakai tanpa mengetik ulang link saluran!`);
            }

            // 4. Buat saluran WA baru (.chcreate Nama | Deskripsi)
            if (cmd === 'chcreate') {
                const [name, ...descParts] = String(text || '').split('|');
                const cleanName = (name || '').trim();
                const desc = descParts.join('|').trim();
                if (!cleanName) return Reply(`📢 Format: \`${pfx}chcreate <nama saluran> | <deskripsi>\``);
                if (typeof Dinz.newsletterCreate !== 'function') return Reply('❌ Baileys tidak mendukung newsletterCreate.');
                const created = await Dinz.newsletterCreate(cleanName, desc || undefined);
                const id = created?.id || '';
                if (id) global.db.settings.defaultChannelId = id;
                return Reply(
                    `✅ *Saluran WhatsApp berhasil dibuat!*\n` +
                    `> ◦ *Nama :* ${cleanName}\n` +
                    (id ? `> ◦ *ID :* \`${id}\` _(otomatis jadi saluran default)_\n` : '') +
                    (created?.invite ? `> ◦ *Link :* https://whatsapp.com/channel/${created.invite}` : '')
                );
            }

            // 5. Ubah Nama / Deskripsi / Foto Saluran (bot harus admin/owner saluran)
            if (cmd === 'chname') {
                const parts = String(text || '').split('|');
                let targetJid = '';
                let newName = '';
                if (parts.length >= 2) {
                    targetJid = await resolveChannelJid(Dinz, parts[0]);
                    newName = parts.slice(1).join('|').trim();
                } else {
                    targetJid = await resolveChannelJid(Dinz, '');
                    newName = String(text || '').trim();
                }
                if (!targetJid || !newName) {
                    return Reply(`📢 Format:\n> \`${pfx}chname <nama baru>\` _(pakai saluran default \`${pfx}setch\`)_\n> atau \`${pfx}chname <link/id> | <nama baru>\``);
                }
                await Dinz.newsletterUpdateName(targetJid, newName);
                return Reply(`✅ Nama saluran \`${targetJid}\` berhasil diubah menjadi *${newName}*!`);
            }

            if (cmd === 'chdesc') {
                const parts = String(text || '').split('|');
                let targetJid = '';
                let newDesc = '';
                if (parts.length >= 2) {
                    targetJid = await resolveChannelJid(Dinz, parts[0]);
                    newDesc = parts.slice(1).join('|').trim();
                } else {
                    targetJid = await resolveChannelJid(Dinz, '');
                    newDesc = String(text || '').trim();
                }
                if (!targetJid || !newDesc) {
                    return Reply(`📢 Format:\n> \`${pfx}chdesc <deskripsi baru>\`\n> atau \`${pfx}chdesc <link/id> | <deskripsi baru>\``);
                }
                await Dinz.newsletterUpdateDescription(targetJid, newDesc);
                return Reply(`✅ Deskripsi saluran \`${targetJid}\` berhasil diperbarui!`);
            }

            if (cmd === 'chpp') {
                const isImg = /image/i.test(mime || '') || m.quoted?.type === 'imageMessage' || m.type === 'imageMessage';
                const targetJid = await resolveChannelJid(Dinz, args[0] || '');
                if (!isImg || !targetJid) {
                    return Reply(`📢 Reply foto lalu ketik \`${pfx}chpp [link/id saluran]\` *(pastikan bot admin saluran)*.`);
                }
                const imgBuf = typeof qmsg?.download === 'function' ? await qmsg.download() : await Dinz.downloadMediaMessage(quoted || m);
                await Dinz.newsletterUpdatePicture(targetJid, imgBuf);
                return Reply(`✅ Foto profil saluran \`${targetJid}\` berhasil diperbarui!`);
            }

            // 6. Follow / Unfollow / Mute / Unmute Saluran
            if (cmd === 'chfollow' || cmd === 'chunfollow' || cmd === 'chmute' || cmd === 'chunmute') {
                const targetJid = await resolveChannelJid(Dinz, args[0] || '');
                if (!targetJid) return Reply(`📢 Format: \`${pfx}${cmd} <link/id saluran>\``);
                if (cmd === 'chfollow') await Dinz.newsletterFollow(targetJid);
                else if (cmd === 'chunfollow') await Dinz.newsletterUnfollow(targetJid);
                else if (cmd === 'chmute') await Dinz.newsletterMute(targetJid);
                else await Dinz.newsletterUnmute(targetJid);
                return Reply(`✅ Berhasil menjalankan *${cmd}* pada saluran \`${targetJid}\`.`);
            }

            // 7. Kirim Video Bulat PTV ke Saluran (.chptv [link/id])
            if (cmd === 'chptv') {
                const isVid = /video/i.test(mime || '') || m.quoted?.type === 'videoMessage' || m.type === 'videoMessage';
                const targetJid = await resolveChannelJid(Dinz, args[0] || '');
                if (!isVid || !targetJid) {
                    return Reply(`📹 Reply *video* lalu ketik \`${pfx}chptv [link/id saluran]\` *(bot wajib admin di saluran)*!`);
                }
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const buf = typeof qmsg?.download === 'function' ? await qmsg.download() : await Dinz.downloadMediaMessage(quoted || m);
                await Dinz.sendMessage(targetJid, { video: buf, ptv: true, mimetype: 'video/mp4' });
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return Reply(`✅ Video PTV berhasil dikirim ke saluran \`${targetJid}\`!`);
            }

            // 8. Kirim Voice Note OGG/Opus ke Saluran (.chvn [link/id])
            if (cmd === 'chvn') {
                const isAudioVid = /audio|video/i.test(mime || '') || ['audioMessage', 'videoMessage'].includes(m.quoted?.type || m.type);
                const targetJid = await resolveChannelJid(Dinz, args[0] || '');
                if (!isAudioVid || !targetJid) {
                    return Reply(`🎙️ Reply *audio/VN/video* lalu ketik \`${pfx}chvn [link/id saluran]\` *(bot wajib admin di saluran)*!`);
                }
                await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
                const rawBuf = typeof qmsg?.download === 'function' ? await qmsg.download() : await Dinz.downloadMediaMessage(quoted || m);
                const tmpDir = path.join(process.cwd(), 'tmp');
                if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
                const uid = `${Date.now()}_${randomBytes(3).toString('hex')}`;
                const inF = path.join(tmpDir, `chvn_in_${uid}`);
                const outF = path.join(tmpDir, `chvn_out_${uid}.ogg`);
                let vnBuf = rawBuf;
                try {
                    fs.writeFileSync(inF, rawBuf);
                    await runFfmpegFile(['-y', '-i', inF, '-vn', '-c:a', 'libopus', '-ac', '1', '-ar', '48000', '-b:a', '64k', '-application', 'voip', outF]);
                    if (fs.existsSync(outF)) vnBuf = fs.readFileSync(outF);
                } finally {
                    try { if (fs.existsSync(inF)) fs.unlinkSync(inF); } catch (_) {}
                    try { if (fs.existsSync(outF)) fs.unlinkSync(outF); } catch (_) {}
                }
                await Dinz.sendMessage(targetJid, { audio: vnBuf, mimetype: 'audio/ogg; codecs=opus', ptt: true });
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return Reply(`✅ Voice Note berhasil dikirim ke saluran \`${targetJid}\`!`);
            }
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal menjalankan \`${pfx}${cmd}\`: ${err?.message || err}\n> Pastikan bot adalah admin di saluran target.`);
        }
        return true;
    }
};
