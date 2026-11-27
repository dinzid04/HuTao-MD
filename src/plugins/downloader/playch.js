module.exports = {
    name: 'playch',
    category: 'downloader',
    commands: ['playch'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, Reply, fs, path, axios } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        if (!text || text.trim().length === 0) {
            return Reply(
                `\`⌜ Contoh Penggunaan ⌟\`\n> ◦ *Format :* playch <judul_lagu> | <link_channel>\n> ◦ *Contoh :* playch Steal The Show | https://whatsapp.com/channel/xxx`
            );
        }

        let targetChannel = '';
        let songTitle = '';

        if (text.includes('|')) {
            const parts = text.split('|');
            const p0 = parts[0].trim();
            const p1 = parts.slice(1).join('|').trim();

            if (p0.includes('whatsapp.com/channel/') || p0.endsWith('@newsletter')) {
                targetChannel = p0;
                songTitle = p1;
            } else {
                songTitle = p0;
                targetChannel = p1;
            }
        } else {
            const words = text.trim().split(/\s+/);
            if (words[0].includes('whatsapp.com/channel/') || words[0].endsWith('@newsletter')) {
                targetChannel = words[0];
                songTitle = words.slice(1).join(' ');
            } else if (words[words.length - 1].includes('whatsapp.com/channel/') || words[words.length - 1].endsWith('@newsletter')) {
                targetChannel = words[words.length - 1];
                songTitle = words.slice(0, -1).join(' ');
            } else {
                return Reply(
                    `\`⌜ Contoh Penggunaan ⌟\`\n> ◦ *Format :* playch <judul_lagu> | <link_channel>\n> ◦ *Contoh :* playch Steal The Show | https://whatsapp.com/channel/xxx`
                );
            }
        }

        if (!targetChannel || !songTitle) {
            return Reply(
                `\`⌜ Contoh Penggunaan ⌟\`\n> ◦ *Format :* playch <judul_lagu> | <link_channel>\n> ◦ *Contoh :* playch Steal The Show | https://whatsapp.com/channel/xxx`
            );
        }

        let CH_ID = '';
        let channelInfo = null;

        try {
            if (targetChannel.endsWith('@newsletter')) {
                CH_ID = targetChannel;
                channelInfo = await Dinz.newsletterMetadata('jid', CH_ID).catch(() => ({ id: CH_ID, name: 'Saluran WhatsApp' }));
            } else if (targetChannel.includes('whatsapp.com/channel/')) {
                const inviteCode = targetChannel.split('https://whatsapp.com/channel/')[1]?.split(/[?&/]/)[0];
                if (!inviteCode) return Reply("❌ Link channel tidak valid!");
                channelInfo = await Dinz.newsletterMetadata("invite", inviteCode).catch(() => null);
                if (!channelInfo) return Reply("❌ Gagal mengambil data channel!");
                CH_ID = channelInfo.id;
            } else {
                return Reply("❌ Masukkan link saluran WhatsApp yang valid (contoh: https://whatsapp.com/channel/xxx)!");
            }
        } catch (metaErr) {
            return Reply(`❌ Gagal mengambil data channel: ${metaErr?.message || metaErr}`);
        }

        if (!CH_ID) return Reply("❌ ID channel tidak ditemukan!");

        await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const { promisify } = require("util");
        const { exec } = require("child_process");
        const execPromise = promisify(exec);

        const tmpDir = path.join(process.cwd(), "tmp");
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const fileId = Date.now();
        const inputPath = path.join(tmpDir, `playch_in_${fileId}.mp3`);
        const outputPath = path.join(tmpDir, `playch_out_${fileId}.opus`);

        try {
            let trackTitle = songTitle;
            let trackArtist = 'Unknown Artist';
            let trackDuration = '-';
            let trackThumbnail = null;
            let audioBuffer = null;

            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;

            try {
                const playRes = await axios.get(`${baseUrl}/download/play?apikey=${apiKey}&query=${encodeURIComponent(songTitle)}`, { timeout: 35000 });
                const pData = playRes.data?.result;
                if (pData && (pData.audio || pData.download)) {
                    trackTitle = pData.title || songTitle;
                    trackArtist = pData.author?.name || 'Artist';
                    trackDuration = pData.duration || '-';
                    trackThumbnail = pData.thumbnail || pData.banner;

                    const dlUrl = pData.audio || pData.download;
                    const dlRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 45000 });
                    audioBuffer = Buffer.from(dlRes.data);
                }
            } catch (playErr) {
                console.error('[Playch Dinz Play Error]:', playErr.message);
            }

            if (!audioBuffer) {
                try {
                    const scRes = await axios.get(`${baseUrl}/download/soundcloudplay?apikey=${apiKey}&query=${encodeURIComponent(songTitle)}`, { timeout: 35000 });
                    const scData = scRes.data?.result;
                    if (scData && (scData.audio || scData.download || scData.url)) {
                        trackTitle = scData.title || trackTitle;
                        trackArtist = scData.artist || scData.author || trackArtist;
                        trackThumbnail = scData.thumbnail || scData.image || trackThumbnail;

                        const scDl = scData.audio || scData.download || scData.url;
                        const dlRes = await axios.get(scDl, { responseType: 'arraybuffer', timeout: 45000 });
                        audioBuffer = Buffer.from(dlRes.data);
                    }
                } catch (scErr) {
                    console.error('[Playch Dinz SC Error]:', scErr.message);
                }
            }

            if (!audioBuffer) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply(`❌ Lagu "${songTitle}" tidak ditemukan.`);
            }

            fs.writeFileSync(inputPath, audioBuffer);

            let finalBuffer = audioBuffer;
            let isOpus = false;
            try {
                await execPromise(`ffmpeg -i "${inputPath}" -c:a libopus -ac 1 -ar 48000 -b:a 48k -application voip -map_metadata -1 "${outputPath}" -y`);
                if (fs.existsSync(outputPath)) {
                    finalBuffer = fs.readFileSync(outputPath);
                    isOpus = true;
                }
            } catch (ffErr) {
                finalBuffer = audioBuffer;
            }

            await Dinz.sendMessage(CH_ID, {
                audio: finalBuffer,
                mimetype: isOpus ? "audio/ogg; codecs=opus" : "audio/mp4",
                ptt: true,
                contextInfo: {
                    isForwarded: true,
                    forwardingScore: 9999,
                    businessMessageForwardInfo: { businessOwnerJid: global.owner + "@s.whatsapp.net" },
                    forwardedNewsletterMessageInfo: {
                        newsletterName: trackTitle,
                        newsletterJid: CH_ID
                    }
                }
            });

            try {
                const { createCanvas, loadImage } = require('canvas');
                const width = 1200;
                const height = 630;
                const canvas = createCanvas(width, height);
                const ctx = canvas.getContext('2d');

                const bgGrad = ctx.createLinearGradient(0, 0, width, height);
                bgGrad.addColorStop(0, '#050508');
                bgGrad.addColorStop(0.5, '#0b0b10');
                bgGrad.addColorStop(1, '#030305');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, width, height);

                for (let i = 0; i < 300; i++) {
                    ctx.fillStyle = `rgba(0, 210, 255, ${Math.random() * 0.03 + 0.005})`;
                    ctx.beginPath();
                    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }

                const cyanGlow = ctx.createRadialGradient(280, 315, 50, 280, 315, 450);
                cyanGlow.addColorStop(0, 'rgba(0, 210, 255, 0.15)');
                cyanGlow.addColorStop(1, 'rgba(0, 210, 255, 0)');
                ctx.fillStyle = cyanGlow;
                ctx.fillRect(0, 0, width, height);

                const cardX = 80;
                const cardY = 80;
                const cardW = width - 160;
                const cardH = height - 160;
                const cardRadius = 36;

                ctx.fillStyle = 'rgba(15, 15, 22, 0.85)';
                ctx.beginPath();
                ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
                ctx.fill();

                ctx.strokeStyle = 'rgba(0, 210, 255, 0.2)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
                ctx.stroke();

                const cornerSize = 24;
                ctx.strokeStyle = '#00d2ff';
                ctx.lineWidth = 2.5;
                [[cardX + 6, cardY + 6, 1, 1], [cardX + cardW - 6, cardY + 6, -1, 1], [cardX + 6, cardY + cardH - 6, 1, -1], [cardX + cardW - 6, cardY + cardH - 6, -1, -1]]
                    .forEach(([cx, cy, dx, dy]) => {
                        ctx.beginPath();
                        ctx.moveTo(cx + dx * cornerSize, cy);
                        ctx.lineTo(cx, cy);
                        ctx.lineTo(cx, cy + dy * cornerSize);
                        ctx.stroke();
                    });

                const thumbSize = 330;
                const thumbX = 130;
                const thumbY = (height - thumbSize) / 2;
                const discX = thumbX + 225;
                const discY = thumbY + (thumbSize / 2);
                const discRadius = (thumbSize / 2) - 10;

                ctx.fillStyle = '#0d0d11';
                ctx.beginPath();
                ctx.arc(discX, discY, discRadius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 1;
                for (let r = discRadius - 15; r > 30; r -= 15) {
                    ctx.beginPath();
                    ctx.arc(discX, discY, r, 0, Math.PI * 2);
                    ctx.stroke();
                }

                ctx.fillStyle = '#00d2ff';
                ctx.beginPath();
                ctx.arc(discX, discY, 35, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#101015';
                ctx.beginPath();
                ctx.arc(discX, discY, 10, 0, Math.PI * 2);
                ctx.fill();

                if (trackThumbnail) {
                    try {
                        const thumbImg = await loadImage(trackThumbnail);
                        ctx.save();
                        ctx.beginPath();
                        ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, 24);
                        ctx.closePath();
                        ctx.clip();
                        ctx.drawImage(thumbImg, thumbX, thumbY, thumbSize, thumbSize);
                        ctx.restore();
                    } catch (e) {
                        ctx.fillStyle = '#00d2ff';
                        ctx.beginPath();
                        ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, 24);
                        ctx.fill();
                    }
                }

                const textX = thumbX + thumbSize + 75;
                let currentY = 205;

                ctx.font = 'bold 12px Arial';
                ctx.fillStyle = '#00d2ff';
                ctx.textAlign = 'left';
                ctx.fillText('✦  NOW PLAYING ON CHANNEL  ✦', textX, currentY);

                currentY += 45;
                let titleFontSize = 38;
                if (trackTitle.length > 20) titleFontSize = 30;
                if (trackTitle.length > 30) titleFontSize = 24;
                ctx.font = `bold ${titleFontSize}px Arial`;
                ctx.fillStyle = '#ffffff';
                let displayTitle = trackTitle;
                if (displayTitle.length > 35) displayTitle = displayTitle.slice(0, 32) + '...';
                ctx.fillText(displayTitle, textX, currentY);

                currentY += 40;
                ctx.font = '22px Arial';
                ctx.fillStyle = '#b0b0ba';
                let displayArtist = trackArtist;
                if (displayArtist.length > 35) displayArtist = displayArtist.slice(0, 32) + '...';
                ctx.fillText(displayArtist, textX, currentY);

                currentY += 45;
                const progressWidth = width - textX - 140;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
                ctx.beginPath();
                ctx.roundRect(textX, currentY, progressWidth, 6, 3);
                ctx.fill();

                const activeWidth = progressWidth * 0.45;
                ctx.fillStyle = '#00d2ff';
                ctx.beginPath();
                ctx.roundRect(textX, currentY, activeWidth, 6, 3);
                ctx.fill();

                ctx.fillStyle = '#a0a0ab';
                ctx.font = '14px Arial';
                ctx.fillText('0:00', textX, currentY + 25);
                ctx.textAlign = 'right';
                ctx.fillText(trackDuration, textX + progressWidth, currentY + 25);
                ctx.textAlign = 'left';

                const cardBuffer = canvas.toBuffer('image/png');
                const infoCaption = `\`⌜ Play Channel ⌟\`
> ◦ *Judul :* ${trackTitle}
> ◦ *Artis :* ${trackArtist}
> ◦ *Durasi :* ${trackDuration}
> ◦ *Saluran :* ${channelInfo?.name || 'Saluran WhatsApp'}`;

                await Dinz.sendMessage(CH_ID, {
                    image: cardBuffer,
                    caption: infoCaption
                });
            } catch (cardErr) {
                console.error('[PLAYCH CARD ERROR]', cardErr);
            }

            setTimeout(() => {
                try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch(e) {}
                try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch(e) {}
            }, 3000);

            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            Reply(
                `\`⌜ Play Channel Berhasil ✅ ⌟\`\n> ◦ *Saluran :* ${channelInfo?.name || 'Saluran WhatsApp'}\n> ◦ *Judul :* ${trackTitle}\n> ◦ *Artis :* ${trackArtist}\n> ◦ *Durasi :* ${trackDuration}\n> ◦ *PTT :* True (Voice Note)`
            );
        } catch (e) {
            console.error('[PLAYCH ERROR]', e);
            setTimeout(() => {
                try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch(err) {}
                try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch(err) {}
            }, 2000);

            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Gagal memutar musik ke channel: ${e?.message || e}`);
        }
        return true;
    }
};
