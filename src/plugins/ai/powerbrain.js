module.exports = {
    name: 'powerbrain',
    category: 'ai',
    commands: ['powerbrain'],

    async execute(ctx) {
        const { Dinz, m, command, text, isCreator, Reply, example, axios, checkLimit, addLimit } = ctx;

        if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

        if (!text || text.trim().length === 0) {
            return Reply(example("siapa kamu?"));
        }

        await Dinz.sendMessage(m.chat, { react: { text: '🤖', key: m.key } }).catch(() => {});
        Reply(global.mess.wait);

        try {
            const baseUrl = global.apiDinz;
            const apiKey = global.ApikeyDinz;
            const apiUrl = `${baseUrl}/ai/${command}?apikey=${apiKey}&prompt=${encodeURIComponent(text.trim())}`;
            const response = await axios.get(apiUrl, { timeout: 45000 });
            const json = response.data;

            if (!json.status || !json.result) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply("❌ Maaf, AI sedang tidak dapat merespon pertanyaan saat ini.");
            }

            await Reply(json.result);
            addLimit(m.sender, isCreator);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
        } catch (err) {
            console.error(`${command} error:`, err?.message || err);
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ Terjadi kesalahan saat memproses ${command}: ${err?.message}`);
        }
        return true;
    }
};
