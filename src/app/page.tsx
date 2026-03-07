'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HomePage() {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const updateTime = () => {
      const now = new Date();

      // 시간 포맷
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      setTime(`${displayHours}:${minutes}:${seconds} ${period}`);

      // 날짜 포맷
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const weekday = weekdays[now.getDay()];
      setDate(`${year}.${month}.${day} ${weekday}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* 그레인 텍스처 배경 */}
      <div className="absolute inset-0 grain-texture pointer-events-none" />

      {/* 메인 컨텐츠 */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-[2rem] px-[2rem] max-w-[50rem]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* 디지털 시계 */}
        <motion.div
          className="flex flex-col items-center gap-[0.5rem]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="font-mono text-[2.5rem] md:text-[3.5rem] font-light text-white/90 tracking-wider">
            {time}
          </div>
          <div className="font-sans text-[0.95rem] md:text-[1.1rem] font-light text-white/60 tracking-wide">
            {date}
          </div>
        </motion.div>

        {/* 환영 메시지 */}
        <motion.h1
          className="font-serif text-[2rem] md:text-[3rem] font-light text-white/95 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          Welcome
        </motion.h1>

        {/* Notice 섹션 */}
        <motion.div
          className="glass-card rounded-[1.5rem] px-[2rem] py-[1.5rem] md:px-[2.5rem] md:py-[2rem] backdrop-blur-[40px] border border-white/10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-serif text-[1.25rem] md:text-[1.5rem] font-light text-white/90 mb-[1rem]">
            About This Space
          </h2>
          <p className="font-sans text-[0.95rem] md:text-[1rem] font-light text-white/70 leading-[1.8] text-center">
            이곳은 개인 아카이브입니다.<br />
            자료를 보관하고, 감상하고, 전시하기 위한 공간입니다.
          </p>
        </motion.div>

        {/* bubbleHome 버튼 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link href="/bubbleHome">
            <motion.button
              className="glass-card rounded-[1rem] px-[2.5rem] py-[1rem] md:px-[3rem] md:py-[1.25rem] backdrop-blur-[40px] border border-white/20 font-sans text-[1rem] md:text-[1.1rem] font-light text-white/90 hover:bg-white/[0.05] transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Enter Archive
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
