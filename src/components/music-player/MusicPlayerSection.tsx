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
 * - 스크롤이 더 진행되면 위로 올라가며 축소
 */
export default function MusicPlayerSection({ scrollY, normX, normY }: Props) {
  // 스크롤 트랜지션 값
  // 280~480px: 등장 (중앙)
  // 500~700px: 위로 올라가며 축소
  const playerOpacity = useTransform(scrollY, [280, 480], [0, 1]);
  const playerEnterY = useTransform(scrollY, [280, 480], [50, 0]);

  // 위로 올라가기 (vh 단위)
  const playerExitY = useTransform(scrollY, [500, 700], [0, -120]);
  // 축소
  const playerScale = useTransform(scrollY, [500, 700], [1, 0.45]);
  // 플레이어가 보이지 않을 때는 포인터 이벤트 비활성화
  const playerPointerEvents = useTransform(scrollY, (v) => v > 250 && v < 650 ? 'auto' : 'none');

  const track = musicTracks[0];
  if (!track) return null;

  // 두 개의 Y 변환을 합침
  const combinedY = useTransform(
    [playerEnterY, playerExitY],
    ([enter, exit]: number[]) => enter + exit
  );

  return (
    <motion.div
      className="fixed left-1/2 top-1/2"
      style={{
        zIndex: 5,
        opacity: playerOpacity,
        y: combinedY,
        translateX: '-50%',
        translateY: '-50%',
        scale: playerScale,
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
