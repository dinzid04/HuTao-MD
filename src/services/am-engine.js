const axios = require('axios');
const crypto = require('crypto');
const botCtx = require('../core/context');

const DEFAULT_AM_BASE = 'https://am.gadingkencana04.workers.dev';
const GEN_EMAIL_BASE = 'https://generator.email';
const UA = 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36';

const bulkJobs = (global._amBulkJobs = global._amBulkJobs || new Map());

function getAmBaseUrl() {
    const raw = String(global.amApiBase || DEFAULT_AM_BASE).trim().replace(/\/+$/, '');
    if (!raw || raw.includes('morastore.id')) return DEFAULT_AM_BASE;
    return raw;
}

function getAmAccessConfig(Dinz) {
    const saved = botCtx.getSection('am_access', Dinz);
    return {
        amprem: saved?.amprem || 'free',
        bulkam: saved?.bulkam || 'prem'
    };
}

function setAmAccessConfig(Dinz, patch) {
    const next = { ...getAmAccessConfig(Dinz), ...patch };
    botCtx.setSection('am_access', next, Dinz);
    return next;
}

function checkAmAccess({ Dinz, feature, senderNum, isCreator, isPrem, amRoles }) {
    if (isCreator) return { allowed: true, role: 'owner' };
    const cfg = getAmAccessConfig(Dinz);
    const mode = cfg[feature] || 'role';
    if (mode === 'free') return { allowed: true, role: 'free' };
    if (mode === 'prem') {
        if (isPrem) return { allowed: true, role: 'premium' };
        const r = amRoles?.getRole ? amRoles.getRole(senderNum, false) : null;
        if (r) return { allowed: true, role: r };
        return { allowed: false, reason: global.mess.prem };
    }
    const role = amRoles?.getRole ? amRoles.getRole(senderNum, false) : null;
    if (!role) {
        return { allowed: false, reason: '`⌜ Access Denied ⌟`\n> ◦ Status : *Gagal*\n> ◦ Info : *Fitur khusus Owner, PT AM, dan Reseller*' };
    }
    if (role === 'reseller') {
        const res = amRoles.getReseller(senderNum);
        if (res && res.used >= res.quota) {
            return { allowed: false, reason: `\`⌜ Kuota Habis ⌟\`\n> ◦ Info : *Kuota reseller habis (${res.used}/${res.quota})*` };
        }
    }
    return { allowed: true, role };
}

function decodeHtmlEntities(str) {
    return String(str || '')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&#x2F;/gi, '/');
}

async function generateTempEmail() {
    const res = await axios.get(`${GEN_EMAIL_BASE}/`, {
        timeout: 15000,
        headers: { 'User-Agent': UA, Accept: 'text/html' },
        validateStatus: () => true
    });
    const html = String(res.data || '');
    const m = html.match(/id="email_ch_text"[^>]*>([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})</i);
    if (!m || !m[1]) {
        throw new Error('Gagal scrape email dari generator.email');
    }
    const rawEmail = m[1].trim().toLowerCase();
    const [, domain] = rawEmail.split('@');
    const randUser = `dinz${crypto.randomBytes(4).toString('hex')}`;
    const email = `${randUser}@${domain}`;
    const inboxUrl = `${GEN_EMAIL_BASE}/${domain}/${randUser}`;
    return { email, user: randUser, domain, inboxUrl };
}

function extractAmVerifyLinkFromHtml(html) {
    const decoded = decodeHtmlEntities(html);
    const patterns = [
        /https?:\/\/[^\s"'<>]*alightcreative\.com[^\s"'<>]*oobCode=[^\s"'<>]+/i,
        /https?:\/\/[^\s"'<>]*firebaseapp\.com\/__\/auth\/action\?[^\s"'<>]*oobCode=[^\s"'<>]+/i,
        /https?:\/\/[^\s"'<>]*\?[^\s"'<>]*oobCode=[A-Za-z0-9_.-]+[^\s"'<>]*/i,
        /https?:\/\/[^\s"'<>]*alightmotion[^\s"'<>]*(?:verify|signin|login|action)[^\s"'<>]*/i
    ];
    for (const re of patterns) {
        const match = decoded.match(re);
        if (match && match[0]) {
            return match[0].replace(/[).,;]+$/, '');
        }
    }
    return '';
}

async function fetchGeneratorInboxHtml(user, domain) {
    const url = `${GEN_EMAIL_BASE}/${domain}/${user}`;
    const res = await axios.get(url, {
        timeout: 15000,
        headers: {
            'User-Agent': UA,
            Cookie: `surl=${domain}/${user}`,
            Accept: 'text/html'
        },
        validateStatus: () => true
    });
    return String(res.data || '');
}

async function pollVerificationLink(user, domain, timeoutMs = 45000) {
    const deadline = Date.now() + timeoutMs;
    const seenPaths = new Set();

    while (Date.now() < deadline) {
        try {
            const html = await fetchGeneratorInboxHtml(user, domain);
            const directLink = extractAmVerifyLinkFromHtml(html);
            if (directLink) return directLink;

            const msgHrefMatches = [...html.matchAll(/href="(\/[^"'<>]+)"/gi)]
                .map((m) => m[1])
                .filter((href) => href.includes(domain) && href.includes(user) && href.split('/').length >= 4);

            for (const relHref of msgHrefMatches.slice(0, 4)) {
                if (seenPaths.has(relHref)) continue;
                seenPaths.add(relHref);
                try {
                    const subRes = await axios.get(`${GEN_EMAIL_BASE}${relHref}`, {
                        timeout: 12000,
                        headers: {
                            'User-Agent': UA,
                            Cookie: `surl=${domain}/${user}`,
                            Accept: 'text/html'
                        },
                        validateStatus: () => true
                    });
                    const subLink = extractAmVerifyLinkFromHtml(String(subRes.data || ''));
                    if (subLink) return subLink;
                } catch (_) {}
            }
        } catch (_) {}

        await new Promise((r) => setTimeout(r, 3500));
    }
    return '';
}

async function sendAmVerification(email) {
    const base = getAmBaseUrl();
    const res = await axios.get(`${base}/api/send`, {
        params: { email },
        timeout: 30000,
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        validateStatus: () => true
    });
    const d = res.data || {};
    const ok = res.status >= 200 && res.status < 300 && d.error === undefined && d.success !== false && d.status !== false;
    return { ok, status: res.status, data: d, message: d.message || d.error || (ok ? 'Link verifikasi terkirim' : `HTTP ${res.status}`) };
}

async function verifyAmLink(email, link) {
    const base = getAmBaseUrl();
    const res = await axios.get(`${base}/api/verify`, {
        params: { email, link },
        timeout: 45000,
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        validateStatus: () => true
    });
    const d = res.data || {};
    const ok = res.status >= 200 && res.status < 300 && d.error === undefined && d.success !== false && d.status !== false;
    return { ok, status: res.status, data: d, message: d.message || d.error || (ok ? 'Akun terverifikasi & aktif' : `HTTP ${res.status}`) };
}

async function createSingleAutoAmAccount() {
    const temp = await generateTempEmail();
    const sendRes = await sendAmVerification(temp.email);
    if (!sendRes.ok) {
        return {
            ok: false,
            email: temp.email,
            inbox_url: temp.inboxUrl,
            reason: `Send gagal: ${sendRes.message}`
        };
    }

    const verifLink = await pollVerificationLink(temp.user, temp.domain, 45000);
    if (!verifLink) {
        return {
            ok: false,
            email: temp.email,
            inbox_url: temp.inboxUrl,
            reason: 'Timeout menunggu link verifikasi masuk di generator.email'
        };
    }

    const verifyRes = await verifyAmLink(temp.email, verifLink);
    if (!verifyRes.ok) {
        return {
            ok: false,
            email: temp.email,
            inbox_url: temp.inboxUrl,
            verify_link: verifLink,
            reason: `Verify gagal: ${verifyRes.message}`
        };
    }

    return {
        ok: true,
        email: temp.email,
        inbox_url: temp.inboxUrl,
        verify_link: verifLink,
        status: verifyRes.data?.subscription || verifyRes.data?.status || 'Verified',
        message: verifyRes.message,
        raw: verifyRes.data
    };
}

function startBulkAmJob({ Dinz, chatId, quoted, qty, requestedBy }) {
    const jobId = `am-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
    const job = {
        id: jobId,
        status: 'processing',
        total_requested: qty,
        processed: 0,
        total_success: 0,
        total_failed: 0,
        success_accounts: [],
        failed_accounts: [],
        requestedBy,
        createdAt: new Date().toISOString(),
        completedAt: ''
    };
    bulkJobs.set(jobId, job);

    (async () => {
        const concurrency = 2;
        let idx = 0;
        const workers = Array.from({ length: Math.min(concurrency, qty) }, async () => {
            while (idx < qty) {
                const curNum = ++idx;
                try {
                    const res = await createSingleAutoAmAccount();
                    if (res.ok) {
                        job.total_success++;
                        job.success_accounts.push({
                            index: curNum,
                            email: res.email,
                            status: res.status,
                            message: res.message,
                            inbox_url: res.inbox_url
                        });
                    } else {
                        job.total_failed++;
                        job.failed_accounts.push({
                            index: curNum,
                            email: res.email || '-',
                            inbox_url: res.inbox_url || '-',
                            reason: res.reason || 'Unknown error'
                        });
                    }
                } catch (err) {
                    job.total_failed++;
                    job.failed_accounts.push({
                        index: curNum,
                        email: '-',
                        inbox_url: '-',
                        reason: err?.message || 'Error tak terduga'
                    });
                } finally {
                    job.processed++;
                }
            }
        });

        await Promise.all(workers);
        job.status = 'completed';
        job.completedAt = new Date().toISOString();

        try {
            const txt = formatBulkJobTxt(job);
            const summary =
                `\`⌜ AM BULK SELESAI ✅ ⌟\`\n` +
                `> ◦ *Job ID :* \`${job.id}\`\n` +
                `> ◦ *Total :* ${job.total_requested}\n` +
                `> ◦ *Sukses :* ${job.total_success}\n` +
                `> ◦ *Gagal :* ${job.total_failed}\n` +
                `> ◦ *File :* Daftar email, status, & URL inbox generator.email terlampir.`;

            if (Dinz && typeof Dinz.sendMessage === 'function' && chatId) {
                await Dinz.sendMessage(chatId, {
                    document: Buffer.from(txt, 'utf8'),
                    mimetype: 'text/plain',
                    fileName: `am-bulk-${job.id}.txt`,
                    caption: summary
                }, quoted ? { quoted } : {});
            }
        } catch (_) {}
    })();

    return job;
}

function getBulkJob(jobId) {
    return bulkJobs.get(String(jobId || '').trim()) || null;
}

function formatBulkJobTxt(job) {
    const lines = [
        'ALIGHT MOTION BULK ACCOUNT REPORT',
        `Job ID    : ${job.id}`,
        `Status    : ${job.status}`,
        `Dimulai   : ${job.createdAt}`,
        `Selesai   : ${job.completedAt || '-'}`,
        `Sukses    : ${job.total_success}/${job.total_requested} | Gagal : ${job.total_failed}`,
        '==================================================',
        ''
    ];

    if (job.success_accounts.length) {
        lines.push('[AKUN SUKSES & TERVERIFIKASI]');
        job.success_accounts.forEach((a, i) => {
            lines.push(`${i + 1}. Email  : ${a.email}`);
            lines.push(`   Status : ${a.status || 'Verified'} (${a.message || 'OK'})`);
            lines.push(`   Inbox  : ${a.inbox_url}`);
            lines.push('');
        });
    }

    if (job.failed_accounts.length) {
        lines.push('[AKUN GAGAL]');
        job.failed_accounts.forEach((f, i) => {
            lines.push(`${i + 1}. #${f.index} ${f.email} -> ${f.reason}`);
            if (f.inbox_url && f.inbox_url !== '-') lines.push(`   Inbox  : ${f.inbox_url}`);
        });
    }

    return lines.join('\n');
}

module.exports = {
    DEFAULT_AM_BASE,
    getAmBaseUrl,
    getAmAccessConfig,
    setAmAccessConfig,
    checkAmAccess,
    generateTempEmail,
    extractAmVerifyLinkFromHtml,
    pollVerificationLink,
    sendAmVerification,
    verifyAmLink,
    createSingleAutoAmAccount,
    startBulkAmJob,
    getBulkJob,
    formatBulkJobTxt
};
