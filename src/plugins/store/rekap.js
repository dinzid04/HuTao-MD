const qrisStore = require('../../services/qris-store');
const { formatCard } = require('../../utils/formatter');

module.exports = {
    name: 'rekap',
    category: 'store',
    commands: ['rekap', 'omzet', 'laporankas', 'listorder'],

    async execute(ctx) {
        const { Dinz, args, isCreator, Reply, moment, usedPrefix } = ctx;

        if (!isCreator) return Reply(global.mess.owner);

        const tz = global.db?.settings?.timezone || global.timezone || 'Asia/Jakarta';
        const mode = (args[0] || 'hari').toLowerCase();

        if (mode === 'reset') {
            if ((args[1] || '').toLowerCase() !== 'confirm') {
                return Reply(`⚠️ Konfirmasi hapus semua riwayat transaksi store:\n> ◦ Ketik: \`${usedPrefix}rekap reset confirm\``);
            }
            qrisStore.saveStoreTxStore(Dinz, { seq: 0, orders: [] });
            return Reply('✅ Seluruh riwayat transaksi & rekap omzet store berhasil direset.');
        }

        const store = qrisStore.getStoreTxStore(Dinz);
        const nowMoment = moment().tz(tz);
        const todayKey = nowMoment.format('YYYY-MM-DD');
        const monthKey = nowMoment.format('YYYY-MM');

        let filtered = store.orders;
        let titleScope = 'HARI INI';
        if (mode === 'bulan' || mode === 'month') {
            filtered = store.orders.filter((o) => moment(o.createdAt).tz(tz).format('YYYY-MM') === monthKey);
            titleScope = `BULAN ${nowMoment.format('MMMM YYYY').toUpperCase()}`;
        } else if (mode === 'semua' || mode === 'all') {
            titleScope = 'SEMUA WAKTU';
        } else if (mode === 'pending') {
            filtered = store.orders.filter((o) => o.status === 'pending');
            titleScope = 'PESANAN PENDING';
        } else {
            filtered = store.orders.filter((o) => moment(o.createdAt).tz(tz).format('YYYY-MM-DD') === todayKey);
            titleScope = `HARI INI (${nowMoment.format('DD/MM/YYYY')})`;
        }

        const doneList = filtered.filter((o) => o.status === 'done');
        const pendingList = filtered.filter((o) => o.status === 'pending');
        const cancelList = filtered.filter((o) => o.status === 'cancelled');
        const omzet = doneList.reduce((acc, o) => acc + (Number(o.price) || 0), 0);

        const recent = [...filtered].reverse().slice(0, 10);
        const recentLines = recent.length
            ? recent.map((o, i) => {
                const ic = o.status === 'done' ? '✅' : o.status === 'cancelled' ? '❌' : '⏳';
                const pr = o.price > 0 ? ` — ${qrisStore.formatRupiah(o.price)}` : '';
                return `${i + 1}. ${ic} \`${o.id}\` • *${o.item}*${pr}`;
            }).join('\n')
            : 'Belum ada transaksi pada periode ini.';

        return Reply(formatCard({
            icon: '🧾',
            title: `REKAP STORE — ${titleScope}`,
            rows: [
                { label: 'Total Omzet (Done)', value: qrisStore.formatRupiah(omzet) },
                { label: 'Selesai (Done)', value: `${doneList.length} transaksi` },
                { label: 'Diproses (Pending)', value: `${pendingList.length} transaksi` },
                { label: 'Dibatalkan', value: `${cancelList.length} transaksi` }
            ],
            body: `Transaksi Terbaru:\n${recentLines}`,
            footer: `Filter: ${usedPrefix}rekap hari | bulan | semua | pending | reset confirm`
        }));
    }
};
