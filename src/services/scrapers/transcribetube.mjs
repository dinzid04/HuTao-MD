export const API_URL = "https://spinnerportugues.com/apis/api_youtube_transcript.php";

export async function transcript(url) {
  if (!url || typeof url !== "string") throw new TypeError("url is required");
  const targetUrl = url.includes("://") ? url.trim() : `https://www.youtube.com/watch?v=${url.trim()}`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "okhttp/4.12.0",
    },
    body: JSON.stringify({ url: targetUrl }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== "success" || !data.transcription) {
    throw new Error(data.transcription || "Transcript unavailable");
  }

  return {
    videoId: data.video_id,
    transcript: data.transcription.trim(),
  };
}

export default transcript;
