'use client';

import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: string;
  y: string;
  size: string;
  duration: number;
  delay: number;
  xOffset: number;
  yOffset: number;
}

const PARTICLE_COUNT = 80;
const STYLE_PRECISION = 4;

function seededValue(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function percent(value: number): string {
  return `${value.toFixed(STYLE_PRECISION)}%`;
}

function pixels(value: number): string {
  return `${value.toFixed(STYLE_PRECISION)}px`;
}

const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  x: percent(seededValue(i + 1) * 100),
  y: percent(seededValue(i + 101) * 100),
  size: pixels(1.5 + seededValue(i + 201) * 2.5),
  duration: 6 + seededValue(i + 301) * 8,
  delay: seededValue(i + 401) * 5,
  xOffset: (seededValue(i + 501) - 0.5) * 300,
  yOffset: (seededValue(i + 601) - 0.5) * 300,
}));

export default function FloatingParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[5]">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-white"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
          }}
          initial={false}
          animate={{
            x: [0, particle.xOffset, 0],
            y: [0, particle.yOffset, 0],
            opacity: [0.5, 0.85, 0.5],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
