/**
 * 음악 데이터 관리
 */

export type MusicTrack = {
  id: string;           // YouTube video ID
  title: string;
  artist?: string;
};

export const musicTracks: MusicTrack[] = [
  { id: 'IEEJA1ZeQaI', title: '恋愛脳', artist: 'ナナヲアカリ' },
];

/**
 * YouTube 썸네일 URL 헬퍼
 * maxresdefault.jpg: 1280x720
 * hqdefault.jpg: 480x360 (폴백용)
 */
export const getYouTubeThumbnail = (videoId: string, quality: 'maxres' | 'hq' = 'maxres') =>
  `https://img.youtube.com/vi/${videoId}/${quality === 'maxres' ? 'maxresdefault' : 'hqdefault'}.jpg`;
