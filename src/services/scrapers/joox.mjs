const BASE_URL = "https://www.joox.com";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const CDN_HOSTS = [
  "https://id.stream.music.joox.com/",
  "https://hk.stream.music.joox.com/",
  "https://my.stream.music.joox.com/",
  "https://th.stream.music.joox.com/",
  "https://stream.music.joox.com/"
];

function extractNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("Failed to parse Next.js state from response");
  }
  return JSON.parse(match[1]);
}

export async function search(keyword, region = "id") {
  const url = `${BASE_URL}/${region}/search/${encodeURIComponent(keyword)}`;
  const res = await fetch(url, { headers: DEFAULT_HEADERS });
  if (!res.ok) {
    throw new Error(`Search request failed with status: ${res.status}`);
  }

  const html = await res.text();
  const nextData = extractNextData(html);
  const items = nextData.props?.pageProps?.searchSections?.songs?.item_list || [];

  return items.map((item) => {
    const song = item.song?.[0]?.song_info;
    if (!song) return null;
    return {
      id: song.id,
      name: song.name,
      duration: song.play_duration,
      album: {
        id: song.album_id,
        name: song.album_name,
      },
      artists: (song.artist_list || []).map((artist) => ({
        id: artist.id,
        name: artist.name,
      })),
      images: song.images || [],
      url: `${BASE_URL}/${region}/single/${encodeURIComponent(song.id)}`,
    };
  }).filter(Boolean);
}

async function resolveSongId(queryOrId, region = "id") {
  if (typeof queryOrId !== "string" || !queryOrId.trim()) {
    throw new Error("Invalid query or song ID");
  }

  const trimmed = queryOrId.trim();
  if (/^[a-zA-Z0-9_\-+/]{22}==$/.test(trimmed)) {
    return trimmed;
  }

  const results = await search(trimmed, region);
  if (!results.length) {
    throw new Error(`No tracks found for query: "${trimmed}"`);
  }
  return results[0].id;
}

export async function getMetadata(queryOrId, region = "id") {
  const songId = await resolveSongId(queryOrId, region);
  const url = `${BASE_URL}/${region}/single/${encodeURIComponent(songId)}`;
  const res = await fetch(url, { headers: DEFAULT_HEADERS });
  if (!res.ok) {
    throw new Error(`Metadata request failed with status: ${res.status}`);
  }

  const html = await res.text();
  const nextData = extractNextData(html);
  const info = nextData.props?.pageProps?.singleInfo;
  if (!info) {
    throw new Error(`No track metadata found for id: ${songId}`);
  }

  return {
    id: info.id || songId,
    mid: info.songmid,
    title: info.title || info.msong,
    artist: info.msinger,
    artists: (info.artistList || []).map((artist) => ({
      id: artist.id,
      name: artist.name,
    })),
    album: {
      id: info.malbumid,
      name: info.albumName || info.malbum,
    },
    duration: info.minterval,
    publicTime: info.publicTime,
    cover: info.imgSrc,
    url: `${BASE_URL}/${region}/single/${encodeURIComponent(songId)}`,
  };
}

export async function getLyrics(queryOrId, region = "id") {
  const songId = await resolveSongId(queryOrId, region);
  const url = `${BASE_URL}/${region}/single/${encodeURIComponent(songId)}`;
  const res = await fetch(url, { headers: DEFAULT_HEADERS });
  if (!res.ok) {
    throw new Error(`Lyrics request failed with status: ${res.status}`);
  }

  const html = await res.text();
  const nextData = extractNextData(html);
  const rawBase64 = nextData.props?.pageProps?.singleLyric;
  if (!rawBase64) {
    return null;
  }

  const decoded = Buffer.from(rawBase64, "base64").toString("utf-8");
  const lines = decoded.split(/\r?\n/).filter(Boolean);
  const parsed = [];

  for (const line of lines) {
    const match = line.match(/^\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)$/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      parsed.push({
        time: minutes * 60 + seconds,
        text: match[3].trim(),
      });
    }
  }

  return parsed;
}

export async function getStreamUrl(queryOrIdOrMid, region = "id") {
  let mid = queryOrIdOrMid;
  if (!/^[a-zA-Z0-9]{14}$/.test(mid)) {
    const meta = await getMetadata(queryOrIdOrMid, region);
    mid = meta.mid;
  }

  for (const host of CDN_HOSTS) {
    const candidate = `${host}C100${mid}.m4a`;
    try {
      const head = await fetch(candidate, { method: "HEAD", headers: DEFAULT_HEADERS });
      if (head.ok && head.headers.get("content-type")?.includes("audio")) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  return `${CDN_HOSTS[0]}C100${mid}.m4a`;
}

export async function download(queryOrId, region = "id") {
  const songId = await resolveSongId(queryOrId, region);
  const metadata = await getMetadata(songId, region);
  const lyrics = await getLyrics(songId, region);
  const streamUrl = await getStreamUrl(metadata.mid, region);

  const audioRes = await fetch(streamUrl, { headers: DEFAULT_HEADERS });
  if (!audioRes.ok) {
    throw new Error(`Audio download failed with status: ${audioRes.status}`);
  }

  const arrayBuffer = await audioRes.arrayBuffer();

  return {
    metadata,
    lyrics,
    streamUrl,
    audio: Buffer.from(arrayBuffer),
  };
}

export default {
  search,
  getMetadata,
  getLyrics,
  getStreamUrl,
  download,
};
