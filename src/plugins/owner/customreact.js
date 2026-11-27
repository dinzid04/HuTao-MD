const fs = require('fs');
const path = require('path');
const customReact = require('../../services/custom-react');
const { formatCard, toMono, toBoldSans } = require('../../utils/formatter');

function describeItem(item, idx) {
    if (!item) return `${idx + 1}. (kosong)`;
    if (item.type === 'emoji') return `${idx + 1}. Emoji ${item.emoji}`;
    const tag = item.stickerName ? `Stiker "${item.stickerName}"` : 'Stiker Custom';
    return `${idx + 1}. 🖼️ ${tag}${item.isAnimated ? ' (Animasi)' : ''}`;
}

module.exports = {
    name: 'customreact',
    category: 'owner',
    commands: [
        'customreact', 'creact', 'autoreactcmd',
        'addreact', 'setreact', 'delreact', 'listreact', 'clearreact',
        'reactcount', 'setreactcount',
        'savereact', 'delreactsticker', 'listreactsticker'
    ],

    async execute(ctx) {
        const { Dinz, m, command, args, isCreator, Reply, usedPrefix } = ctx;
        if (!isCreator) return Reply(global.mess.owner);

        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();
        const cfg = customReact.getConfig(Dinz);

        // Toggle ON / OFF atau Dashboard utama (.customreact / .creact)
        if (cmd === 'customreact' || cmd === 'creact' || cmd === 'autoreactcmd') {
            const sub = (args[0] || '').toLowerCase();
            if (sub === 'on' || sub === 'enable' || sub === 'aktif') {
                cfg.enabled = true;
                customReact.saveConfig(Dinz, cfg);
                return Reply(`✅ *Custom Auto-React diaktifkan!*\n> ◦ Total command diatur : *${Object.keys(cfg.rules).length}*\n> ◦ Ketik \`${pfx}listreact\` untuk melihat daftarnya.`);
            }
            if (sub === 'off' || sub === 'disable' || sub === 'mati') {
                cfg.enabled = false;
                customReact.saveConfig(Dinz, cfg);
                return Reply('🔴 *Custom Auto-React dinonaktifkan.* Pengaturan stiker & command tetap tersimpan.');
            }

            const ruleEntries = Object.entries(cfg.rules);
            const stickerNames = Object.keys(cfg.stickers);
            return Reply(formatCard({
                icon: '✨',
                title: 'CUSTOM AUTO-REACT (STIKER & EMOJI)',
                rows: [
                    { label: 'Status', value: cfg.enabled ? '🟢 ON (Aktif)' : '🔴 OFF (Nonaktif)' },
                    { label: 'Command Diatur', value: `${ruleEntries.length} target` },
                    { label: 'Stiker Tersimpan', value: `${stickerNames.length} preset` }
                ],
                body:
                    `*${toBoldSans('Panduan Cepat:')}*\n` +
                    `◦ ${toMono(`${pfx}customreact on/off`)} — aktifkan/matikan\n` +
                    `◦ ${toMono(`${pfx}addreact menu`)} *(reply stiker/foto/video)* — tambah sticker react ke \`.menu\`\n` +
                    `◦ ${toMono(`${pfx}addreact menu 3`)} *(reply stiker)* — kirim 3x react pada \`.menu\`\n` +
                    `◦ ${toMono(`${pfx}addreact all 🔥`)} — react emoji ke semua command\n` +
                    `◦ ${toMono(`${pfx}setreact play`)} *(reply stiker)* — ganti react khusus \`.play\`\n` +
                    `◦ ${toMono(`${pfx}reactcount menu 3`)} — ubah jumlah react (1–5)\n` +
                    `◦ ${toMono(`${pfx}savereact hutao`)} *(reply stiker)* — simpan stiker ke library\n` +
                    `◦ ${toMono(`${pfx}addreact allmenu hutao`)} — pakai stiker tersimpan\n` +
                    `◦ ${toMono(`${pfx}listreact`)} / ${toMono(`${pfx}delreact menu`)} / ${toMono(`${pfx}clearreact`)}`
            }));
        }

        // Simpan stiker ke library preset (.savereact <nama>)
        if (cmd === 'savereact') {
            const presetName = String(args[0] || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
            if (!presetName) {
                return Reply(`🖼️ Reply stiker/foto/video lalu ketik:\n> \`${pfx}savereact <nama>\`\n> Contoh: \`${pfx}savereact hutao\``);
            }
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            const captured = await customReact.captureStickerFromContext(ctx, `preset_${presetName}`);
            if (!captured) {
                await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return Reply('❌ Reply *stiker*, *foto*, atau *video* yang mau disimpan sebagai stiker react!');
            }
            cfg.stickers[presetName] = {
                ...captured,
                addedAt: Date.now()
            };
            customReact.saveConfig(Dinz, cfg);
            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(
                `✅ *Stiker React "${presetName}" disimpan!*\n` +
                `> ◦ Gunakan ke command: \`${pfx}addreact menu ${presetName}\`\n` +
                `> ◦ Atau ke semua command: \`${pfx}addreact all ${presetName}\``
            );
        }

        if (cmd === 'delreactsticker') {
            const presetName = String(args[0] || '').trim().toLowerCase();
            if (!presetName || !cfg.stickers[presetName]) {
                return Reply(`❌ Preset stiker *${presetName || '-'}* tidak ditemukan. Cek dengan \`${pfx}listreactsticker\`.`);
            }
            const f = cfg.stickers[presetName].file;
            if (f) {
                try {
                    const abs = path.isAbsolute(f) ? f : path.join(process.cwd(), f);
                    if (fs.existsSync(abs)) fs.unlinkSync(abs);
                } catch (_) {}
            }
            delete cfg.stickers[presetName];
            customReact.saveConfig(Dinz, cfg);
            return Reply(`🗑️ Preset stiker react *${presetName}* berhasil dihapus.`);
        }

        if (cmd === 'listreactsticker') {
            const entries = Object.entries(cfg.stickers);
            if (!entries.length) {
                return Reply(`📭 Belum ada preset stiker react tersimpan.\n> Reply stiker lalu ketik \`${pfx}savereact <nama>\``);
            }
            const lines = entries.map(([name, st], i) => `> ${i + 1}. \`${name}\`${st.isAnimated ? ' (Animasi)' : ''}`);
            return Reply(`\`🖼️ LIBRARY STIKER REACT (${entries.length})\`\n${lines.join('\n')}\n\n💡 Pakai: \`${pfx}addreact <cmd|all> <nama>\``);
        }

        // Tambah / Ganti React untuk command tertentu atau 'all'
        if (cmd === 'addreact' || cmd === 'setreact') {
            const targetKey = customReact.normalizeCmdKey(args[0]);
            if (!targetKey) {
                return Reply(
                    `\`✨ ${cmd === 'setreact' ? 'Set' : 'Tambah'} Custom React\`\n` +
                    `> ◦ *Pakai Stiker (reply stiker/foto/video):*\n` +
                    `  \`${pfx}${cmd} menu\` atau \`${pfx}${cmd} menu 3\`\n` +
                    `> ◦ *Pakai Preset Stiker tersimpan:*\n` +
                    `  \`${pfx}${cmd} menu <namaPreset> [jumlah]\`\n` +
                    `> ◦ *Pakai Emoji:*\n` +
                    `  \`${pfx}${cmd} menu 🔥\` atau \`${pfx}${cmd} all ✨ 2\``
                );
            }

            let newItem = null;
            let explicitCount = null;
            const arg1 = args[1] || '';
            const arg2 = args[2] || '';

            // Cek jika arg1 adalah angka jumlah (misal: .addreact menu 3 sambil reply stiker)
            if (/^\d+$/.test(arg1)) {
                explicitCount = Math.max(1, Math.min(customReact.MAX_REACT_COUNT, parseInt(arg1, 10)));
            } else if (/^\d+$/.test(arg2)) {
                explicitCount = Math.max(1, Math.min(customReact.MAX_REACT_COUNT, parseInt(arg2, 10)));
            }

            // 1. Cek jika arg1 adalah nama preset stiker tersimpan
            const presetHit = arg1 && !/^\d+$/.test(arg1) ? cfg.stickers[arg1.toLowerCase()] : null;
            if (presetHit) {
                newItem = {
                    type: 'sticker',
                    stickerName: arg1.toLowerCase(),
                    payload: presetHit.payload || null,
                    file: presetHit.file || '',
                    isAnimated: Boolean(presetHit.isAnimated),
                    isLottie: Boolean(presetHit.isLottie)
                };
            }

            // 2. Cek apakah user me-reply stiker / foto / video
            if (!newItem) {
                const captured = await customReact.captureStickerFromContext(ctx, `cmd_${targetKey}`);
                if (captured) {
                    newItem = {
                        type: 'sticker',
                        stickerName: '',
                        ...captured
                    };
                }
            }

            // 3. Jika bukan stiker, anggap arg1 sebagai Emoji
            if (!newItem && arg1 && !/^\d+$/.test(arg1)) {
                newItem = {
                    type: 'emoji',
                    emoji: arg1.trim()
                };
            }

            if (!newItem) {
                return Reply(`❌ Reply *stiker/foto/video*, atau tulis *emoji* / *nama preset stiker*!\n> Contoh: \`${pfx}${cmd} ${targetKey} 🔥\` atau reply stiker dengan \`${pfx}${cmd} ${targetKey}\``);
            }

            if (cmd === 'setreact' || !cfg.rules[targetKey]) {
                cfg.rules[targetKey] = {
                    items: [newItem],
                    count: explicitCount || 1
                };
            } else {
                const cur = cfg.rules[targetKey];
                cur.items = Array.isArray(cur.items) ? cur.items : [];
                cur.items.push(newItem);
                cur.count = explicitCount || Math.min(customReact.MAX_REACT_COUNT, Math.max(cur.count || 1, cur.items.length));
            }

            // Otomatis aktifkan customreact saat owner menambah rule pertama
            cfg.enabled = true;
            customReact.saveConfig(Dinz, cfg);

            const rule = cfg.rules[targetKey];
            const targetLabel = targetKey === 'all' ? 'SEMUA COMMAND (all)' : `${pfx}${targetKey}`;
            const itemList = rule.items.map((it, i) => `> ${describeItem(it, i)}`).join('\n');
            return Reply(
                `✅ *Custom React tersimpan & aktif!*\n` +
                `> ◦ *Target :* \`${targetLabel}\`\n` +
                `> ◦ *Jumlah React :* *${rule.count}x*\n` +
                `> ◦ *Daftar React :*\n${itemList}\n\n` +
                `💡 Ubah jumlah react: \`${pfx}reactcount ${targetKey} <1-${customReact.MAX_REACT_COUNT}>\``
            );
        }

        // Atur jumlah react per command (.reactcount <cmd|all> <1-5>)
        if (cmd === 'reactcount' || cmd === 'setreactcount') {
            const targetKey = customReact.normalizeCmdKey(args[0]);
            const num = parseInt(args[1], 10);
            if (!targetKey || !Number.isInteger(num) || num < 1 || num > customReact.MAX_REACT_COUNT) {
                return Reply(`❌ Format: \`${pfx}reactcount <cmd|all> <1-${customReact.MAX_REACT_COUNT}>\`\n> Contoh: \`${pfx}reactcount menu 3\``);
            }
            if (!cfg.rules[targetKey]) {
                return Reply(`❌ Command *${targetKey}* belum punya custom react. Tambah dulu pakai \`${pfx}addreact ${targetKey}\`.`);
            }
            cfg.rules[targetKey].count = num;
            customReact.saveConfig(Dinz, cfg);
            return Reply(`✅ Jumlah react untuk \`${targetKey === 'all' ? 'all' : pfx + targetKey}\` diatur menjadi *${num}x*!`);
        }

        // Hapus rule atau 1 item react (.delreact <cmd|all> [nomor])
        if (cmd === 'delreact') {
            const targetKey = customReact.normalizeCmdKey(args[0]);
            if (!targetKey || !cfg.rules[targetKey]) {
                return Reply(`❌ Target *${targetKey || '-'}* tidak ditemukan di daftar custom react.\n> Cek daftar: \`${pfx}listreact\``);
            }
            const idxNum = parseInt(args[1], 10);
            if (Number.isInteger(idxNum) && idxNum >= 1 && idxNum <= (cfg.rules[targetKey].items || []).length) {
                cfg.rules[targetKey].items.splice(idxNum - 1, 1);
                if (!cfg.rules[targetKey].items.length) {
                    delete cfg.rules[targetKey];
                } else if (cfg.rules[targetKey].count > customReact.MAX_REACT_COUNT) {
                    cfg.rules[targetKey].count = cfg.rules[targetKey].items.length;
                }
                customReact.saveConfig(Dinz, cfg);
                return Reply(`🗑️ React urutan ke-*${idxNum}* pada \`${targetKey}\` berhasil dihapus.`);
            }
            delete cfg.rules[targetKey];
            customReact.saveConfig(Dinz, cfg);
            return Reply(`🗑️ Semua custom react untuk \`${targetKey === 'all' ? 'all' : pfx + targetKey}\` berhasil dihapus.`);
        }

        if (cmd === 'clearreact') {
            cfg.rules = {};
            customReact.saveConfig(Dinz, cfg);
            return Reply('🗑️ Seluruh rule Custom Auto-React berhasil dikosongkan (preset stiker di library tetap aman).');
        }

        if (cmd === 'listreact') {
            const entries = Object.entries(cfg.rules);
            const stickers = Object.keys(cfg.stickers);
            if (!entries.length && !stickers.length) {
                return Reply(`📭 Belum ada Custom Auto-React yang diatur.\n> Ketik \`${pfx}customreact\` untuk melihat cara pasang.`);
            }
            const blocks = entries.map(([k, r]) => {
                const label = k === 'all' ? '🌐 SEMUA COMMAND (all)' : `📌 ${pfx}${k}`;
                const its = (r.items || []).map((it, i) => `   ${describeItem(it, i)}`).join('\n');
                return `*${label}* — *${r.count || 1}x react*\n${its}`;
            });
            const stLine = stickers.length ? `\n\n🖼️ *Library Stiker (${stickers.length}):* ${stickers.map((s) => `\`${s}\``).join(', ')}` : '';
            return Reply(
                `\`✨ DAFTAR CUSTOM AUTO-REACT\`\n` +
                `> ◦ *Status :* ${cfg.enabled ? '🟢 ON' : '🔴 OFF'}\n\n` +
                `${blocks.length ? blocks.join('\n\n') : '_Belum ada target command._'}${stLine}`
            );
        }

        return true;
    }
};
