'use client';

import { motion, type MotionValue, useMotionValue, useTransform } from 'framer-motion';

type Props = {
  opacity: MotionValue<number>;
  shock?: MotionValue<number>;
};

export default function LiquidBackground({ opacity, shock }: Props) {
  const fallbackShock = useMotionValue(0);
  const shockValue = shock ?? fallbackShock;
  const scale = useTransform(shockValue, [0, 1], [1, 1.15]);
  const rotate = useTransform(shockValue, [0, 1], [0, -2]);
  const contrast = useTransform(shockValue, [0, 1], [1.2, 1.8]);
  const filter = useTransform(contrast, (v) => `blur(60px) contrast(${v * 100}%)`);

  return (
    <motion.div
      className="absolute inset-0 liquid-bg pointer-events-none"
      style={{
        opacity,
        scale,
        rotate,
        filter,
        originX: 0.5,
        originY: 0.5,
      }}
    />
  );
}
