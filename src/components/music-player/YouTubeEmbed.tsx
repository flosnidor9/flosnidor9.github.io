'use client';

import { useEffect, useRef, useCallback, useId, useImperativeHandle, forwardRef } from 'react';

type Props = {
  videoId: string;
  onStateChange?: (isPlaying: boolean) => void;
};

// YouTube IFrame API 타입
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
  isMuted: () => boolean;
  mute: () => void;
  unMute: () => void;
  destroy: () => void;
}

export interface YouTubeEmbedRef {
  toggle: () => void;
  play: () => void;
  pause: () => void;
  toggleMute: () => boolean; // 반환값: 새로운 mute 상태
}

/**
 * YouTube iframe 임베드
 * - YouTube IFrame API 사용
 * - 자동 재생 (음소거 상태)
 * - ref를 통해 play/pause/toggle 제어 가능
 */
const YouTubeEmbed = forwardRef<YouTubeEmbedRef, Props>(({ videoId, onStateChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const isPlayingRef = useRef(false);

  // useId()는 SSR/CSR에서 동일한 값을 반환하여 hydration 오류 방지
  const reactId = useId();
  const playerId = `yt-player-${reactId.replace(/:/g, '')}`;

  // 외부에서 제어할 수 있도록 ref 노출
  useImperativeHandle(ref, () => ({
    toggle: () => {
      if (!playerRef.current) return;
      if (isPlayingRef.current) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    },
    play: () => {
      playerRef.current?.playVideo();
    },
    pause: () => {
      playerRef.current?.pauseVideo();
    },
    toggleMute: () => {
      if (!playerRef.current) return true;
      if (playerRef.current.isMuted()) {
        playerRef.current.unMute();
        return false;
      } else {
        playerRef.current.mute();
        return true;
      }
    },
  }), []);

  const initPlayer = useCallback(() => {
    if (!window.YT || !containerRef.current) return;

    // 이미 플레이어가 있으면 제거
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    playerRef.current = new window.YT.Player(playerId, {
      videoId,
      playerVars: {
        autoplay: 1,        // 자동 재생
        mute: 1,            // 음소거 (자동 재생 정책)
        controls: 0,        // 컨트롤 숨김
        loop: 1,
        playlist: videoId,  // loop를 위해 playlist 필요
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        fs: 0,
        iv_load_policy: 3,  // 주석 숨기기
        playsinline: 1,     // 모바일에서 인라인 재생
        enablejsapi: 1,     // JS API 활성화 (postMessage 필수)
        origin: window.location.origin, // postMessage origin 허용
      },
      events: {
        onStateChange: (event) => {
          const playing = event.data === window.YT.PlayerState.PLAYING;
          isPlayingRef.current = playing;
          onStateChange?.(playing);
        },
      },
    });
  }, [videoId, onStateChange, playerId]);

  useEffect(() => {
    // YouTube IFrame API 로드
    if (!window.YT || !window.YT.Player) {
      // API 스크립트가 없으면 추가
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript.parentNode?.insertBefore(tag, firstScript);
      }
      // 기존 콜백이 있으면 체이닝
      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevReady?.();
        initPlayer();
      };
    } else {
      initPlayer();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [initPlayer]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <div id={playerId} className="w-full h-full" />
    </div>
  );
});

YouTubeEmbed.displayName = 'YouTubeEmbed';

export default YouTubeEmbed;
