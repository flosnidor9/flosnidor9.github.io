'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * 현재 시각 표시 컴포넌트
 * - 왼쪽 하단 고정 배치
 * - 얇은 Sans-Serif 폰트
 * - 매초 업데이트
 */
export default function Clock() {
  const [time, setTime] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      setTime(`${displayHours}:${minutes} ${period}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // SSR 대응 - 마운트 전에는 렌더링하지 않음
  if (!mounted) return null;

  return (
    <motion.div
      className="fixed bottom-[2rem] right-[2rem] z-20"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="clock-text text-white text-[1.5rem] md:text-[2rem]">
        {time}
      </span>
    </motion.div>
  );
}
