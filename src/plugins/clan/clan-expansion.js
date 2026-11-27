const { formatCard, formatNumber, getUser } = require('./_helper');

function findUserClan(clans, jid) {
    const u = getUser(jid);
    if (u.clanId && clans[u.clanId]) return clans[u.clanId];
    return Object.values(clans).find((c) => Array.isArray(c.members) && c.members.includes(jid)) || null;
}

function getMemberRole(clan, jid) {
    if (!clan) return 'Member';
    if (clan.leader === jid) return 'Leader';
    return clan.roles?.[jid] || 'Member';
}

function isClanOfficer(clan, jid) {
    const r = getMemberRole(clan, jid);
    return r === 'Leader' || r === 'Co-Leader' || r === 'Elder';
}

module.exports = {
    name: 'clan-expansion',
    category: 'clan',
    commands: [
        'clanbank', 'clancheckin', 'clanceckin',
        'clanlevel', 'clanxp', 'clanupgrade',
        'clandesc', 'clanrename', 'logoclan',
        'clanpromote', 'clandemote', 'clanannounce',
        'clanboss', 'clanraid', 'clanjoinraid',
        'clanrank', 'clanraport', 'clanwaraccept', 'clanwarhistory', 'clanwarscore'
    ],

    async execute(ctx) {
        const { Dinz, m, command, text, args, quoted, qmsg, mime, Reply, botCtx, usedPrefix, uploadUniversalTourl } = ctx;
        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();
        const clans = botCtx.getSection('clans', Dinz) || {};
        const saveClans = () => botCtx.setSection('clans', clans, Dinz);
        const user = getUser(m.sender);
        const clan = findUserClan(clans, m.sender);

        // clanrank bisa dilihat meski belum gabung clan
        if (cmd === 'clanrank') {
            const sorted = Object.values(clans).sort((a, b) => ((b.level || 1) * 10000 + (b.exp || 0)) - ((a.level || 1) * 10000 + (a.exp || 0)));
            if (!sorted.length) return Reply(`🏰 Belum ada clan yang terbentuk. Buat dengan \`${pfx}clancreate <nama>\`.`);
            const myIdx = clan ? sorted.findIndex((c) => c.id === clan.id) + 1 : 0;
            const rows = sorted.slice(0, 10).map((c, i) => `> *#${i + 1}* ${c.emblem || '⚔️'} *${c.name}* — Lv.${c.level || 1} (${formatNumber(c.exp || 0)} XP • ${c.wins || 0}W)`);
            return Reply(
                `\`🏆 PERINGKAT CLAN GLOBAL\`\n` +
                (myIdx ? `> ◦ Peringkat Clan Kamu : *#${myIdx}* (*${clan.name}*)\n\n` : '\n') +
                rows.join('\n')
            );
        }

        if (!clan) {
            return Reply(`❌ Kamu belum tergabung dalam clan!\n> Buat clan: \`${pfx}clancreate <nama>\` atau gabung dengan \`${pfx}clanjoin <id>\`.`);
        }

        clan.bank = Number(clan.bank || 0);
        clan.exp = Number(clan.exp || 0);
        clan.level = Number(clan.level || 1);
        clan.roles = clan.roles && typeof clan.roles === 'object' ? clan.roles : {};
        clan.contrib = clan.contrib && typeof clan.contrib === 'object' ? clan.contrib : {};
        clan.checkins = clan.checkins && typeof clan.checkins === 'object' ? clan.checkins : {};
        clan.warHistory = Array.isArray(clan.warHistory) ? clan.warHistory : [];

        // 1. CLANBANK (cek / deposit / withdraw)
        if (cmd === 'clanbank') {
            const sub = (args[0] || '').toLowerCase();
            const amt = Math.floor(Number(args[1]) || 0);
            if (sub === 'deposit' || sub === 'setor' || sub === 'nabung') {
                if (amt < 1000) return Reply(`💰 Minimal setor ke kas clan *Rp 1.000*.\n> Contoh: \`${pfx}clanbank deposit 50000\``);
                if ((user.money || 0) < amt) return Reply(`❌ Uangmu kurang! Saldo: *Rp ${formatNumber(user.money || 0)}*`);
                user.money -= amt;
                clan.bank += amt;
                const xpGain = Math.max(5, Math.floor(amt / 2500));
                clan.exp += xpGain;
                clan.contrib[m.sender] = (clan.contrib[m.sender] || 0) + xpGain;
                saveClans();
                return Reply(`💰 *Setor Kas Clan Berhasil!*\n> ◦ Disetor : *Rp ${formatNumber(amt)}*\n> ◦ Bonus XP Clan : *+${xpGain} XP*\n> ◦ Total Kas Clan : *Rp ${formatNumber(clan.bank)}*`);
            }
            if (sub === 'tarik' || sub === 'withdraw') {
                if (clan.leader !== m.sender) return Reply('🔒 Hanya *Leader Clan* yang dapat menarik kas clan.');
                if (amt < 1000 || clan.bank < amt) return Reply(`❌ Saldo kas clan tidak mencukupi (*Rp ${formatNumber(clan.bank)}*).`);
                clan.bank -= amt;
                user.money = (user.money || 0) + amt;
                saveClans();
                return Reply(`💸 Berhasil menarik *Rp ${formatNumber(amt)}* dari kas clan.\n> Sisa kas: *Rp ${formatNumber(clan.bank)}*`);
            }
            return Reply(formatCard({
                icon: '🏦',
                title: `KAS CLAN — ${clan.name}`,
                rows: [
                    { label: 'Saldo Kas', value: `Rp ${formatNumber(clan.bank)}` },
                    { label: 'Level Clan', value: `Lv.${clan.level} (${formatNumber(clan.exp)} XP)` }
                ],
                body: `◦ Setor kas: \`${pfx}clanbank deposit <jumlah>\`\n◦ Tarik kas (Leader): \`${pfx}clanbank tarik <jumlah>\``
            }));
        }

        // 2. CLANCHECKIN (absen harian member clan)
        if (cmd === 'clancheckin' || cmd === 'clanceckin') {
            const today = new Date().toISOString().slice(0, 10);
            if (clan.checkins[m.sender] === today) {
                return Reply('⏳ Kamu sudah melakukan *Clan Check-in* hari ini! Kembali lagi besok.');
            }
            clan.checkins[m.sender] = today;
            const xpGain = 50;
            const moneyGain = 2500;
            clan.exp += xpGain;
            clan.bank += 1000;
            clan.contrib[m.sender] = (clan.contrib[m.sender] || 0) + xpGain;
            user.money = (user.money || 0) + moneyGain;
            saveClans();
            return Reply(
                `✅ *Clan Check-in Harian Berhasil!*\n` +
                `> ◦ Clan : *${clan.name}* (+${xpGain} XP & +Rp 1.000 Kas)\n` +
                `> ◦ Hadiah Kamu : *+Rp ${formatNumber(moneyGain)}*`
            );
        }

        // 3. CLANLEVEL / CLANXP / CLANUPGRADE
        if (cmd === 'clanlevel' || cmd === 'clanxp') {
            const needXp = clan.level * 500;
            const needGold = clan.level * 100000;
            const topContrib = Object.entries(clan.contrib)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([j, xp], i) => `> ${i + 1}. @${j.split('@')[0]} — *${formatNumber(xp)} XP*`);
            return Reply(
                `\`⚔️ LEVEL & XP CLAN — ${clan.name}\`\n` +
                `> ◦ *Level :* Lv.${clan.level}\n` +
                `> ◦ *XP Clan :* ${formatNumber(clan.exp)} / ${formatNumber(needXp)} XP\n` +
                `> ◦ *Biaya Upgrade :* Rp ${formatNumber(needGold)} (Kas: Rp ${formatNumber(clan.bank)})\n\n` +
                `*🏅 Top Kontributor XP:*\n${topContrib.join('\n') || '> _Belum ada kontribusi_'}\n\n` +
                `💡 Upgrade clan: \`${pfx}clanupgrade\``,
                Object.keys(clan.contrib).slice(0, 5)
            );
        }

        if (cmd === 'clanupgrade') {
            if (!isClanOfficer(clan, m.sender)) return Reply('🔒 Hanya Leader / Co-Leader / Elder yang bisa upgrade clan.');
            const needXp = clan.level * 500;
            const needGold = clan.level * 100000;
            if (clan.exp < needXp || clan.bank < needGold) {
                return Reply(
                    `❌ Syarat upgrade ke *Lv.${clan.level + 1}* belum terpenuhi!\n` +
                    `> ◦ XP Clan : *${formatNumber(clan.exp)} / ${formatNumber(needXp)}*\n` +
                    `> ◦ Kas Clan : *Rp ${formatNumber(clan.bank)} / Rp ${formatNumber(needGold)}*`
                );
            }
            clan.exp -= needXp;
            clan.bank -= needGold;
            clan.level += 1;
            saveClans();
            return Reply(`🎉 *LEVEL UP CLAN!* *${clan.name}* kini naik ke **Lv.${clan.level}**! 🏰🔥`);
        }

        // 4. CLANDESC / CLANRENAME / LOGOCLAN
        if (cmd === 'clandesc') {
            if (!isClanOfficer(clan, m.sender)) return Reply('🔒 Khusus pengurus clan (Leader/Co-Leader/Elder).');
            const desc = String(text || '').trim().slice(0, 200);
            if (!desc) return Reply(`📝 Contoh: \`${pfx}clandesc Clan petarung aktif nomor 1!\``);
            clan.desc = desc;
            saveClans();
            return Reply(`✅ Deskripsi clan *${clan.name}* diperbarui:\n> _"${desc}"_`);
        }

        if (cmd === 'clanrename') {
            if (clan.leader !== m.sender) return Reply('🔒 Hanya *Leader Clan* yang dapat mengganti nama clan.');
            const newName = String(text || '').trim();
            if (!newName || newName.length > 20 || !/^[a-zA-Z0-9\s]+$/.test(newName)) {
                return Reply(`📝 Contoh: \`${pfx}clanrename Shadow Monarch\` *(maks 20 karakter, biaya kas Rp 50.000)*`);
            }
            if (clan.bank < 50000) return Reply('❌ Kas clan butuh minimal *Rp 50.000* untuk ganti nama.');
            clan.bank -= 50000;
            clan.name = newName;
            saveClans();
            return Reply(`✅ Nama clan berhasil diubah menjadi **${newName}**!`);
        }

        if (cmd === 'logoclan') {
            if (!isClanOfficer(clan, m.sender)) return Reply('🔒 Khusus pengurus clan.');
            const isImg = /image/i.test(mime || '') || m.quoted?.type === 'imageMessage' || m.type === 'imageMessage';
            if (!isImg) return Reply(`🖼️ Reply/kirim foto lalu ketik \`${pfx}logoclan\`!`);
            const buf = typeof qmsg?.download === 'function' ? await qmsg.download() : await Dinz.downloadMediaMessage(quoted || m);
            if (typeof uploadUniversalTourl === 'function') {
                const up = await uploadUniversalTourl(buf, 'clan_logo.jpg');
                const url = typeof up === 'string' ? up : up?.url;
                if (url) {
                    clan.logo = url;
                    saveClans();
                    return Reply(`✅ Logo clan *${clan.name}* berhasil diperbarui!\n> ${url}`);
                }
            }
            return Reply('❌ Gagal mengunggah logo clan.');
        }

        // 5. CLANPROMOTE / CLANDEMOTE / CLANANNOUNCE
        if (cmd === 'clanpromote' || cmd === 'clandemote') {
            if (clan.leader !== m.sender) return Reply('🔒 Hanya *Leader Clan* yang bisa mengatur jabatan member.');
            const target = (m.mentionedJid && m.mentionedJid[0]) || m.quoted?.sender;
            if (!target || !clan.members.includes(target) || target === clan.leader) {
                return Reply(`👥 Tag member clan kamu: \`${pfx}${cmd} @member\``);
            }
            if (cmd === 'clanpromote') {
                const cur = clan.roles[target] || 'Member';
                const next = cur === 'Member' ? 'Elder' : 'Co-Leader';
                clan.roles[target] = next;
                saveClans();
                return Reply(`🎖️ @${target.split('@')[0]} dinaikkan jabatannya menjadi **${next}**!`, [target]);
            } else {
                delete clan.roles[target];
                saveClans();
                return Reply(`📉 Jabatan @${target.split('@')[0]} dikembalikan menjadi **Member**.`, [target]);
            }
        }

        if (cmd === 'clanannounce') {
            if (!isClanOfficer(clan, m.sender)) return Reply('🔒 Khusus pengurus clan.');
            const msgText = String(text || m.quoted?.text || '').trim();
            if (!msgText) return Reply(`📢 Contoh: \`${pfx}clanannounce Kumpul raid jam 8 malam!\``);
            return Reply(
                `\`📢 PENGUMUMAN CLAN — ${clan.name.toUpperCase()}\`\n\n` +
                `${msgText}\n\n` +
                `👥 ${clan.members.map((j) => `@${j.split('@')[0]}`).join(' ')}`,
                clan.members
            );
        }

        // 6. CLANBOSS / CLANRAID / CLANJOINRAID
        if (cmd === 'clanboss') {
            const now = Date.now();
            const last = clan.lastBossAt || 0;
            if (now - last < 30 * 60 * 1000) {
                const waitM = Math.ceil((30 * 60 * 1000 - (now - last)) / 60000);
                return Reply(`⏳ Boss Clan sedang respawn! Tunggu *${waitM} menit* lagi.`);
            }
            clan.lastBossAt = now;
            const bossNames = ['🐉 Ancient Abyss Dragon', '👹 Demon Lord Behemoth', '🕷️ Void Arachne Queen', '🗿 Titan Golem'];
            const boss = bossNames[Math.floor(Math.random() * bossNames.length)];
            const win = Math.random() < Math.min(0.92, 0.58 + clan.level * 0.05 + clan.members.length * 0.03);
            if (!win) {
                clan.exp += 20;
                saveClans();
                return Reply(`💥 *${boss}* terlalu kuat! Serangan gagal, namun clan tetap mendapat *+20 XP*.`);
            }
            const xpGain = 120 + clan.level * 25;
            const goldGain = 25000 + clan.level * 8000;
            const userShare = 8000 + clan.level * 2000;
            clan.exp += xpGain;
            clan.bank += goldGain;
            clan.contrib[m.sender] = (clan.contrib[m.sender] || 0) + xpGain;
            user.money = (user.money || 0) + userShare;
            saveClans();
            return Reply(
                `🏆 *BOSS CLAN DIKALAHKAN!*\n` +
                `> ◦ Boss : *${boss}*\n` +
                `> ◦ XP Clan : *+${xpGain} XP*\n` +
                `> ◦ Kas Clan : *+Rp ${formatNumber(goldGain)}*\n` +
                `> ◦ Bonus Kamu : *+Rp ${formatNumber(userShare)}*`
            );
        }

        if (cmd === 'clanraid') {
            if (!isClanOfficer(clan, m.sender)) return Reply('🔒 Hanya pengurus clan yang dapat membuka Raid.');
            if (clan.activeRaid && Date.now() < clan.activeRaid.endsAt) {
                return Reply(`⚔️ Raid sudah aktif! Ketik \`${pfx}clanjoinraid\` untuk ikut menyerang.`);
            }
            clan.activeRaid = {
                bossHp: 1000 + clan.level * 400,
                maxHp: 1000 + clan.level * 400,
                attackers: [],
                endsAt: Date.now() + 15 * 60 * 1000
            };
            saveClans();
            return Reply(
                `\`🔥 CLAN RAID DIMULAI — ${clan.name}\`\n` +
                `> ◦ HP Raid Boss : *${formatNumber(clan.activeRaid.bossHp)} HP*\n` +
                `> ◦ Durasi : *15 menit*\n` +
                `> 💡 Semua member clan ketik \`${pfx}clanjoinraid\` untuk menyerang bersama!`
            );
        }

        if (cmd === 'clanjoinraid') {
            const raid = clan.activeRaid;
            if (!raid || Date.now() > raid.endsAt) {
                return Reply(`❌ Belum ada Raid aktif di clan kamu. Pengurus bisa memulai dengan \`${pfx}clanraid\`.`);
            }
            if (raid.attackers.includes(m.sender)) {
                return Reply('⚔️ Kamu sudah menyerang di sesi Raid ini! Ajak member clan lain.');
            }
            const dmg = 350 + Math.floor(Math.random() * 450) + (user.level || 1) * 15;
            raid.bossHp = Math.max(0, raid.bossHp - dmg);
            raid.attackers.push(m.sender);
            if (raid.bossHp <= 0) {
                const bonusKas = 60000 + clan.level * 15000;
                const bonusXp = 220;
                clan.bank += bonusKas;
                clan.exp += bonusXp;
                for (const atk of raid.attackers) {
                    const u = getUser(atk);
                    u.money = (u.money || 0) + 15000;
                    clan.contrib[atk] = (clan.contrib[atk] || 0) + 60;
                }
                delete clan.activeRaid;
                saveClans();
                return Reply(
                    `🎉 *RAID BOSS TUMBANG!* Serangan *${dmg} DMG* menamatkan Boss!\n` +
                    `> ◦ Kas Clan : *+Rp ${formatNumber(bonusKas)}* & *+${bonusXp} XP*\n` +
                    `> ◦ Semua penyerang mendapat *+Rp 15.000*!`
                );
            }
            saveClans();
            return Reply(`⚔️ Kamu memberikan *${formatNumber(dmg)} DMG*!\n> Sisa HP Raid Boss: *${formatNumber(raid.bossHp)} / ${formatNumber(raid.maxHp)} HP*`);
        }

        // 7. CLANRAPORT / CLANWARACCEPT / CLANWARHISTORY / CLANWARSCORE
        if (cmd === 'clanraport' || cmd === 'clanwarscore' || cmd === 'clanwarhistory') {
            const hist = (clan.warHistory || []).slice(-8).reverse();
            const histLines = hist.length
                ? hist.map((h, i) => `> ${i + 1}. ${h.win ? '🟢 MENANG' : '🔴 KALAH'} vs *${h.enemy}* (${h.date || '-'})`)
                : ['> _Belum ada riwayat Clan War tercatat_'];
            return Reply(
                `\`📊 RAPOR & SKOR CLAN — ${clan.name}\`\n` +
                `> ◦ *Level :* Lv.${clan.level} (${formatNumber(clan.exp)} XP)\n` +
                `> ◦ *Kas Clan :* Rp ${formatNumber(clan.bank)}\n` +
                `> ◦ *Member :* ${clan.members.length} anggota\n` +
                `> ◦ *Rekor War :* *${clan.wins || 0} Menang* / *${clan.losses || 0} Kalah*\n\n` +
                `*📜 Riwayat Terakhir:*\n${histLines.join('\n')}`
            );
        }

        if (cmd === 'clanwaraccept') {
            return Reply(`⚔️ Untuk bertarung antar clan secara instan, gunakan \`${pfx}clanwar <nama/id clan lawan>\`!`);
        }

        return true;
    }
};
