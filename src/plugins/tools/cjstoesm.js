const { convertCjsToEsm } = require('./_helper');

module.exports = {
    name: 'cjstoesm',
    category: 'tools',
    commands: ['cjstoesm'],

    async execute(ctx) {
        const { m, text, Reply, usedPrefix } = ctx;

        const code = text.trim() || m.quoted?.body?.trim();
        if (!code) return Reply(`⚠️ Kirim atau reply kode CommonJS.\nContoh: \`${usedPrefix}cjstoesm const fs = require('fs')\``);
        return Reply(`\`\`\`javascript\n${convertCjsToEsm(code)}\n\`\`\``);
    }
};
