const { callEngine, normalizeDigits } = require('./_helper');

module.exports = {
    name: 'callinvite',
    category: 'call',
    commands: ['callinvite', 'calladd', 'addcall', 'invitecall'],

    async execute(ctx) {
        const { m, args, Reply, example, getTargetNumber, getSenderNumber } = ctx;

        const targets = [];
        if (Array.isArray(m.mentionedJid) && m.mentionedJid.length > 0) {
            for (const jid of m.mentionedJid) {
                if (String(jid).endsWith('@lid')) targets.push(jid);
                else {
                    const d = normalizeDigits(getTargetNumber(m, jid) || jid);
                    if (d.length >= 8) targets.push(d);
                }
            }
        }
        for (const tok of args || []) {
            if (tok.startsWith('@')) continue;
            const d = normalizeDigits(tok);
            if (d.length >= 8) targets.push(d);
        }
        if (targets.length === 0) {
            const selfNum = normalizeDigits(getSenderNumber(m));
            if (selfNum) targets.push(selfNum);
        }
        if (targets.length === 0) {
            return Reply(example('@user atau 62812xxx'));
        }
        try {
            const res = await callEngine.inviteCallParticipants([...new Set(targets)]);
            return Reply(
                res.invited > 0
                    ? `📲 Berhasil mengundang/memanggil *${res.invited}* peserta ke panggilan aktif!`
                    : `⚠️ Gagal mengundang peserta: ${(res.errors || []).slice(0, 2).join('; ') || 'tidak ada panggilan aktif'}`
            );
        } catch (err) {
            return Reply(`❌ Gagal mengundang peserta ke call: ${err.message}`);
        }
        return true;
    }
};
