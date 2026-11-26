module.exports = {
    name: 'deepseek',
    category: 'ai',
    commands: ['deepseek'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);
        let q = text || m.quoted?.text || m.quoted?.conversation || '';
        if (!q || q.trim().length === 0) {
            return Reply(`\`⌜ DeepSeek AI ⌟\`\n> ◦ *Format :* ${command} pertanyaan`);
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🤖', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        const baseUrl = global.apiDinz;
        const apiKey = global.ApikeyDinz;

        try {
            const res = await axios.get(`${baseUrl}/ai/deepseek?apikey=${apiKey}&text=${encodeURIComponent(q.trim())}`, { timeout: 45000 });
            const result = res.data?.result;
            if (!result) throw new Error("DeepSeek AI tidak memberikan respon.");

            await Reply(result);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (e) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            Reply(`❌ DeepSeek Error: ${e.response?.data?.error || e.message}`);
        }
        return true;
    }
};
