import { createHmac } from "node:crypto";

const API_BASE = "https://global.apis.naver.com/lineWebtoon/webtoon";
const IMG_BASE = "https://webtoon-phinf.pstatic.net";
const HMAC_KEY = Buffer.from("gUtPzJFZch4ZyAGviiyH94P99lQ3pFdRTwpJWDlSGFfwgpr6ses5ALOxWHOIT7R1");

const signUrl = (fullUrl) => {
  const msgpad = String(Date.now());
  const prefix = fullUrl.slice(0, 255);
  const hmac = createHmac("sha1", HMAC_KEY).update(prefix + msgpad).digest("base64");
  const md = encodeURIComponent(hmac);
  const sep = fullUrl.includes("?") ? "&" : "?";
  return `${fullUrl}${sep}msgpad=${msgpad}&md=${md}`;
};

const request = async (path, params = {}, lang = "id") => {
  const query = new URLSearchParams({
    platform: "APP_ANDROID",
    language: lang,
    locale: lang,
    serviceZone: "GLOBAL",
    v: "1",
    ...params
  });

  const rawUrl = `${API_BASE}/${path}?${query.toString()}`;
  const signedUrl = signUrl(rawUrl);

  const res = await fetch(signedUrl, {
    headers: {
      "User-Agent": "nApps (Android 14; SM-G988N; linewebtoon; 26.102.1)",
      "Platform": "APP_ANDROID",
      "Language": lang === "id" ? "INDONESIAN" : "ENGLISH"
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}`);
  }

  const json = await res.json();
  const result = json?.message?.result;
  if (!result) {
    throw new Error(json?.message?.message || "Invalid API response");
  }

  return result;
};

export async function search(query, options = {}) {
  const lang = options.lang || "id";
  const startIndex = options.startIndex || 1;
  const pageSize = options.pageSize || 10;

  const result = await request("searchWebtoonV1", {
    query,
    startIndex: String(startIndex),
    pageSize: String(pageSize)
  }, lang);

  const list = result?.webtoonSearch?.titleList || [];
  return await Promise.all(
    list.map(async (item) => {
      try {
        const detailRes = await request("titleHomeDetailV2", {
          titleNo: String(item.titleNo)
        }, lang);
        const d = detailRes?.titleDetail || {};
        return {
          titleNo: item.titleNo,
          title: d.title || "",
          genre: d.representGenre?.displayName || d.representGenre?.code || "",
          synopsis: d.synopsis || "",
          thumbnail: item.thumbnailUrl ? `${IMG_BASE}${item.thumbnailUrl}` : "",
          readCount: d.readCount ?? item.readCount ?? 0,
          favoriteCount: d.favoriteCount ?? 0
        };
      } catch {
        return {
          titleNo: item.titleNo,
          title: "",
          genre: "",
          synopsis: "",
          thumbnail: item.thumbnailUrl ? `${IMG_BASE}${item.thumbnailUrl}` : "",
          readCount: item.readCount || 0,
          favoriteCount: 0
        };
      }
    })
  );
}

export async function getDetail(titleNo, options = {}) {
  const lang = options.lang || "id";
  const result = await request("titleHomeMainV3", {
    titleNo: String(titleNo)
  }, lang);

  const t = result?.title || {};
  return {
    titleNo: t.titleNo,
    title: t.title,
    language: t.language,
    genre: t.representGenre?.displayName || t.representGenre?.code || "",
    synopsis: t.synopsis || "",
    authors: (t.authorList || []).map((a) => a.authorName),
    thumbnail: t.posterThumbnailUrl ? `${IMG_BASE}${t.posterThumbnailUrl}` : "",
    contentRating: t.contentRating,
    status: t.restTerminationStatus
  };
}

export async function getEpisodes(titleNo, options = {}) {
  const lang = options.lang || "id";
  const offset = options.offset || 0;
  const pageSize = options.pageSize || 30;
  const ordering = options.ordering === "OLDEST" ? "OLDEST" : "LATEST";

  const result = await request("titleHomeEpisodeListV3", {
    titleNo: String(titleNo),
    offset: String(offset),
    pageSize: String(pageSize),
    ordering
  }, lang);

  const list = result?.episodeList || [];
  return list.map((item) => ({
    episodeNo: item.episodeNo,
    episodeSeq: item.episodeSeq,
    episodeTitle: item.episodeTitle,
    thumbnail: item.episodeThumbnail ? `${IMG_BASE}${item.episodeThumbnail}` : "",
    registerYmdt: item.registerYmdt
  }));
}

export async function getEpisodeImages(titleNo, episodeNo, options = {}) {
  const lang = options.lang || "id";
  const result = await request("downloadImageList.json", {
    titleNo: String(titleNo),
    episodeNoList: String(episodeNo)
  }, lang);

  const ep = result?.downloadImageList?.episodeList?.[0];
  if (!ep) {
    return [];
  }

  return (ep.imageInfo || []).map((img) => ({
    sortOrder: img.sortOrder,
    url: `${IMG_BASE}${img.url}`,
    width: img.width,
    height: img.height,
    fileSize: img.fileSize,
    headers: {
      Referer: "http://www.webtoons.com"
    }
  }));
}

export async function fetchImage(imageUrl) {
  const res = await fetch(imageUrl, {
    headers: {
      Referer: "http://www.webtoons.com"
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch image: HTTP ${res.status}`);
  }
  return await res.arrayBuffer();
}

export async function getDaily(weekday = "MON", options = {}) {
  const lang = options.lang || "id";
  const result = await request("titleList.json", {
    v: "3",
    weekday: weekday.toUpperCase()
  }, lang);

  const list = result?.titleList?.titles || [];
  return list.map((item) => ({
    titleNo: item.titleNo,
    title: item.title,
    author: item.writingAuthorName || item.titleAuthorList?.[0]?.authorName || "",
    genre: item.representGenre || "",
    thumbnail: item.thumbnail ? `${IMG_BASE}${item.thumbnail}` : "",
    readCount: item.readCount || 0
  }));
}

export default {
  search,
  getDetail,
  getEpisodes,
  getEpisodeImages,
  fetchImage,
  getDaily
};
