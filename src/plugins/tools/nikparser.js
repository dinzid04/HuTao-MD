const { formatCard } = require('../../utils/formatter');
const { parseNikOffline } = require('./_helper');

module.exports = {
    name: 'nikparser',
    category: 'tools',
    commands: ['nikparser', 'ceknik', 'parsenik'],

    async execute(ctx) {
        const { args, Reply, usedPrefix } = ctx;

        const nik = (args[0] || '').replace(/[^0-9]/g, '');
        if (nik.length !== 16) {
            return Reply(`🪪 Masukkan 16 digit NIK yang valid.\nContoh: \`${usedPrefix}nikparser 3201010101010001\``);
        }
        const parsed = parseNikOffline(nik);
        if (!parsed) return Reply('❌ Format tanggal lahir pada NIK tidak valid.');
        return Reply(formatCard({
            icon: '🪪',
            title: 'NIK PARSER INDONESIA',
            rows: [
                { label: 'NIK', value: `\`${parsed.nik}\`` },
                { label: 'Provinsi', value: parsed.provinsi },
                { label: 'Kode Wilayah', value: parsed.kodeWilayah },
                { label: 'Jenis Kelamin', value: parsed.gender },
                { label: 'Tanggal Lahir', value: parsed.tanggalLahir },
                { label: 'Usia', value: parsed.usia },
                { label: 'Zodiak', value: parsed.zodiak },
                { label: 'Nomor Urut', value: parsed.nomorUrut }
            ]
        }));
    }
};
