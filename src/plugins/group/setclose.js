module.exports = {
    name: 'setclose',
    category: 'group',
    commands: ['setclose', 'settutup'],

    async execute(ctx) {
        const { m, args, isCreator, Reply } = ctx;

        if (!m.isGroup) return Reply(global.mess.group);
        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);

        if (!global.db.groups[m.chat]) global.db.groups[m.chat] = {};
        const group = global.db.groups[m.chat];

        const input = (args[0] || '').toLowerCase().trim();
        if (input === 'off' || input === 'mati' || input === 'disable') {
            group.autoClose = false;
            return Reply(`\`⌜ Auto Close Group ⌟\`\n> ◦ Status : *Nonaktif*\n> ◦ Info : *Jadwal tutup otomatis grup telah dimatikan*`);
        }

        const timeMatch = input.match(/^([0-1]?[0-9]|2[0-3])[:.]([0-5][0-9])$/);
        if (timeMatch) {
            const hours = timeMatch[1].padStart(2, '0');
            const minutes = timeMatch[2];
            const formattedTime = `${hours}:${minutes}`;

            group.autoClose = true;
            group.autoCloseTime = formattedTime;
            return Reply(
                `\`⌜ Auto Close Group ⏰ ⌟\`\n> ◦ *Status :* Aktif\n> ◦ *Waktu :* ${formattedTime} WIB\n> ◦ *Jadwal :* Setiap Hari (Malam)\n> ◦ *Info :* Grup akan otomatis ditutup setiap jam ${formattedTime} WIB`
            );
        } else {
            const currentStatus = group.autoClose ? `*Aktif (${group.autoCloseTime || '00:00'} WIB)* 🟢` : '*Nonaktif* 🔴';
            return Reply(
                `\`⌜ Pengaturan Auto Close ⌟\`\n> ◦ *Status Saat Ini :* ${currentStatus}\n\n*Cara Penggunaan :*\n> ◦ setclose 00:00 *(Tutup grup otomatis jam 00:00 WIB)*\n> ◦ setclose off *(Matikan fitur)*`
            );
        }
        return true;
    }
};
