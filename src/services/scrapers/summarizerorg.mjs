const BASE_URL = 'https://www.summarizer.org';

const ENDPOINTS = {
  ai: `${BASE_URL}/summarize/mode-1`,
  advanced: `${BASE_URL}/summarize/mode-2`,
  bullets: `${BASE_URL}/summarize/bullet-points`,
  'best-line': `${BASE_URL}/summarize/best-line`
};

const MODE_TEXTS = {
  ai: 'summarizer',
  advanced: 'summarizer',
  bullets: 'bullets',
  'best-line': 'best_line'
};

const genKey = () => Date.now() + Math.random().toString(36).substring(2, 22);

async function getSession() {
  const res = await fetch(`${BASE_URL}/`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
  const html = await res.text();
  const tokenMatch = html.match(/<meta\s+name="_token"\s+content="([^"]+)"/);
  const token = tokenMatch ? tokenMatch[1] : '';
  const cookies = res.headers.getSetCookie
    ? res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
    : (res.headers.get('set-cookie') || '');

  return { token, cookies };
}

export async function summarize(text, options = {}) {
  if (!text || typeof text !== 'string') throw new Error('Text is required');

  const mode = options.mode || 'ai';
  const endpoint = ENDPOINTS[mode] || ENDPOINTS.ai;
  const modeText = MODE_TEXTS[mode] || 'summarizer';
  const lang = options.lang || 'en';
  const length = options.length || 50;

  const { token, cookies } = await getSession();
  const wordCount = text.trim().split(/\s+/).length;

  const fd = new FormData();
  fd.append('_token', token);
  fd.append('input_text', text.trim());
  fd.append('tool_key', 'summarizer');
  fd.append('tool_lang', lang);
  fd.append('detected_lang', lang);
  fd.append('input_type', 'Text');
  fd.append('summary_length', String(length));
  fd.append('input_count', String(wordCount));
  fd.append('parent_id', '2');
  fd.append('tool_id', '2');
  fd.append('e_track_key', genKey());
  fd.append('req_key', genKey());
  fd.append('user_date_time', new Date().toISOString().replace('T', ' ').slice(0, 19));
  fd.append('emd_is_tool_premium', '0');
  fd.append('mode', mode === 'advanced' ? '2' : '1');
  fd.append('mode_text', modeText);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Cookie: cookies,
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': token,
      Referer: `${BASE_URL}/`
    },
    body: fd
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.message || json.mess || `HTTP error ${res.status}`);
  }
  if (!json.output_text) throw new Error('No summary generated');

  return {
    summary: json.output_text.trim(),
    inputCount: json.input_count ?? wordCount,
    outputCount: json.output_count ?? json.output_text.trim().split(/\s+/).length
  };
}
