const botCtx = require('../core/context');

function load() {
    try {
        const data = botCtx.getMainSection('amroles');
        const safe = data && typeof data === 'object' ? data : { pts: {}, resellers: {} };
        if (!safe.pts) safe.pts = {};
        if (!safe.resellers) safe.resellers = {};
        return safe;
    } catch (_) {
        return { pts: {}, resellers: {} };
    }
}

function save(data) {
    try {
        botCtx.setMainSection('amroles', data);
    } catch (_) {}
}

function cleanNum(raw) {
    return String(raw || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

function addPt(number) {
    const n = cleanNum(number);
    if (!n || !/^62\d{8,13}$/.test(n)) return { ok: false, message: 'Format nomor tidak valid' };
    const data = load();
    if (data.pts[n]) return { ok: false, message: `Nomor ${n} sudah menjadi PT AM` };
    data.pts[n] = { addedAt: Date.now() };
    save(data);
    return { ok: true, message: `${n} ditambahkan sebagai PT AM`, number: n };
}

function delPt(number) {
    const n = cleanNum(number);
    const data = load();
    if (!data.pts[n]) return { ok: false, message: `Nomor ${n} bukan PT AM` };
    delete data.pts[n];
    save(data);
    return { ok: true, message: `${n} dihapus dari PT AM`, number: n };
}

function isPt(number) {
    const n = cleanNum(number);
    return !!load().pts[n];
}

function listPt() {
    const data = load();
    return Object.entries(data.pts).map(([id, v]) => ({ id, addedAt: v.addedAt }));
}

function addReseller(number, quota, addedBy) {
    const n = cleanNum(number);
    if (!n || !/^62\d{8,13}$/.test(n)) return { ok: false, message: 'Format nomor tidak valid' };
    const q = parseInt(quota, 10);
    if (isNaN(q) || q <= 0) return { ok: false, message: 'Kuota harus angka > 0' };
    const data = load();
    if (data.resellers[n]) return { ok: false, message: `Nomor ${n} sudah menjadi reseller` };
    data.resellers[n] = { quota: q, used: 0, addedAt: Date.now(), addedBy: addedBy || null };
    save(data);
    return { ok: true, message: `${n} ditambahkan sebagai reseller (kuota ${q})`, number: n, quota: q };
}

function delReseller(number) {
    const n = cleanNum(number);
    const data = load();
    if (!data.resellers[n]) return { ok: false, message: `Nomor ${n} bukan reseller` };
    delete data.resellers[n];
    save(data);
    return { ok: true, message: `${n} dihapus dari reseller`, number: n };
}

function isReseller(number) {
    const n = cleanNum(number);
    const r = load().resellers[n];
    return !!r && r.used < r.quota;
}

function getReseller(number) {
    const n = cleanNum(number);
    return load().resellers[n] || null;
}

function listReseller(filterBy) {
    const data = load();
    let entries = Object.entries(data.resellers);
    if (filterBy) {
        const by = cleanNum(filterBy);
        entries = entries.filter(([, v]) => v.addedBy === by);
    }
    return entries.map(([id, v]) => ({ id, quota: v.quota, used: v.used, addedAt: v.addedAt, addedBy: v.addedBy }));
}

function useQuota(number) {
    const n = cleanNum(number);
    const data = load();
    const r = data.resellers[n];
    if (!r) return { ok: true, unlimited: true };
    if (r.used >= r.quota) return { ok: false, remaining: 0, quota: r.quota, used: r.used };
    r.used += 1;
    data.resellers[n] = r;
    save(data);
    return { ok: true, remaining: r.quota - r.used, quota: r.quota, used: r.used };
}

function getRole(number, isOwner) {
    if (isOwner) return 'owner';
    const n = cleanNum(number);
    if (isPt(n)) return 'pt';
    const r = getReseller(n);
    if (r && r.used < r.quota) return 'reseller';
    return null;
}

function canUseAm(number, isOwner) {
    return !!getRole(number, isOwner);
}

function canManageReseller(number, isOwner) {
    if (isOwner) return true;
    return isPt(number);
}

module.exports = {
    addPt, delPt, isPt, listPt,
    addReseller, delReseller, isReseller, getReseller, listReseller, useQuota,
    getRole, canUseAm, canManageReseller
};
