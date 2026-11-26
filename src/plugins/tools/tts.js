module.exports = {
    name: 'tts',
    category: 'tools',
    commands: ['tts', 'text2sound', 'texttospeech', 'gtts'],

    async execute(ctx) {
        const {
            Dinz, m, command, text, quoted, isCreator, Reply, fs, path, axios, checkLimit,
            addLimit
        } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        const rawText = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!rawText || rawText.trim().length === 0) {
            return Reply(`\`⌜ Text To Speech ⌟\`\n> ◦ *Format :* ${command} teks`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});

        let targetText = rawText.trim();
        let volPercent = 100;
        let lang = 'id';

        if (targetText.includes('|')) {
            const parts = targetText.split('|');
            targetText = parts[0].trim();
            const rawVol = parts[1].replace(/[^0-9]/g, '');
            if (rawVol) {
                volPercent = Math.min(500, Math.max(100, parseInt(rawVol, 10)));
            }
        }

        const firstWord = targetText.split(/\s+/)[0].toLowerCase();
        const supportedLangs = ['id', 'en', 'ja', 'ko', 'ar', 'jv', 'su', 'es', 'fr', 'de', 'ru', 'zh', 'pt', 'it'];
        if (supportedLangs.includes(firstWord) && targetText.split(/\s+/).length > 1) {
            lang = firstWord;
            targetText = targetText.substring(firstWord.length).trim();
        }

        if (!targetText || targetText.length === 0) {
            return Reply("❌ Teks untuk TTS tidak boleh kosong.");
        }

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/tools/text-to-speech?apikey=${apiKey}&text=${encodeURIComponent(targetText)}&lang=${lang}`, {
                responseType: 'arraybuffer',
                timeout: 30000
            });

            let audioBuffer = Buffer.from(res.data);
            if (!audioBuffer || audioBuffer.length === 0) {
                throw new Error("Gagal mengambil audio TTS");
            }

            if (volPercent > 100) {
                const volFactor = (volPercent / 100).toFixed(2);
                const tmpIn = path.join(process.cwd(), 'tmp', `tts_in_${Date.now()}.mp3`);
                const tmpOut = path.join(process.cwd(), 'tmp', `tts_out_${Date.now()}.mp3`);
                if (!fs.existsSync(path.join(process.cwd(), 'tmp'))) fs.mkdirSync(path.join(process.cwd(), 'tmp'), { recursive: true });
                fs.writeFileSync(tmpIn, audioBuffer);
                const { execSync } = require('child_process');
                execSync(`ffmpeg -y -i "${tmpIn}" -filter:a "volume=${volFactor}" -c:a libmp3lame "${tmpOut}"`);
                if (fs.existsSync(tmpOut)) {
                    audioBuffer = fs.readFileSync(tmpOut);
                    try { fs.unlinkSync(tmpOut); } catch(e) {}
                }
                try { fs.unlinkSync(tmpIn); } catch(e) {}
            }

            await Dinz.sendMessage(m.chat, {
                audio: audioBuffer,
                mimetype: 'audio/mp4',
                ptt: true
            }, { quoted: m });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (err) {
            console.error('TTS error:', err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal TTS: ${err.message}`);
        }
        return true;
    }
};
