module.exports = {
    name: 'qc',
    category: 'sticker',
    commands: ['qc', 'quoted', 'qcpink', 'qchitam', 'qcputih'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        let raw = text || m.quoted?.text || m.quoted?.conversation || m.quoted?.caption || '';
        if (!raw || raw.trim().length === 0) {
            return Reply(`\`⌜ Quoted Chat ⌟\`\n> ◦ *Format :* ${command} teks`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: "⏳", key: m.key } }).catch(() => {});

        let bgColor = "%23292232";
        if (command === 'qcpink') bgColor = "%23ffb6c1";
        else if (command === 'qchitam') bgColor = "%23000000";
        else if (command === 'qcputih') bgColor = "%23ffffff";

        let uName = m.pushName || 'User';
        let qText = raw.trim();
        let avatarTarget = m.sender;

        if (m.quoted) {
            uName = m.quoted.pushName || (m.quoted.sender ? m.quoted.sender.split('@')[0] : uName);
            avatarTarget = m.quoted.sender || m.sender;
            qText = text || m.quoted.text || m.quoted.conversation || m.quoted.caption || raw.trim();
        } else if (raw.includes('|')) {
            const parts = raw.split('|');
            uName = parts[0].trim() || uName;
            qText = parts.slice(1).join('|').trim() || qText;
        }

        try {
            let avatarUrl = '';
            try {
                avatarUrl = await Dinz.profilePictureUrl(avatarTarget, 'image');
            } catch (e) {
                avatarUrl = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde';
            }

            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;
            const apiUrl = `${baseUrl}/imagecreator/quoted?apikey=${apiKey}&username=${encodeURIComponent(uName)}&profile=${encodeURIComponent(avatarUrl)}&text=${encodeURIComponent(qText)}&bg=${bgColor}`;

            const res = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 30000 });
            await Dinz.sendAsSticker(m.chat, Buffer.from(res.data), m, { packname: global.packname, author: global.namaOwner });

            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: "✅", key: m.key } }).catch(() => {});
        } catch (e) {
            console.error('[QC ERROR]', e);
            await Dinz.sendMessage(m.chat, { react: { text: "❌", key: m.key } }).catch(() => {});
            Reply(`❌ Gagal membuat quoted sticker: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
