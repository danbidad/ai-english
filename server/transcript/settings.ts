const WATCH_URL = "https://www.youtube.com/watch?v={video_id}";

export function formatWatchUrl(videoId: string): string {
  return WATCH_URL.replace('{video_id}', videoId);
}
