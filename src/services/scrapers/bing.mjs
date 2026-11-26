const SEARCH_APPID = "8B3803673894068AC59BD9DA9BC2B4D382C6227E";
const BING_APIS_BASE = "https://www.bingapis.com/api/v7";
const EDGE_AI_BASE = "https://edge.microsoft.com/edgecontextualchat/api/ctxsis";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const EDGE_USER_AGENT = "Mozilla/5.0 (Linux; Android 14; SM-G988N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 EdgA/120.0.0.0";

function decodeBingUrl(url) {
  const match = url.match(/(?:[?&]|&amp;)u=a1([a-zA-Z0-9_\-]+)/);
  if (!match) return url;
  try {
    let b64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
    b64 += "=".repeat((4 - (b64.length % 4)) % 4);
    return Buffer.from(b64, "base64").toString("utf-8");
  } catch {
    return url;
  }
}

export async function search(query, options = {}) {
  const count = options.count || 10;
  const offset = options.offset || 0;
  const lang = options.lang || "id";
  const country = options.country || "ID";

  try {
    const params = new URLSearchParams({
      appid: SEARCH_APPID,
      q: query,
      cc: country,
      setlang: lang,
      responseFilter: "Webpages",
      count: String(count),
      offset: String(offset)
    });
    const res = await fetch(`${BING_APIS_BASE}/search?${params.toString()}`, {
      headers: { "User-Agent": USER_AGENT }
    });
    if (res.ok) {
      const data = await res.json();
      const pages = data.webPages?.value || [];
      if (pages.length > 0) {
        return pages.slice(0, count).map((item) => ({
          title: item.name || "",
          url: item.url || "",
          snippet: item.snippet || "",
          dateLastCrawled: item.dateLastCrawled || ""
        }));
      }
    }
  } catch {}

  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=${lang}&cc=${country}&first=${offset + 1}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT }
  });
  if (!res.ok) {
    throw new Error(`Bing Search HTTP ${res.status}`);
  }
  const html = await res.text();
  const blocks = html.match(/<li class="b_algo"[^>]*>[\s\S]*?<\/li>/g) || [];

  return blocks.slice(0, count).map((b) => {
    const h2Match = b.match(/<h2><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/);
    const link = h2Match ? decodeBingUrl(h2Match[1]) : "";
    const title = h2Match ? h2Match[2].replace(/<[^>]+>/g, "").trim() : "";
    const pMatch = b.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    const snippet = pMatch ? pMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    return { title, url: link, snippet };
  });
}

export async function searchImages(query, options = {}) {
  const count = options.count || 20;
  const offset = options.offset || 0;

  const url = `https://www.bing.com/images/async?q=${encodeURIComponent(query)}&first=${offset + 1}&count=${count}&mmasync=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT }
  });

  if (!res.ok) {
    throw new Error(`Bing Image Search HTTP ${res.status}`);
  }

  const html = await res.text();
  const rawMatches = html.match(/m="({[^"]+})"/g) || [];

  const results = [];
  for (const m of rawMatches) {
    if (results.length >= count) break;
    try {
      const clean = m.slice(3, -1).replace(/&quot;/g, '"');
      const j = JSON.parse(clean);
      results.push({
        title: j.t || "",
        url: j.murl || "",
        thumbnailUrl: j.turl || "",
        sourceUrl: j.purl || "",
        description: j.desc || ""
      });
    } catch {}
  }

  return results;
}

export async function visualSearch(imageUrl, options = {}) {
  const count = options.count || 10;
  const encoded = encodeURIComponent(imageUrl);
  const url = `https://www.bing.com/images/search?view=detailv2&iss=SBI&form=L2MS03&sbisrc=UrlPaste&q=imgurl:${encoded}`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT }
  });

  if (!res.ok) {
    throw new Error(`Bing Visual Search HTTP ${res.status}`);
  }

  const html = await res.text();
  const match = html.match(/\/search\?format=rss&amp;q=([^&]+)&amp;bcid=([^&"]+)/);
  const recognizedQuery = match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : "";
  const bcid = match ? match[2] : "";

  let similarImages = [];
  if (recognizedQuery) {
    similarImages = await searchImages(recognizedQuery, { count });
  }

  return {
    imageUrl,
    recognizedQuery,
    bcid,
    similarImages
  };
}

export async function askAi(prompt, options = {}) {
  const lang = options.lang || "id";
  const market = options.market || (lang === "id" ? "id-ID" : "en-US");
  const targetUrl = options.url || "https://example.com/context";

  let content = `Pertanyaan Pengguna:\n${prompt}\n\nInstruksi dan Konteks Diskusi:\nMohon berikan jawaban yang komprehensif, tepat sasaran, faktual, dan tersusun rapi menggunakan poin-poin utama yang mudah dipahami oleh pembaca. Pastikan uraian menjelaskan aspek terpenting dari topik yang ditanyakan dengan jelas, objektif, dan berbobot tanpa ada informasi yang terlewat.`;

  if (content.length < 350) {
    content += " ".repeat(350 - content.length);
  }

  const res = await fetch(`${EDGE_AI_BASE}/sisgenerationstream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": EDGE_USER_AGENT
    },
    body: JSON.stringify({
      Url: targetUrl,
      ClientName: "SA",
      Lang: lang,
      Market: market,
      PageContent: content,
      TriggerStatus: 0,
      QcScore: 70
    })
  });

  if (!res.ok) {
    throw new Error(`Edge AI HTTP ${res.status}`);
  }

  return await res.text();
}
