const { convertEsmToCjs } = require('./_helper');

module.exports = {
    name: 'esmtocjs',
    category: 'tools',
    commands: ['esmtocjs'],

    async execute(ctx) {
        const { m, text, Reply, usedPrefix } = ctx;

        const code = text.trim() || m.quoted?.body?.trim();
        if (!code) return Reply(`⚠️ Kirim atau reply kode ESM.\nContoh: \`${usedPrefix}esmtocjs import fs from 'fs'\``);
        return Reply(`\`\`\`javascript\n${convertEsmToCjs(code)}\n\`\`\``);
    }
};
