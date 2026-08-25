'use client';

import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  xOffset: number;
  yOffset: number;
}

const PARTICLE_COUNT = 80;

function seededValue(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  x: seededValue(i + 1) * 100,
  y: seededValue(i + 101) * 100,
  size: 1.5 + seededValue(i + 201) * 2.5,
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
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: '#ffffff',
          }}
          initial={{ opacity: 0.5 }}
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
