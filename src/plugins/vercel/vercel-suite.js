const zlib = require('zlib');
const axios = require('axios');
const { formatCard, toMono } = require('../../utils/formatter');

function extractZipBuffer(buf) {
    const files = [];
    let eocdOffset = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
        if (buf.readUInt32LE(i) === 0x06054b50) {
            eocdOffset = i;
            break;
        }
    }
    if (eocdOffset < 0) throw new Error('Format file ZIP tidak valid.');
    const totalEntries = buf.readUInt16LE(eocdOffset + 10);
    let cdOffset = buf.readUInt32LE(eocdOffset + 16);

    for (let e = 0; e < totalEntries && cdOffset + 46 <= buf.length; e++) {
        if (buf.readUInt32LE(cdOffset) !== 0x02014b50) break;
        const method = buf.readUInt16LE(cdOffset + 10);
        const compSize = buf.readUInt32LE(cdOffset + 20);
        const nameLen = buf.readUInt16LE(cdOffset + 28);
        const extraLen = buf.readUInt16LE(cdOffset + 30);
        const commentLen = buf.readUInt16LE(cdOffset + 32);
        const localHeaderOffset = buf.readUInt32LE(cdOffset + 42);
        const rawName = buf.slice(cdOffset + 46, cdOffset + 46 + nameLen).toString('utf8');
        cdOffset += 46 + nameLen + extraLen + commentLen;

        if (!rawName || rawName.endsWith('/')) continue;
        const cleanName = rawName.replace(/^\/+/, '');
        if (cleanName.startsWith('__MACOSX/') || cleanName.includes('node_modules/') || cleanName.startsWith('.git/')) continue;

        if (localHeaderOffset + 30 > buf.length || buf.readUInt32LE(localHeaderOffset) !== 0x04034b50) continue;
        const lfNameLen = buf.readUInt16LE(localHeaderOffset + 26);
        const lfExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
        const dataStart = localHeaderOffset + 30 + lfNameLen + lfExtraLen;
        const compSlice = buf.slice(dataStart, dataStart + compSize);

        let dataBuf = null;
        if (method === 0) {
            dataBuf = compSlice;
        } else if (method === 8) {
            dataBuf = zlib.inflateRawSync(compSlice);
        }
        if (dataBuf) {
            files.push({ file: cleanName, data: dataBuf.toString('base64'), encoding: 'base64' });
        }
    }
    return files;
}

function sanitizeProjectName(raw) {
    return String(raw || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 52);
}

async function vercelRequest(token, method, endpoint, data = undefined) {
    const res = await axios({
        method,
        url: `https://api.vercel.com${endpoint}`,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data,
        timeout: 30000,
        validateStatus: () => true
    });
    if (res.status >= 400) {
        const msg = res.data?.error?.message || res.data?.message || `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return res.data;
}

function getTokensMap(Dinz, botCtx) {
    const raw = botCtx.getSection('vercel_tokens', Dinz);
    return raw && typeof raw === 'object' ? raw : {};
}

module.exports = {
    name: 'vercel-suite',
    category: 'vercel',
    commands: ['setvercel', 'vdeploy', 'deployvercel', 'vlist', 'vinfo', 'vdeployments', 'vdomain', 'vdelete'],

    async execute(ctx) {
        const { Dinz, m, command, text, args, quoted, Reply, botCtx, usedPrefix } = ctx;
        const pfx = usedPrefix || '.';
        const cmd = String(command || '').toLowerCase();
        const tokens = getTokensMap(Dinz, botCtx);

        if (cmd === 'setvercel') {
            const sub = String(args[0] || '').trim();
            if (!sub) {
                const has = Boolean(tokens[m.sender]);
                return Reply(formatCard({
                    icon: '▲',
                    title: 'KONFIGURASI VERCEL API TOKEN',
                    rows: [{ label: 'Status Token', value: has ? '🟢 Terpasang' : '🔴 Belum diatur' }],
                    body:
                        `1. Buat token di *https://vercel.com/account/tokens*\n` +
                        `2. Ketik di Private Chat: ${toMono(`${pfx}setvercel <token_kamu>`)}\n` +
                        `3. Hapus token: ${toMono(`${pfx}setvercel del`)}`
                }));
            }
            if (sub.toLowerCase() === 'del' || sub.toLowerCase() === 'hapus') {
                delete tokens[m.sender];
                botCtx.setSection('vercel_tokens', tokens, Dinz);
                return Reply('🗑️ Token Vercel kamu berhasil dihapus dari bot.');
            }
            if (m.isGroup) {
                await Dinz.sendMessage(m.chat, { delete: m.key }).catch(() => {});
                return Reply('🔒 Demi keamanan akunmu, pasang token Vercel lewat *Private Chat* bot ya!');
            }
            await Dinz.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            try {
                const userRes = await vercelRequest(sub, 'GET', '/v2/user');
                tokens[m.sender] = sub;
                botCtx.setSection('vercel_tokens', tokens, Dinz);
                const u = userRes?.user || {};
                return Reply(`✅ *Token Vercel Terhubung!*\n> ◦ Username : *${u.username || u.name || 'User'}*\n> ◦ Email : *${u.email || '-'}*\n> 💡 Sekarang kamu siap deploy website dengan \`${pfx}vdeploy\`!`);
            } catch (e) {
                return Reply(`❌ Token Vercel tidak valid: *${e.message}*`);
            }
        }

        const token = tokens[m.sender];
        if (!token) {
            return Reply(`▲ Kamu belum memasang *Vercel Token*!\n> Ketik \`${pfx}setvercel <token>\` di Private Chat bot terlebih dahulu.\n> Buat token gratis di: https://vercel.com/account/tokens`);
        }

        try {
            if (cmd === 'vlist') {
                const data = await vercelRequest(token, 'GET', '/v9/projects?limit=20');
                const projects = Array.isArray(data?.projects) ? data.projects : [];
                if (!projects.length) return Reply('📭 Belum ada proyek di akun Vercel kamu.');
                const lines = projects.map((p, i) => `> *${i + 1}.* *${p.name}* — https://${p.name}.vercel.app`);
                return Reply(`\`▲ DAFTAR PROYEK VERCEL (${projects.length})\`\n${lines.join('\n')}`);
            }

            if (cmd === 'vinfo') {
                const proj = sanitizeProjectName(args[0]);
                if (!proj) return Reply(`📦 Contoh: \`${pfx}vinfo nama-proyek\``);
                const p = await vercelRequest(token, 'GET', `/v9/projects/${encodeURIComponent(proj)}`);
                return Reply(formatCard({
                    icon: '▲',
                    title: `INFO PROYEK: ${p.name}`,
                    rows: [
                        { label: 'ID Proyek', value: p.id || '-' },
                        { label: 'Framework', value: p.framework || 'Static / HTML' },
                        { label: 'Node Version', value: p.nodeVersion || '-' },
                        { label: 'URL Utama', value: `https://${p.name}.vercel.app` }
                    ]
                }));
            }

            if (cmd === 'vdeployments') {
                const proj = sanitizeProjectName(args[0]);
                const q = proj ? `?app=${encodeURIComponent(proj)}&limit=8` : '?limit=8';
                const data = await vercelRequest(token, 'GET', `/v6/deployments${q}`);
                const deps = Array.isArray(data?.deployments) ? data.deployments : [];
                if (!deps.length) return Reply('📭 Belum ada riwayat deployment.');
                const lines = deps.map((d, i) => `> *${i + 1}.* *${d.name}* [\`${d.state || d.readyState}\`] — https://${d.url}`);
                return Reply(`\`▲ RIWAYAT DEPLOYMENT VERCEL\`\n${lines.join('\n')}`);
            }

            if (cmd === 'vdomain') {
                const proj = sanitizeProjectName(args[0]);
                const newDom = String(args[1] || '').trim().toLowerCase();
                if (!proj) return Reply(`🌐 Lihat domain: \`${pfx}vdomain <proyek>\`\n🌐 Tambah domain: \`${pfx}vdomain <proyek> domainkamu.my.id\``);
                if (newDom) {
                    const r = await vercelRequest(token, 'POST', `/v10/projects/${encodeURIComponent(proj)}/domains`, { name: newDom });
                    return Reply(`✅ Domain *${r.name || newDom}* berhasil ditambahkan ke proyek *${proj}*!\n> Status: *${r.verified ? 'Terverifikasi' : 'Menunggu arahkan CNAME ke cname.vercel-dns.com'}*`);
                }
                const d = await vercelRequest(token, 'GET', `/v9/projects/${encodeURIComponent(proj)}/domains`);
                const list = Array.isArray(d?.domains) ? d.domains : [];
                if (!list.length) return Reply(`🌐 Proyek *${proj}* belum memiliki custom domain.`);
                return Reply(`\`🌐 DOMAIN PROYEK ${proj}\`\n${list.map((x, i) => `> *${i + 1}.* ${x.verified ? '✅' : '⏳'} ${x.name}`).join('\n')}`);
            }

            if (cmd === 'vdelete') {
                const proj = sanitizeProjectName(args[0]);
                if (!proj) return Reply(`🗑️ Contoh hapus proyek: \`${pfx}vdelete nama-proyek\``);
                await vercelRequest(token, 'DELETE', `/v9/projects/${encodeURIComponent(proj)}`);
                return Reply(`🗑️ Proyek Vercel *${proj}* berhasil dihapus permanen.`);
            }

            if (cmd === 'vdeploy' || cmd === 'deployvercel') {
                const proj = sanitizeProjectName(args[0]);
                const qObj = m.quoted || m;
                const fileName = String(qObj?.msg?.fileName || qObj?.fileName || '');
                const isDoc = Boolean(qObj?.type === 'documentMessage' || fileName);
                const quotedHtml = !isDoc && m.quoted?.text && /<html|<!doctype|<body|<div/i.test(m.quoted.text) ? m.quoted.text : '';

                if (!proj || (!isDoc && !quotedHtml)) {
                    return Reply(
                        `\`▲ VERCEL INSTANT DEPLOY\`\n` +
                        `> Reply file *.html*, *.zip*, atau teks HTML lalu ketik:\n` +
                        `> ${toMono(`${pfx}vdeploy nama-website-kamu`)}`
                    );
                }

                await Dinz.sendMessage(m.chat, { react: { text: '🚀', key: m.key } }).catch(() => {});
                let files = [];
                if (quotedHtml) {
                    files.push({ file: 'index.html', data: Buffer.from(quotedHtml, 'utf8').toString('base64'), encoding: 'base64' });
                } else {
                    const buf = await quoted.download();
                    if (!buf || !buf.length) throw new Error('Gagal mengunduh file dokumen.');
                    if (/\.zip$/i.test(fileName)) {
                        files = extractZipBuffer(buf);
                        if (!files.length) throw new Error('Isi file ZIP kosong.');
                    } else {
                        const targetFile = /\.html?$/i.test(fileName) || !fileName ? 'index.html' : fileName;
                        files.push({ file: targetFile, data: buf.toString('base64'), encoding: 'base64' });
                    }
                }

                const res = await vercelRequest(token, 'POST', '/v13/deployments', {
                    name: proj,
                    files,
                    projectSettings: { framework: null },
                    target: 'production'
                });

                const liveUrl = `https://${proj}.vercel.app`;
                const previewUrl = res?.url ? `https://${res.url}` : liveUrl;
                await Dinz.sendMessage(m.chat, { react: { text: '✅', key: m.key } }).catch(() => {});
                return Reply(formatCard({
                    icon: '🚀',
                    title: 'DEPLOY VERCEL BERHASIL!',
                    rows: [
                        { label: 'Proyek', value: proj },
                        { label: 'Total File', value: `${files.length} file` },
                        { label: 'Status', value: res?.readyState || 'READY' },
                        { label: 'URL Utama', value: liveUrl },
                        { label: 'Preview', value: previewUrl }
                    ]
                }));
            }
        } catch (err) {
            await Dinz.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return Reply(`❌ *Vercel Error:* ${err.message}`);
        }

        return false;
    }
};
