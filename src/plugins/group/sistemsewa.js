module.exports = {
    name: 'sistemsewa',
    category: 'group',
    commands: ['sistemsewa', 'sewamode'],

    async execute(ctx) {
        const { Dinz, args, isCreator, Reply, botCtx } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        const arg = (args[0] || '').toLowerCase();
        const current = botCtx.getSection('sistemsewa', Dinz) || { enabled: false };
        if (arg === 'on' || arg === 'aktif' || arg === 'true') {
            botCtx.setSection('sistemsewa', { enabled: true, explicit: true }, Dinz);
            return Reply('`⌜ Sistem Sewa ⌟`\n> ◦ Status : *AKTIF*\n> ◦ Info : *Hanya grup terdaftar sewa (dan owner) yang bisa memakai bot*');
        }
        if (arg === 'off' || arg === 'mati' || arg === 'false') {
            botCtx.setSection('sistemsewa', { enabled: false, explicit: true }, Dinz);
            return Reply('`⌜ Sistem Sewa ⌟`\n> ◦ Status : *NONAKTIF*\n> ◦ Info : *Semua grup bebas memakai bot*');
        }
        return Reply(`\`⌜ Sistem Sewa ⌟\`\n> ◦ Status : *${current.enabled ? 'AKTIF' : 'NONAKTIF'}*\n> ◦ Penggunaan : *.sistemsewa on* / *.sistemsewa off*`);
    }
};
