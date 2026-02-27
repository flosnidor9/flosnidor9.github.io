'use client';

import { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const RING_PX = 34;
const MAX_STRETCH = 2.5;
const STRETCH_FACTOR = 0.052;

export default function CustomCursor() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const scaleX = useMotionValue(1);
  const scaleY = useMotionValue(1);
  const rotate = useMotionValue(0);

  // 위치 — 빠른 스프링
  const sx = useSpring(x, { stiffness: 340, damping: 26, mass: 0.35 });
  const sy = useSpring(y, { stiffness: 340, damping: 26, mass: 0.35 });
  // 스트레치/각도 — 느린 스프링 (쫀득한 복귀)
  const spScaleX = useSpring(scaleX, { stiffness: 130, damping: 13, mass: 0.8 });
  const spScaleY = useSpring(scaleY, { stiffness: 130, damping: 13, mass: 0.8 });
  const spRotate = useSpring(rotate, { stiffness: 170, damping: 18, mass: 0.6 });

  useEffect(() => {
    let prevX = -200;
    let prevY = -200;
    let prevT = performance.now();

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      const dt = Math.max(now - prevT, 1);

      // px/frame — 16ms 기준으로 정규화
      const vx = ((e.clientX - prevX) / dt) * 16;
      const vy = ((e.clientY - prevY) / dt) * 16;
      const speed = Math.sqrt(vx * vx + vy * vy);

      x.set(e.clientX);
      y.set(e.clientY);

      if (speed > 1.2) {
        const stretch = Math.min(1 + speed * STRETCH_FACTOR, MAX_STRETCH);
        const squeeze = Math.max(1 / Math.sqrt(stretch), 0.4);
        scaleX.set(stretch);
        scaleY.set(squeeze);
        rotate.set(Math.atan2(vy, vx) * (180 / Math.PI));
      } else {
        scaleX.set(1);
        scaleY.set(1);
      }

      prevX = e.clientX;
      prevY = e.clientY;
      prevT = now;
    };

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [x, y, scaleX, scaleY, rotate]);

  return (
    // 외부 div — 회전만 담당
    <motion.div
      className="fixed top-0 left-0 pointer-events-none"
      style={{
        x: sx,
        y: sy,
        translateX: '-50%',
        translateY: '-50%',
        rotate: spRotate,
        zIndex: 99999,
      }}
      aria-hidden
    >
      {/* 내부 div — 스케일만 담당 (rotate 이후 scale → 올바른 방향 스트레치) */}
      <motion.div style={{ scaleX: spScaleX, scaleY: spScaleY }}>
        {/* 물방울 링 */}
        <div
          style={{
            width: `${RING_PX}px`,
            height: `${RING_PX}px`,
            borderRadius: '50%',
            // 유리 위 물방울: 약한 반투명 내부 + 블러 굴절
            background: 'rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(3px) brightness(1.08)',
            WebkitBackdropFilter: 'blur(3px) brightness(1.08)',
            border: '1.5px solid rgba(255, 255, 255, 0.72)',
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.08),
              0 0 18px rgba(255,255,255,0.22),
              0 2px 8px rgba(0,0,0,0.18),
              inset 0 1.5px 0 rgba(255,255,255,0.55),
              inset 0 -1px 0 rgba(255,255,255,0.10),
              inset 0 0 14px rgba(255,255,255,0.07)
            `,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 물방울 내부 상단 하이라이트 — 빛이 맺히는 작은 점 */}
          <div
            style={{
              position: 'absolute',
              top: '5px',
              left: '7px',
              width: '8px',
              height: '5px',
              background: 'rgba(255, 255, 255, 0.75)',
              borderRadius: '50%',
              filter: 'blur(2.5px)',
            }}
          />
          {/* 하단 옅은 반사 */}
          <div
            style={{
              position: 'absolute',
              bottom: '5px',
              right: '7px',
              width: '5px',
              height: '3px',
              background: 'rgba(255, 255, 255, 0.25)',
              borderRadius: '50%',
              filter: 'blur(2px)',
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
