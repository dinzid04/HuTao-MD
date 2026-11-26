module.exports = {
    name: 'on',
    category: 'group',
    commands: ['on', 'off'],

    async execute(ctx) {
        const { m, command, text, isCreator, Reply } = ctx;

        if (!m.isAdmin && !isCreator) return Reply(global.mess.admin);
        if (!m.isGroup) return Reply(global.mess.group);

        if (!global.db.groups[m.chat]) global.db.groups[m.chat] = {}
        const group = global.db.groups[m.chat]

        const settingOrder = [
            "welcome", "left", "antilink", "antilink2", "antilinkWa", "antilinkAll",
            "antihidetag", "antibadword", "antiswgc", "antiswgc_kick", "antitagsw", "antitagswkick",
            "antisticker", "antidocument", "antivirtex", "antispam", "antijudol", "antiphising",
            "levelupNotif"
        ]
        const settingNames = {
            "welcome": "welcome message",
            "left": "left message",
            "antilink": "antilink kick",
            "antilink2": "antilink remove",
            "antilinkWa": "antilink wa",
            "antilinkAll": "antilink all",
            "antihidetag": "antihidetag",
            "antibadword": "antibadword",
            "antiswgc": "antiswgc delete",
            "antiswgc_kick": "antiswgc kick",
            "antitagsw": "antitagsw delete",
            "antitagswkick": "antitagsw kick",
            "antisticker": "anti sticker",
            "antidocument": "anti document",
            "antivirtex": "anti virtex",
            "antispam": "anti spam",
            "antijudol": "anti judol",
            "antiphising": "anti phising",
            "levelupNotif": "levelup notif"
        }

        let currentPrefix = '';

        if (!text) {
            let listText = `\`⌜ Group Settings ⌟\``;
            settingOrder.forEach((setting, index) => {
                const num = index + 1;
                const isActive = group[setting] || false;
                const status = isActive ? "🟢" : "🔴";
                const displayName = settingNames[setting] || setting;
                listText += `\n> ◦ ${num}. ${displayName} (${status})`;
            });
            listText += `\n\n📌 *Contoh:*\n> ◦ ${currentPrefix}${command} welcome\n> ◦ ${currentPrefix}${command} 1`;
            return Reply(listText);
        }

        const numbers = text.split(',').map(num => num.trim()).filter(num => num !== '')
        const isOn = command === "on"

        for (const numStr of numbers) {
            let event = null;
            const num = Number(numStr)
            if (!isNaN(num) && num >= 1 && num <= settingOrder.length) {
                event = settingOrder[num - 1]
            } else if (settingOrder.includes(numStr.toLowerCase())) {
                event = numStr.toLowerCase();
            } else if (['levelup', 'levelupnotif', 'autolevelup', 'notiflevelup'].includes(numStr.toLowerCase())) {
                event = 'levelupNotif';
            } else {
                const foundSetting = settingOrder.find(setting =>
                    settingNames[setting] && settingNames[setting].toLowerCase() === numStr.toLowerCase()
                );
                if (foundSetting) event = foundSetting;
            }

            if (!event) continue;

            group[event] = isOn
            if (event === 'levelupNotif') {
                group.levelupNotifExplicit = true;
            }
        }

        Reply(`\`⌜ Group Settings ⌟\`\n> ◦ Status : *Berhasil Diubah*\n> ◦ Info : *Pengaturan grup telah diperbarui*`);
        return true;
    }
};
