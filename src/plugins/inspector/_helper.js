const PhoneNumber = require('awesome-phonenumber');
const { formatCard, toBoldSans } = require('../../utils/formatter');
const {
    recordLidMapping,
    recordLidPair,
    resolveLidToPhone,
    resolvePhoneToLid,
    hydrateLidCache,
    isLikelyLidNumber
} = require('../../core/message');

const regionDisplay = (() => {
    try {
        return new Intl.DisplayNames(['id'], { type: 'region' });
    } catch {
        return null;
    }
})();

function cleanDigits(val) {
    return String(val || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function formatIntlPhone(digits) {
    if (!digits || isLikelyLidNumber(digits)) return { intl: '-', country: '-' };
    try {
        const pn = PhoneNumber('+' + digits);
        const intl = pn.isValid() ? pn.getNumber('international') : '+' + digits;
        const code = pn.getRegionCode('mobile') || pn.getRegionCode();
        const country = code && regionDisplay ? `${regionDisplay.of(code)} (${code})` : (code || '-');
        return { intl, country };
    } catch {
        return { intl: '+' + digits, country: '-' };
    }
}

async function resolveFullIdentity({ Dinz, m, store, rawInput, isCreator, isPremiumUser, loadOwners, botCtx }) {
    hydrateLidCache(Dinz);

    let inputType = 'Self';
    let targetRaw = m.sender;

    if (rawInput) {
        const cleanedArg = rawInput.trim().replace(/^@/, '');
        if (cleanedArg.endsWith('@lid')) {
            targetRaw = cleanedArg;
            inputType = 'LID Langsung';
        } else if (cleanedArg.endsWith('@s.whatsapp.net')) {
            targetRaw = cleanedArg;
            inputType = 'JID Langsung';
        } else {
            let digits = cleanedArg.replace(/[^0-9]/g, '');
            if (digits.startsWith('08')) digits = '62' + digits.slice(1);
            if (digits) {
                targetRaw = isLikelyLidNumber(digits) ? `${digits}@lid` : `${digits}@s.whatsapp.net`;
                inputType = isLikelyLidNumber(digits) ? 'Angka LID' : 'Nomor Telepon';
            }
        }
    } else if (m.mentionedJid && m.mentionedJid.length > 0) {
        targetRaw = m.mentionedJid[0];
        inputType = 'Mention / Tag';
    } else if (m.quoted && m.quoted.sender) {
        targetRaw = m.quoted.sender;
        inputType = 'Reply Pesan';
    }

    const rawDigits = cleanDigits(targetRaw);
    const sources = new Set();

    let metadata = m.isGroup ? (m.metadata || null) : null;
    let participant = null;

    const findInParticipants = (meta) => {
        if (!meta?.participants?.length) return null;
        recordLidMapping(meta.participants, meta, Dinz);
        return meta.participants.find((p) => {
            const fields = [p.id, p.jid, p.lid, p.phoneNumber].filter(Boolean).map(cleanDigits);
            return fields.includes(rawDigits);
        }) || null;
    };

    if (m.isGroup) {
        participant = findInParticipants(metadata);
        if (!participant) {
            try {
                const freshMeta = await Dinz.groupMetadata(m.chat);
                if (freshMeta?.participants) {
                    metadata = freshMeta;
                    participant = findInParticipants(freshMeta);
                }
            } catch (_) {}
        }
        if (participant) sources.add('Group Metadata');
    }

    let phoneNum = '';
    let lidNum = '';
    let displayName = '';

    if (targetRaw.endsWith('@lid') || isLikelyLidNumber(rawDigits)) {
        lidNum = rawDigits;
    } else if (rawDigits) {
        phoneNum = rawDigits;
    }

    if (participant) {
        for (const f of [participant.jid, participant.phoneNumber, participant.id, participant.lid].filter(Boolean)) {
            const s = String(f);
            const d = cleanDigits(s);
            if (!d) continue;
            if (s.includes('@lid') || isLikelyLidNumber(d)) {
                if (!lidNum) lidNum = d;
            } else {
                if (!phoneNum) phoneNum = d;
            }
        }
        if (participant.notify || participant.name || participant.verifiedName) {
            displayName = participant.notify || participant.name || participant.verifiedName;
        }
    }

    if (!phoneNum && lidNum) {
        const resolved = resolveLidToPhone(`${lidNum}@lid`, metadata);
        if (resolved && !resolved.endsWith('@lid')) {
            const d = cleanDigits(resolved);
            if (d && !isLikelyLidNumber(d)) {
                phoneNum = d;
                sources.add('LID Cache DB');
            }
        }
    }

    if (!lidNum && phoneNum) {
        const resolvedLid = resolvePhoneToLid(`${phoneNum}@s.whatsapp.net`, metadata);
        if (resolvedLid) {
            lidNum = cleanDigits(resolvedLid);
            sources.add('LID Cache DB');
        }
    }

    try {
        const repo = Dinz.signalRepository || Dinz.repository;
        if (repo?.lidMapping) {
            if (!phoneNum && lidNum && typeof repo.lidMapping.getPNForLID === 'function') {
                const pn = await repo.lidMapping.getPNForLID(`${lidNum}@lid`);
                const d = cleanDigits(pn);
                if (d && !isLikelyLidNumber(d)) {
                    phoneNum = d;
                    sources.add('Signal Repo');
                }
            }
            if (!lidNum && phoneNum && typeof repo.lidMapping.getLIDForPN === 'function') {
                const lid = await repo.lidMapping.getLIDForPN(`${phoneNum}@s.whatsapp.net`);
                const d = cleanDigits(lid);
                if (d) {
                    lidNum = d;
                    sources.add('Signal Repo');
                }
            }
        }
    } catch (_) {}

    if (inputType === 'Self') {
        if (!lidNum && m.senderLid) {
            lidNum = cleanDigits(m.senderLid);
            sources.add('Message Key');
        }
        if (!displayName && m.pushName && m.pushName !== 'User') {
            displayName = m.pushName;
        }
    }
    const botPhone = cleanDigits(Dinz.user?.id);
    const botLid = cleanDigits(Dinz.user?.lid);
    if ((phoneNum && phoneNum === botPhone) || (lidNum && lidNum === botLid)) {
        if (botPhone) phoneNum = botPhone;
        if (botLid) lidNum = botLid;
        if (!displayName) displayName = Dinz.user?.name || global.botname || 'Bot';
        sources.add('Bot Session');
    }

    if (store?.contacts) {
        const jidKey = phoneNum ? `${phoneNum}@s.whatsapp.net` : '';
        const lidKey = lidNum ? `${lidNum}@lid` : '';
        const contact = (jidKey && store.contacts[jidKey]) || (lidKey && store.contacts[lidKey]) || null;
        if (contact) {
            if (!lidNum && contact.lid) {
                lidNum = cleanDigits(contact.lid);
                sources.add('Store Contacts');
            }
            if (!displayName) {
                displayName = contact.name || contact.verifiedName || contact.notify || '';
            }
        }
        if (!phoneNum && lidNum) {
            for (const [cJid, cObj] of Object.entries(store.contacts)) {
                if (cleanDigits(cObj?.lid) === lidNum && cJid.endsWith('@s.whatsapp.net')) {
                    const d = cleanDigits(cJid);
                    if (d && !isLikelyLidNumber(d)) {
                        phoneNum = d;
                        if (!displayName) displayName = cObj.name || cObj.verifiedName || cObj.notify || '';
                        sources.add('Store Contacts');
                        break;
                    }
                }
            }
        }
    }

    let waExists = null;
    if (phoneNum && typeof Dinz.onWhatsApp === 'function') {
        try {
            const check = await Dinz.onWhatsApp(`${phoneNum}@s.whatsapp.net`);
            const first = Array.isArray(check) ? check[0] : null;
            if (first) {
                waExists = Boolean(first.exists);
                if (first.jid && first.jid.endsWith('@s.whatsapp.net')) {
                    phoneNum = cleanDigits(first.jid);
                }
                if (!lidNum && first.lid) {
                    lidNum = cleanDigits(first.lid);
                    sources.add('WhatsApp Server');
                }
            }
        } catch (_) {}
    }

    const jid = phoneNum ? `${phoneNum}@s.whatsapp.net` : '';
    const lid = lidNum ? `${lidNum}@lid` : '';

    if (!displayName) {
        displayName = (phoneNum && global.lidNames?.[phoneNum])
            || (lidNum && global.lidNames?.[lidNum])
            || '';
    }
    if (!displayName && jid && typeof Dinz.getName === 'function') {
        try {
            const fetched = await Dinz.getName(jid);
            if (fetched && cleanDigits(fetched) !== phoneNum) displayName = fetched;
        } catch (_) {}
    }
    if (!displayName && inputType === 'Reply Pesan' && m.quoted?.pushName) {
        displayName = m.quoted.pushName;
    }
    if (!displayName) displayName = 'Tidak Diketahui';

    if (lidNum && phoneNum) {
        recordLidPair(lidNum, phoneNum, displayName !== 'Tidak Diketahui' ? displayName : '', Dinz);
    }

    const groupRole = (() => {
        if (!m.isGroup) return 'Private Chat';
        if (!participant) return 'Bukan Member Grup Ini';
        if (participant.admin === 'superadmin') return 'Creator / SuperAdmin';
        if (participant.admin === 'admin') return 'Admin Grup';
        return 'Member Biasa';
    })();

    const ownerNums = [
        String(global.owner || '').replace(/[^0-9]/g, ''),
        ...(loadOwners(Dinz) || []).map((v) => String(v).replace(/[^0-9]/g, ''))
    ].filter(Boolean);
    const isTargetOwner = Boolean((phoneNum && ownerNums.includes(phoneNum)) || (phoneNum && phoneNum === botPhone));
    const isTargetPrem = jid ? isPremiumUser(jid, isTargetOwner) : false;
    const botRole = isTargetOwner ? 'Owner Bot' : isTargetPrem ? 'Premium User' : 'Regular User';

    const { intl, country } = formatIntlPhone(phoneNum);

    return {
        inputType,
        displayName,
        phoneNum,
        intl,
        country,
        jid,
        lid,
        lidNum,
        waExists,
        groupRole,
        botRole,
        sources: sources.size > 0 ? [...sources].join(', ') : 'Input Langsung',
        totalCached: Object.keys(global.lidMap || {}).length
    };
}

module.exports = {
    PhoneNumber,
    formatCard,
    toBoldSans,
    recordLidMapping,
    recordLidPair,
    resolveLidToPhone,
    resolvePhoneToLid,
    hydrateLidCache,
    isLikelyLidNumber,
    regionDisplay,
    cleanDigits,
    formatIntlPhone,
    resolveFullIdentity
};
