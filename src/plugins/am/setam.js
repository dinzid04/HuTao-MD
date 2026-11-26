const amEngine = require('../../services/am-engine');
const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'setam',
    category: 'am',
    commands: ['setam', 'setammode'],

    async execute(ctx) {
        const { Dinz, args, isCreator, Reply, botCtx, usedPrefix } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const cur = amEngine.getAmAccessConfig(Dinz);
        const target = (args[0] || '').toLowerCase();
        const mode = (args[1] || '').toLowerCase();

        if (!target || target === 'status' || target === 'cek') {
            return Reply(formatCard({
                icon: '⚙️',
                title: 'PENGATURAN AKSES AM',
                rows: [
                    { label: 'amprem', value: cur.amprem.toUpperCase() },
                    { label: 'bulkam', value: cur.bulkam.toUpperCase() },
                    { label: 'API AM', value: amEngine.getAmBaseUrl() }
                ],
                footer:
                    `Ubah akses (free / prem / role):\n` +
                    `• ${usedPrefix}setam amprem free | prem | role\n` +
                    `• ${usedPrefix}setam bulkam free | prem | role`
            }));
        }

        if (!['amprem', 'bulkam'].includes(target) || !['free', 'prem', 'premium', 'role'].includes(mode)) {
            return Reply(`❌ Format: \`${usedPrefix}setam <amprem|bulkam> <free|prem|role>\``);
        }

        const normMode = mode === 'premium' ? 'prem' : mode;
        const next = amEngine.setAmAccessConfig(Dinz, { [target]: normMode });
        const desc = normMode === 'free' ? 'FREE (Semua User)' : normMode === 'prem' ? 'PREMIUM / OWNER' : 'ROLE (Owner / PT AM / Reseller)';
        return Reply(`✅ Akses *${target}* diubah menjadi: *${desc}*\n> ◦ amprem: *${next.amprem.toUpperCase()}* | bulkam: *${next.bulkam.toUpperCase()}*`);
    }
};
