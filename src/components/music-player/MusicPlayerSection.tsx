'use client';

import { motion, useTransform, type MotionValue } from 'framer-motion';
import GlassPlayerPanel from './GlassPlayerPanel';
import { musicTracks } from '@/lib/data/music';

type Props = {
  scrollY: MotionValue<number>;
  normX: MotionValue<number>;
  normY: MotionValue<number>;
};

/**
 * 뮤직 플레이어 섹션
 * - 스크롤에 따라 등장 (중앙, 큰 사이즈)
 * - 스크롤이 더 진행되면 왼쪽으로 이동하며 세로로 축소
 */
export default function MusicPlayerSection({ scrollY, normX, normY }: Props) {
  // 스크롤 트랜지션 값
  // 280~480px: 등장 (중앙)
  // 500~700px: 왼쪽으로 이동 + 축소
  const playerOpacity = useTransform(scrollY, [280, 480], [0, 1]);
  const playerY = useTransform(scrollY, [280, 480], [50, 0]);

  // 왼쪽으로 이동 (vw 기준으로 화면 왼쪽 가장자리로)
  const playerX = useTransform(scrollY, [500, 700], [0, -1]);
  // 축소
  const playerScale = useTransform(scrollY, [500, 700], [1, 0.45]);
  // 플레이어가 보이지 않을 때는 포인터 이벤트 비활성화
  const playerPointerEvents = useTransform(scrollY, (v) => v > 250 ? 'auto' : 'none');

  const track = musicTracks[0];
  if (!track) return null;

  return (
    <motion.div
      className="fixed left-1/2 top-1/2"
      style={{
        zIndex: 5,
        opacity: playerOpacity,
        y: playerY,
        x: '-50%',
        translateY: '-50%',
        scale: playerScale,
        // 축소되면서 왼쪽으로 이동
        translateX: useTransform(playerX, (v) => `calc(-50% + ${v * 42}vw)`),
        pointerEvents: playerPointerEvents,
      }}
    >
      <div
        style={{
          width: 'min(90vw, 600px)',
          height: 'min(50vw, 320px)',
        }}
      >
        <GlassPlayerPanel
          track={track}
          normX={normX}
          normY={normY}
        />
      </div>
    </motion.div>
  );
}
