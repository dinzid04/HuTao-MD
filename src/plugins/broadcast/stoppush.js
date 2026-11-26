module.exports = {
    name: 'stoppush',
    category: 'broadcast',
    commands: ['stoppush'],

    async execute(ctx) {
        const { isCreator, Reply } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!global._pushRunning) return Reply("❌ Push kontak tidak sedang berjalan.");
        global._pushRunning = false;
        Reply(`\`⌜ Push Kontak ⌟\`\n> ◦ Status : *Dihentikan*`);
        return true;
    }
};
