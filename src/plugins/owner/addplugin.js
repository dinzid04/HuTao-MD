const vm = require('vm');
const Module = require('module');
const { formatCard } = require('../../utils/formatter');

const TEMPLATE_SNIPPET = `module.exports = {
    name: 'contoh',
    category: 'tools',
    commands: ['contoh'],

    async execute(ctx) {
        const { Reply, text } = ctx;
        await Reply(\`Halo! Input kamu: \${text || '-'}\`);
        return true;
    }
};`;

function extractQuotedText(m) {
    if (!m || !m.quoted) return '';
    const q = m.quoted;
    return String(
        q.text ||
        q.body ||
        q.msg?.conversation ||
        q.msg?.extendedTextMessage?.text ||
        q.msg?.caption ||
        q.caption ||
        ''
    ).trim();
}

function unwrapCodeBlock(raw) {
    let s = String(raw || '').trim();
    const fence = s.match(/^```(?:js|javascript)?\s*\r?\n([\s\S]*?)\r?\n```$/i);
    if (fence) s = fence[1].trim();
    return s;
}

module.exports = {
    name: 'addplugin',
    category: 'owner',
    commands: ['addplugin', 'addfitur', 'addcase'],

    async execute(ctx) {
        const { Dinz, m, text, isCreator, isMainOwner, Reply, fs, path, pluginLoader, usedPrefix } = ctx;

        if (Dinz.isJadibot || !isMainOwner) return Reply('🔒 Fitur ini khusus owner bot utama.');
        if (!isCreator) return Reply(global.mess.owner);

        const rawText = String(text || '').trim();
        if (!rawText || rawText.toLowerCase() === 'template' || rawText.toLowerCase() === 'help') {
            return Reply(
                formatCard({
                    icon: '🧩',
                    title: 'ADD PLUGIN (PER-FITUR)',
                    body:
                        `Cara pakai:\n` +
                        `1. *Reply pesan berisi kode JS*, lalu ketik:\n` +
                        `   \`${usedPrefix}addplugin tools/namafitur\`\n\n` +
                        `2. *Atau kirim langsung dalam 1 pesan:*\n` +
                        `   \`${usedPrefix}addplugin tools/namafitur\`\n` +
                        `   *(baris baru isi kode plugin)*\n\n` +
                        `Contoh template plugin:\n` +
                        `\`\`\`javascript\n${TEMPLATE_SNIPPET}\n\`\`\``
                })
            );
        }

        const firstBreak = rawText.search(/\r?\n/);
        let targetSpec = '';
        let inlineCode = '';
        if (firstBreak !== -1) {
            targetSpec = rawText.slice(0, firstBreak).trim();
            inlineCode = rawText.slice(firstBreak + 1).trim();
        } else {
            const firstSpace = rawText.indexOf(' ');
            if (firstSpace !== -1 && !extractQuotedText(m)) {
                targetSpec = rawText.slice(0, firstSpace).trim();
                inlineCode = rawText.slice(firstSpace + 1).trim();
            } else {
                targetSpec = rawText.trim();
            }
        }

        const quotedCode = extractQuotedText(m);
        const code = unwrapCodeBlock(inlineCode || quotedCode);

        if (!code) {
            return Reply(`❌ Kode plugin kosong.\n> ◦ Reply pesan berisi kode JS lalu ketik \`${usedPrefix}addplugin ${targetSpec}\`, atau tulis kodenya di baris baru.`);
        }

        const cleanSpec = targetSpec.replace(/\\/g, '/').replace(/^src\/plugins\//i, '').replace(/^\//, '').replace(/\.js$/i, '');
        const parts = cleanSpec.split('/').filter(Boolean);
        if (parts.length !== 2) {
            return Reply(`❌ Format path harus \`<kategori>/<namafile>\`.\n> ◦ Contoh: \`${usedPrefix}addplugin tools/sapa\``);
        }

        const [category, fileBase] = parts.map((p) => p.toLowerCase());
        const validSeg = /^[a-z0-9][a-z0-9_-]{0,40}$/;
        if (!validSeg.test(category) || !validSeg.test(fileBase)) {
            return Reply('❌ Nama kategori dan file hanya boleh huruf, angka, `-`, atau `_` (tidak boleh diawali `_` atau simbol lain).');
        }

        const destDir = path.join(pluginLoader.PLUGINS_DIR, category);
        const destFile = path.join(destDir, `${fileBase}.js`);
        const resolvedRoot = path.resolve(pluginLoader.PLUGINS_DIR);
        const resolvedDest = path.resolve(destFile);
        if (!resolvedDest.startsWith(resolvedRoot + path.sep)) {
            return Reply('❌ Path tidak valid.');
        }

        try {
            new vm.Script(Module.wrap(code), { filename: resolvedDest });
        } catch (syntaxErr) {
            return Reply(`❌ *Syntax Error! Plugin ditolak sebelum disimpan:*\n\`\`\`\n${syntaxErr.message}\n\`\`\``);
        }

        const existedBefore = fs.existsSync(resolvedDest);
        const prevContent = existedBefore ? fs.readFileSync(resolvedDest, 'utf8') : null;

        try {
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
            fs.writeFileSync(resolvedDest, code + (code.endsWith('\n') ? '' : '\n'), 'utf8');

            delete require.cache[require.resolve(resolvedDest)];
            const testMod = require(resolvedDest);
            if (!testMod || typeof testMod.execute !== 'function') {
                throw new Error('Plugin wajib mengekspor fungsi execute(ctx) (module.exports = { name, category, commands, execute })');
            }

            const reloadRes = pluginLoader.loadAllPlugins(true);
            const cmds = Array.isArray(testMod.commands) && testMod.commands.length > 0
                ? testMod.commands.join(', ')
                : '(auto-detect)';

            await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return Reply(
                formatCard({
                    icon: '🧩',
                    title: existedBefore ? 'PLUGIN DIPERBARUI & AKTIF' : 'PLUGIN DITAMBAHKAN & AKTIF',
                    rows: [
                        { label: 'File', value: `src/plugins/${category}/${fileBase}.js` },
                        { label: 'Kategori', value: category },
                        { label: 'Command', value: cmds },
                        { label: 'Total Aktif', value: `${reloadRes.plugins.length} fitur (${reloadRes.validCommands.length} command)` }
                    ]
                })
            );
        } catch (err) {
            try {
                if (existedBefore && prevContent !== null) {
                    fs.writeFileSync(resolvedDest, prevContent, 'utf8');
                } else if (fs.existsSync(resolvedDest)) {
                    fs.unlinkSync(resolvedDest);
                }
                delete require.cache[require.resolve(resolvedDest)];
                pluginLoader.loadAllPlugins(true);
            } catch (_) {}
            return Reply(`❌ *Gagal memuat plugin (perubahan dibatalkan otomatis):*\n\`\`\`\n${err.message}\n\`\`\``);
        }
    }
};
