module.exports = {
    name: 'setopen',
    category: 'group',
    commands: ['setopen', 'setbuka'],

    async execute(ctx) {
        const { m, args, isCreator, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);

        if (!global.db.groups[m.chat]) global.db.groups[m.chat] = {};
        const group = global.db.groups[m.chat];

        const input = (args[0] || '').toLowerCase().trim();
        if (input === 'off' || input === 'mati' || input === 'disable') {
            group.autoOpen = false;
            return Reply(`\`⌜ Auto Open Group ⌟\`\n> ◦ Status : *Nonaktif*\n> ◦ Info : *Jadwal buka otomatis grup telah dimatikan*`);
        }

        const timeMatch = input.match(/^([0-1]?[0-9]|2[0-3])[:.]([0-5][0-9])$/);
        if (timeMatch) {
            const hours = timeMatch[1].padStart(2, '0');
            const minutes = timeMatch[2];
            const formattedTime = `${hours}:${minutes}`;

            group.autoOpen = true;
            group.autoOpenTime = formattedTime;
            return Reply(
                `\`⌜ Auto Open Group ⏰ ⌟\`\n> ◦ *Status :* Aktif\n> ◦ *Waktu :* ${formattedTime} WIB\n> ◦ *Jadwal :* Setiap Hari (Pagi)\n> ◦ *Info :* Grup akan otomatis dibuka setiap jam ${formattedTime} WIB`
            );
        } else {
            const currentStatus = group.autoOpen ? `*Aktif (${group.autoOpenTime || '06:00'} WIB)* 🟢` : '*Nonaktif* 🔴';
            return Reply(
                `\`⌜ Pengaturan Auto Open ⌟\`\n> ◦ *Status Saat Ini :* ${currentStatus}\n\n*Cara Penggunaan :*\n> ◦ setopen 06:00 *(Buka grup otomatis jam 06:00 WIB)*\n> ◦ setopen off *(Matikan fitur)*`
            );
        }
        return true;
    }
};
