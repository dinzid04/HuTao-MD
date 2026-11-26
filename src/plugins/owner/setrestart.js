module.exports = {
    name: 'setrestart',
    category: 'owner',
    commands: ['setrestart', 'restart'],

    async execute(ctx) {
        const { isCreator, Reply, database } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        try { await database.write(global.db, true); } catch (e) {}
        await Reply(`\`⌜ Restart ⌟\`\n> ◦ Status : *Database tersimpan, bot sedang restart...*\n> ◦ Info : *Tunggu beberapa detik*`);
        setTimeout(() => process.exit(1), 2000);
        return true;
    }
};
