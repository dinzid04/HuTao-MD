const { formatCard, formatNumber, CREATE_COST, MAX_MEMBERS, EMBLEMS, cleanNum, getUser, genClanId } = require('./_helper');

module.exports = {
    name: 'clancreate',
    category: 'clan',
    commands: ['clancreate', 'createclan', 'guildcreate'],

    async execute(ctx) {
        const { Dinz, m, text, body, Reply, botCtx, usedPrefix } = ctx;
        const clans = botCtx.getSection('clans', Dinz) || {};
        const saveClans = () => botCtx.setSection('clans', clans, Dinz);
        const user = getUser(m.sender);

        const name = text.trim();
        if (!name) {
            return Reply(formatCard({
                icon: '⚔️',
                title: 'CREATE CLAN',
                rows: [
                    { label: 'Biaya', value: `Rp ${formatNumber(CREATE_COST)}` },
                    { label: 'Max Nama', value: '20 karakter (huruf/angka/spasi)' }
                ],
                body: `Contoh: \`${usedPrefix}clancreate DragonSlayer\``
            }));
        }
        if (name.length > 20 || !/^[a-zA-Z0-9\s]+$/.test(name)) {
            return Reply('❌ Nama clan maks 20 karakter (hanya huruf, angka, dan spasi).');
        }
        if (user.clanId && clans[user.clanId]) {
            return Reply(`❌ Kamu sudah berada di clan *${clans[user.clanId].name}*. Keluar dulu dengan \`${usedPrefix}clanleave\`.`);
        }
        if (Object.values(clans).some((c) => c.name.toLowerCase() === name.toLowerCase())) {
            return Reply(`❌ Nama clan *${name}* sudah dipakai.`);
        }
        if (user.money < CREATE_COST) {
            return Reply(`❌ Saldo RPG tidak cukup!\nButuh: *Rp ${formatNumber(CREATE_COST)}*\nSaldo kamu: *Rp ${formatNumber(user.money)}*`);
        }

        const id = genClanId(name, clans);
        const emblem = EMBLEMS[Math.floor(Math.random() * EMBLEMS.length)];
        clans[id] = {
            id,
            name,
            emblem,
            leader: m.sender,
            members: [m.sender],
            exp: 0,
            level: 1,
            wins: 0,
            losses: 0,
            isOpen: true,
            createdAt: Date.now()
        };
        user.money -= CREATE_COST;
        user.clanId = id;
        saveClans();

        return Reply(formatCard({
            icon: emblem,
            title: 'CLAN BERHASIL DIBUAT',
            rows: [
                { label: 'Nama Clan', value: name },
                { label: 'ID Clan', value: `\`${id}\`` },
                { label: 'Leader', value: `@${cleanNum(m.sender)}` },
                { label: 'Member', value: `1/${MAX_MEMBERS}` },
                { label: 'Biaya', value: `-Rp ${formatNumber(CREATE_COST)}` }
            ],
            footer: `Undang teman: ${usedPrefix}claninvite @user atau bagikan ID ${id}`
        }), [m.sender]);
    }
};
