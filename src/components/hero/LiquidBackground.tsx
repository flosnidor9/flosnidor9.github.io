'use client';

import { motion, type MotionValue, useTransform } from 'framer-motion';

type Props = {
  opacity: MotionValue<number>;
  shock?: MotionValue<number>;
};

export default function LiquidBackground({ opacity, shock }: Props) {
  // shock 값(0~1)을 scale(1~1.15)로 변환
  const scale = useTransform(shock || { get: () => 0 } as any, [0, 1], [1, 1.15]);
  // shock 값에 따라 아주 살짝 회전 효과 (찰랑이는 느낌)
  const rotate = useTransform(shock || { get: () => 0 } as any, [0, 1], [0, -2]);
  // shock 값에 따라 대비(contrast)를 높여 색감을 더 진하게 만듦
  const contrast = useTransform(shock || { get: () => 0 } as any, [0, 1], [1.2, 1.8]);

  return (
    <motion.div
      className="absolute inset-0 liquid-bg pointer-events-none"
      style={{ 
        opacity,
        scale,
        rotate,
        filter: useTransform(contrast, (v) => `blur(60px) contrast(${v * 100}%)`),
        // scale 변화가 중앙에서 일어나도록 설정
        originX: 0.5,
        originY: 0.5
      }}
    />
  );
}
