'use client';

import { motion, type MotionValue } from 'framer-motion';

type Props = {
  opacity: MotionValue<number>;
};

export default function LiquidBackground({ opacity }: Props) {
  return (
    <motion.div
      className="absolute inset-0 liquid-bg grain-texture pointer-events-none"
      style={{ opacity }}
    />
  );
}
