module.exports = {
    name: 'setjadibot',
    category: 'jadibot',
    commands: ['setjadibot'],

    async execute(ctx) {
        const { Dinz, m, args, senderNumber, isCreator, Reply, example, jadibotMgr } = ctx;

        if (!isCreator) return Reply(global.mess.owner);
        if (!jadibotMgr.claimCommandExecution(m.key.id)) return;

        const arg0 = (args[0] || '').trim();
        const arg0Lower = arg0.toLowerCase();
        const arg1 = (args[1] || '').trim();
        const arg1Lower = arg1.toLowerCase();

        if (arg0Lower === 'limit' || arg0Lower === 'limits' || arg0Lower === 'guard') {
            const lim = jadibotMgr.getJadibotLimits();
            const cdMin = Math.round((lim.broadcastCooldownMs || 0) / 60000);
            return Reply(
                `\`⌜ Pengaman Resource & Anti-Ban Cloner ⌟\`\n` +
                `> ◦ *Max Cloner Aktif :* ${lim.maxCloner === 0 ? 'Unlimited' : lim.maxCloner}\n` +
                `> ◦ *Cooldown Broadcast :* ${cdMin === 0 ? 'Nonaktif' : `${cdMin} menit`}\n\n` +
                `Penggunaan:\n` +
                `• *setjadibot max <angka>* (0 = unlimited)\n` +
                `• *setjadibot jpmcd <menit>* (contoh: 10m / 0 = off)`
            );
        }

        if (arg0Lower === 'max' || arg0Lower === 'maxcloner') {
            if (Dinz.isJadibot) return Reply('🔒 Pengaturan limit hanya untuk bot utama.');
            if (!arg1 || !/^\d+$/.test(arg1)) {
                return Reply(example('max 10  (isi 0 untuk unlimited)'));
            }
            const val = parseInt(arg1, 10);
            const next = jadibotMgr.setJadibotLimits({ maxCloner: val });
            return Reply(`✅ Batas maksimal cloner aktif diatur ke: *${next.maxCloner === 0 ? 'Unlimited' : `${next.maxCloner} cloner`}*`);
        }

        if (arg0Lower === 'jpmcd' || arg0Lower === 'cooldown' || arg0Lower === 'anticd') {
            if (Dinz.isJadibot) return Reply('🔒 Pengaturan cooldown hanya untuk bot utama.');
            const mCd = arg1Lower.match(/^(\d+)(s|detik|m|menit|j|jam|h)?$/);
            if (!mCd) {
                return Reply(example('jpmcd 10m  (isi 0 untuk menonaktifkan cooldown broadcast cloner)'));
            }
            const n = parseInt(mCd[1], 10);
            const u = mCd[2] || 'm';
            let ms = 0;
            if (u === 's' || u === 'detik') ms = n * 1000;
            else if (u === 'j' || u === 'jam' || u === 'h') ms = n * 3600000;
            else ms = n * 60000;
            const next = jadibotMgr.setJadibotLimits({ broadcastCooldownMs: ms });
            const label = next.broadcastCooldownMs === 0 ? 'Nonaktif' : `${Math.round(next.broadcastCooldownMs / 1000)} detik (${(next.broadcastCooldownMs / 60000).toFixed(1)} menit)`;
            return Reply(`✅ Cooldown anti-ban broadcast cloner diatur ke: *${label}*`);
        }

        const isArg0Number = jadibotMgr.isValidNumber(jadibotMgr.normalizeNumber(arg0));

        if (
            !arg0 ||
            (arg0Lower === 'botname' && !arg1) ||
            (isArg0Number && (!arg1 || (arg1Lower === 'botname' && !args[2])))
        ) {
            const explicitNum = isArg0Number ? arg0 : '';
            const targetNumber = jadibotMgr.resolveTargetJadibot(Dinz, senderNumber, explicitNum);
            if (!targetNumber) {
                return Reply(`❌ Belum ada jadibot yang terdaftar. Silakan jalankan *jadibot <nomor>* terlebih dahulu atau ketik *setjadibot <nomor> botname*`);
            }
            jadibotMgr.setPendingJadibotPrompt(m.chat, senderNumber, {
                targetNumber,
                step: 'wait_botname',
                lastMsgId: m.key.id
            });
            return Reply(
                `\`⌜ Set Jadibot Otomatis ⌟\`\n` +
                `> ◦ *Target Bot :* ${targetNumber}\n\n` +
                `📝 Silakan kirim *nama bot* yang ingin digunakan (cukup balas/ketik langsung namanya tanpa command):`
            );
        }

        if (arg0Lower === 'botname' && arg1) {
            const newBotName = args.slice(1).join(' ').trim();
            const targetNumber = jadibotMgr.resolveTargetJadibot(Dinz, senderNumber, '');
            if (!targetNumber) {
                return Reply(`❌ Belum ada jadibot yang terdaftar. Silakan jalankan *jadibot <nomor>* terlebih dahulu.`);
            }
            const res = await jadibotMgr.autoConfigureClone(targetNumber, newBotName, { requester: senderNumber });
            if (!res.ok) return Reply(`❌ ${res.message}`);
            return Reply(res.message);
        }

        const directKeys = ['namaowner', 'owner', 'packname', 'reset'];
        if (directKeys.includes(arg0Lower)) {
            const targetNumber = jadibotMgr.resolveTargetJadibot(Dinz, senderNumber, '');
            if (!targetNumber) {
                return Reply(`❌ Belum ada jadibot yang terdaftar.`);
            }
            const key = arg0Lower === 'namaowner' ? 'namaOwner' : arg0Lower;
            const value = args.slice(1).join(' ').trim();
            if (key !== 'reset' && !value) return Reply(example(`${arg0Lower} <nilai>`));
            const res = jadibotMgr.setJadibotConfig(targetNumber, key, value);
            if (!res.ok) return Reply(`❌ ${res.message}`);
            return Reply(`✅ *setjadibot*\n> ◦ Nomor : *${targetNumber}*\n> ◦ ${res.message}`);
        }

        if (isArg0Number) {
            const target = jadibotMgr.normalizeNumber(arg0);
            const knownKeys = ['botname', 'namaowner', 'owner', 'packname', 'reset'];
            if (knownKeys.includes(arg1Lower)) {
                const key = arg1Lower === 'namaowner' ? 'namaOwner' : arg1Lower;
                const value = args.slice(2).join(' ').trim();
                if (key === 'botname' && value) {
                    const res = await jadibotMgr.autoConfigureClone(target, value, { requester: senderNumber });
                    if (!res.ok) return Reply(`❌ ${res.message}`);
                    return Reply(res.message);
                }
                if (key !== 'reset' && !value) return Reply(example(`${target} ${key} MyBot`));
                const res = jadibotMgr.setJadibotConfig(target, key, value);
                if (!res.ok) return Reply(`❌ ${res.message}`);
                return Reply(`✅ *setjadibot*\n> ◦ Nomor : *${target}*\n> ◦ ${res.message}`);
            } else {
                const newBotName = args.slice(1).join(' ').trim();
                const res = await jadibotMgr.autoConfigureClone(target, newBotName, { requester: senderNumber });
                if (!res.ok) return Reply(`❌ ${res.message}`);
                return Reply(res.message);
            }
        }

        const fallbackTarget = jadibotMgr.resolveTargetJadibot(Dinz, senderNumber, '');
        if (!fallbackTarget) {
            return Reply(`❌ Belum ada jadibot yang terdaftar. Silakan jalankan *jadibot <nomor>* terlebih dahulu.`);
        }
        const directBotName = args.join(' ').trim();
        const res = await jadibotMgr.autoConfigureClone(fallbackTarget, directBotName, { requester: senderNumber });
        if (!res.ok) return Reply(`❌ ${res.message}`);
        return Reply(res.message);
    }
};
