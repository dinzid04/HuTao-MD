const BASE = { target: 'node', renameGlobals: false };

const ENC_CONFIGS = {
    light: { ...BASE, compact: true, renameVariables: true },
    mini: { ...BASE, compact: true, minify: true, renameVariables: true },
    custom: { ...BASE, compact: true, renameVariables: true, stringEncoding: true, stringSplitting: true, controlFlowFlattening: 0.5, duplicateLiteralsRemoval: true },
    ghost: { ...BASE, compact: true, renameVariables: true, globalConcealing: true, stringConcealing: true, stringEncoding: true, stringSplitting: true, controlFlowFlattening: 0.6, duplicateLiteralsRemoval: true },
    hex: { ...BASE, compact: true, renameVariables: true, hexadecimalNumbers: true, stringEncoding: true, stringSplitting: true, controlFlowFlattening: 0.5, duplicateLiteralsRemoval: true },
    invis: { ...BASE, compact: true, renameVariables: true, identifierGenerator: () => '_'.repeat(Math.floor(Math.random() * 4) + 3) + Math.random().toString(36).slice(2, 5), stringEncoding: true, stringSplitting: true, controlFlowFlattening: 0.7, duplicateLiteralsRemoval: true, deadCode: 0.1, calculator: true, opaquePredicates: 0.3, rgf: true },
    siu: { ...BASE, compact: true, renameVariables: true, stringEncoding: true, stringSplitting: true, controlFlowFlattening: 0.8, duplicateLiteralsRemoval: true, deadCode: 0.15, calculator: true, rgf: true },
    matrix: { ...BASE, compact: true, renameVariables: true, stringEncoding: true, stringSplitting: true, controlFlowFlattening: 0.8, duplicateLiteralsRemoval: true, dispatcher: true, variableMasking: true, movedDeclarations: true },
    flat: { ...BASE, compact: true, renameVariables: true, stringEncoding: true, flatten: true, controlFlowFlattening: 0.7, duplicateLiteralsRemoval: true, dispatcher: true },
    strong: { ...BASE, compact: true, renameVariables: true, identifierGenerator: 'randomized', stringEncoding: true, stringSplitting: true, controlFlowFlattening: 0.8, duplicateLiteralsRemoval: true, calculator: true, dispatcher: true, deadCode: 0.2, opaquePredicates: 0.4, rgf: true },
    ultra: { ...BASE, compact: true, renameVariables: true, identifierGenerator: () => { const c = 'abcdefghijklmnopqrstuvwxyz', n = '0123456789'; return 'z' + n[Math.floor(Math.random() * n.length)] + c[Math.floor(Math.random() * c.length)] + Math.random().toString(36).slice(2, 6); }, stringEncoding: true, stringSplitting: true, controlFlowFlattening: 0.9, flatten: true, rgf: true, deadCode: 0.2, opaquePredicates: 0.5, dispatcher: true },
    bigsize: { ...BASE, compact: true, renameVariables: true, stringEncoding: true, stringSplitting: true, controlFlowFlattening: 0.9, flatten: true, rgf: true, deadCode: 0.35, opaquePredicates: 0.5, dispatcher: true, calculator: true, movedDeclarations: true },
    hard: { ...BASE, compact: true, renameVariables: true, stringEncoding: true, stringSplitting: true, controlFlowFlattening: 0.9, flatten: true, rgf: true, deadCode: 0.3, opaquePredicates: 0.5, dispatcher: true, calculator: true, astScrambler: true },
    max: { ...BASE, compact: true, renameVariables: true, stringEncoding: true, stringSplitting: true, controlFlowFlattening: 0.9, flatten: true, rgf: true, deadCode: 0.3, opaquePredicates: 0.5, dispatcher: true, calculator: true, astScrambler: true, movedDeclarations: true, variableMasking: true },
    pack: { ...BASE, compact: true, renameVariables: true, stringEncoding: true, stringSplitting: true, pack: true, controlFlowFlattening: 0.5, duplicateLiteralsRemoval: true }
};

const ENC_DESC = {
    light: 'Ringan — rename variabel saja',
    mini: 'Mini — minify + rename, ukuran mengecil',
    custom: 'Custom — encode string + CFF standar',
    ghost: 'Ghost — global & string concealing',
    hex: 'Hex — angka jadi hex + encode string',
    invis: 'Invis — identifier tak kasat mata',
    siu: 'Siu — medium bigsize + deadcode',
    matrix: 'Matrix — variable masking + moved declarations',
    flat: 'Flat — flatten fungsi + dispatcher',
    strong: 'Strong — full CFF + dispatcher + rgf',
    ultra: 'Ultra — flatten + CFF max + identifier acak',
    bigsize: 'Bigsize — ukuran paling gede aman',
    hard: 'Hard — AST Scrambler + flatten + all',
    max: 'Max — semua fitur aktif level max',
    pack: 'Pack — dibungkus pack + encode string'
};

async function runObfuscate(ctx, encType = 'custom') {
    const { Dinz, m, isCreator, Reply, fs, path, checkLimit, addLimit } = ctx;
    if (!m.quoted) return Reply('Kutip file .js untuk dienkripsi!');
    if (checkLimit(m.sender, isCreator)) return Reply(global.mess.limit);

    const fileName = m.quoted?.msg?.fileName || m.quoted?.message?.documentMessage?.fileName || m.quoted?.fileName || '';
    if (!fileName.toLowerCase().endsWith('.js')) return Reply('Kutip file `.js` untuk dienkripsi!');

    await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
    Reply(global.mess.wait);

    try {
        const mediaBuffer = await Dinz.downloadMediaMessage(m.quoted).catch(() => null);
        if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer) || mediaBuffer.length === 0) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply('❌ Gagal download file. Coba kirim ulang file .js-nya.');
        }

        const raw = mediaBuffer.toString('utf8');
        const obfConfig = ENC_CONFIGS[encType] || ENC_CONFIGS.custom;

        const JsConfuser = require('js-confuser');
        const obfResult = await JsConfuser.obfuscate(raw, obfConfig);
        const code = typeof obfResult === 'string' ? obfResult : (obfResult?.code ?? String(obfResult));

        const outName = `enc-${encType}-${Date.now()}.js`;
        const outPath = path.join(process.cwd(), 'session', outName);
        fs.writeFileSync(outPath, code, 'utf8');

        await Dinz.sendMessage(m.chat, {
            document: fs.readFileSync(outPath),
            mimetype: 'application/javascript',
            fileName: outName,
            caption: `✅ *Enkripsi Berhasil!*\n> ◦ Mode  : *${encType.toUpperCase()}*\n> ◦ Info  : ${ENC_DESC[encType]}\n> ◦ File  : ${outName}`
        }, { quoted: m });

        try { fs.unlinkSync(outPath); } catch (_) {}
        addLimit(m.sender, isCreator);
        await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
    } catch (err) {
        const isSyntaxErr = err?.code === 'BABEL_PARSER_SYNTAX_ERROR' || err?.name === 'SyntaxError';
        console.error('[ENC ERROR]', isSyntaxErr ? `SyntaxError pada input: ${err.message?.split('\n')[0]}` : (err?.message || err));
        await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
        const replyMsg = isSyntaxErr
            ? `❌ File/teks bukan JavaScript yang valid atau terdapat syntax error: ${err.message?.split('\n')[0]}`
            : `❌ Gagal enkripsi: ${err.message || err}`;
        Reply(replyMsg);
    }
    return true;
}

module.exports = {
    ENC_CONFIGS,
    ENC_DESC,
    runObfuscate
};
