const https = require('https');
const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const richMessage = require('../../services/rich-message');

function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function fetchOwnerPhotoBuffer(Dinz, axios, customUrl, ownerJid) {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const urls = [];
    if (customUrl && /^https?:\/\//i.test(customUrl)) urls.push(customUrl);
    if (typeof Dinz?.profilePictureUrl === 'function' && ownerJid) {
        try {
            const pp = await Promise.race([
                Dinz.profilePictureUrl(ownerJid, 'image'),
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
            ]);
            if (pp) urls.push(pp);
        } catch (_) {}
    }
    if (global.image?.menu) urls.push(global.image.menu);

    for (const u of urls) {
        try {
            const res = await axios.get(u, { responseType: 'arraybuffer', timeout: 8000, httpsAgent, validateStatus: () => true });
            if (res.status === 200 && res.data && res.data.length > 200) {
                return { buffer: Buffer.from(res.data), url: u };
            }
        } catch (_) {}
    }
    return { buffer: null, url: '' };
}

function buildOwnerBlogHtml({ ownerName, botname, slogan, waNum, igUser, igUrl, email, photoDataUri }) {
    const initials = (ownerName || 'OW').slice(0, 2).toUpperCase();
    const avatarHtml = photoDataUri
        ? `<img src="${photoDataUri}" alt="Owner" class="av-img"/>`
        : `<div class="av-fallback">${escapeHtml(initials)}</div>`;

    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(ownerName)} — Owner Blog</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0e1117;color:#f1f5f9;padding:16px}
.wrap{max-width:440px;margin:0 auto;background:#161b26;border:1px solid #263042;border-radius:20px;overflow:hidden}
.cover{height:82px;background:linear-gradient(120deg,#1e293b,#0f172a 60%,#1e3a5f);position:relative;border-bottom:1px solid #263042}
.badge{position:absolute;top:14px;right:14px;background:rgba(16,185,129,.16);color:#34d399;border:1px solid rgba(52,211,153,.35);font-size:10px;font-weight:800;letter-spacing:.8px;padding:4px 10px;border-radius:99px}
.profile{padding:0 20px 20px;margin-top:-44px;text-align:center}
.av-ring{width:88px;height:88px;margin:0 auto 12px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#e5b85c,#38bdf8)}
.av-img,.av-fallback{width:100%;height:100%;border-radius:50%;object-fit:cover;background:#1e293b;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;color:#f8fafc}
.name{font-size:22px;font-weight:800;color:#fff;letter-spacing:-.2px}
.role{font-size:12px;color:#e5b85c;font-weight:700;margin-top:3px;letter-spacing:.6px;text-transform:uppercase}
.slogan{margin-top:12px;background:#11151e;border:1px solid #222a3a;border-radius:12px;padding:11px 14px;font-size:13px;color:#cbd5e1;line-height:1.5;font-style:italic}
.contacts{margin-top:14px;display:flex;flex-direction:column;gap:8px;text-align:left}
.cbtn{display:flex;align-items:center;justify-content:space-between;background:#1c2333;border:1px solid #2b3549;border-radius:12px;padding:10px 13px;text-decoration:none;color:#f8fafc}
.cbtn .l{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;font-weight:700}
.cbtn .v{font-size:13px;font-weight:700;color:#fff;margin-top:2px}
.pill{font-size:11px;font-weight:800;padding:4px 10px;border-radius:8px}
.wa{background:rgba(34,197,94,.16);color:#4ade80}
.ig{background:rgba(244,114,182,.16);color:#f472b6}
.em{background:rgba(56,189,248,.16);color:#38bdf8}
.ftr{margin-top:14px;padding-top:12px;border-top:1px solid #222a3a;font-size:11px;color:#64748b;text-align:center}
</style>
</head>
<body>
<div class="wrap">
    <div class="cover"><span class="badge">VERIFIED OWNER</span></div>
    <div class="profile">
        <div class="av-ring">${avatarHtml}</div>
        <div class="name">${escapeHtml(ownerName)}</div>
        <div class="role">Creator of ${escapeHtml(botname)}</div>
        <div class="slogan">"${escapeHtml(slogan)}"</div>
        <div class="contacts">
            <a class="cbtn" href="https://wa.me/${escapeHtml(waNum)}">
                <div><div class="l">WhatsApp</div><div class="v">+${escapeHtml(waNum)}</div></div>
                <span class="pill wa">CHAT</span>
            </a>
            ${igUser ? `<a class="cbtn" href="${escapeHtml(igUrl)}">
                <div><div class="l">Instagram</div><div class="v">@${escapeHtml(igUser)}</div></div>
                <span class="pill ig">FOLLOW</span>
            </a>` : ''}
            ${email ? `<a class="cbtn" href="mailto:${escapeHtml(email)}">
                <div><div class="l">Email</div><div class="v">${escapeHtml(email)}</div></div>
                <span class="pill em">MAIL</span>
            </a>` : ''}
        </div>
        <div class="ftr">Gunakan tombol kontak melayang di bawah untuk membuka langsung ⬇</div>
    </div>
</div>
</body>
</html>`;
}

module.exports = {
    name: 'developer',
    category: 'owner',
    commands: ['developer', 'dev', 'owner', 'ownerblog', 'bioowner'],

    async execute(ctx) {
        const { Dinz, m, Reply, axios, botCtx } = ctx;

        const identity = botCtx.getBotIdentity(Dinz);
        const blogCfg = botCtx.getSection('owner_blog', Dinz) || {};

        const ownerNum = String(blogCfg.wa || identity.owner || global.owner || '').replace(/[^0-9]/g, '');
        const ownerName = identity.namaOwner || global.namaOwner || 'Owner';
        const botname = identity.botname || global.botname || 'HuTao - MD';
        const slogan = blogCfg.slogan || `Building smart automation & digital services with ${botname}.`;
        const email = blogCfg.email || (!Dinz.isJadibot ? (global.cpanelEmail?.defaultEmail || '') : '');
        const igRaw = String(blogCfg.ig || '').trim();
        const igUser = igRaw.replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, '').replace(/\/.*$/, '').replace(/^@/, '');
        const igUrl = igUser ? `https://instagram.com/${igUser}` : '';

        const photoRes = await fetchOwnerPhotoBuffer(Dinz, axios, blogCfg.photo, ownerNum ? `${ownerNum}@s.whatsapp.net` : '');
        let photoDataUri = '';
        if (photoRes.buffer) {
            try {
                const sharp = require('sharp');
                const tiny = await sharp(photoRes.buffer).resize(180, 180, { fit: 'cover' }).jpeg({ quality: 78 }).toBuffer();
                if (Buffer.isBuffer(tiny) && tiny.length > 0) {
                    photoDataUri = `data:image/jpeg;base64,${tiny.toString('base64')}`;
                }
            } catch (_) {
                if (photoRes.buffer.length <= 60000) {
                    photoDataUri = `data:image/jpeg;base64,${photoRes.buffer.toString('base64')}`;
                }
            }
        }

        const htmlPayload = buildOwnerBlogHtml({
            ownerName,
            botname,
            slogan,
            waNum: ownerNum,
            igUser,
            igUrl,
            email,
            photoDataUri
        });

        try {
            await richMessage.sendRichHtml(Dinz, m, {
                title: `Owner Blog — ${ownerName}`,
                htmlPayload,
                trustedSources: ['nox.dev']
            });
        } catch (_) {}

        const buttons = [];
        if (ownerNum) {
            buttons.push({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '💬 Chat WhatsApp',
                    url: `https://wa.me/${ownerNum}`,
                    merchant_url: `https://wa.me/${ownerNum}`
                })
            });
        }
        if (igUrl) {
            buttons.push({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: `📸 Instagram @${igUser}`,
                    url: igUrl,
                    merchant_url: igUrl
                })
            });
        }
        if (email) {
            buttons.push({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: '📧 Kirim Email',
                    url: `mailto:${email}`,
                    merchant_url: `mailto:${email}`
                })
            });
            buttons.push({
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: '📋 Salin Email',
                    copy_code: email
                })
            });
        }

        const cardBody =
            `\`⌜ 🪪 OWNER PROFILE — ${ownerName} ⌟\`\n` +
            `> ◦ *Slogan :* _"${slogan}"_\n` +
            `> ◦ *WhatsApp :* https://wa.me/${ownerNum}\n` +
            (igUser ? `> ◦ *Instagram :* ${igUrl}\n` : '') +
            (email ? `> ◦ *Email :* ${email}\n` : '') +
            `\n✨ Klik tombol kontak di bawah untuk langsung terhubung!`;

        let interactiveSent = false;
        if (buttons.length > 0 && typeof generateWAMessageFromContent === 'function' && proto?.Message?.InteractiveMessage) {
            try {
                let headerObj = { title: ownerName, hasMediaAttachment: false };
                if (photoRes.buffer && typeof prepareWAMessageMedia === 'function' && Dinz.waUploadToServer) {
                    const media = await prepareWAMessageMedia({ image: photoRes.buffer }, { upload: Dinz.waUploadToServer });
                    if (media?.imageMessage) {
                        headerObj = { hasMediaAttachment: true, imageMessage: media.imageMessage };
                    }
                }
                const msg = await generateWAMessageFromContent(m.chat, {
                    viewOnceMessage: {
                        message: {
                            interactiveMessage: proto.Message.InteractiveMessage.create({
                                body: proto.Message.InteractiveMessage.Body.create({ text: cardBody }),
                                footer: proto.Message.InteractiveMessage.Footer.create({ text: `© ${botname} • Official Contact` }),
                                header: proto.Message.InteractiveMessage.Header.create(headerObj),
                                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons })
                            })
                        }
                    }
                }, { quoted: m });
                await Dinz.relayMessage(m.chat, msg.message, { messageId: msg.key.id, AI: false });
                interactiveSent = true;
            } catch (_) {}
        }

        if (!interactiveSent) {
            if (photoRes.buffer) {
                await Dinz.sendMessage(m.chat, { image: photoRes.buffer, caption: cardBody }, { quoted: m }).catch(() => Reply(cardBody));
            } else {
                await Reply(cardBody);
            }
        }
        return true;
    }
};
