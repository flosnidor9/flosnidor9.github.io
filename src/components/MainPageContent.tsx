'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import FloatingParticles from '@/components/effects/FloatingParticles';
import Image from 'next/image';

interface MainPageContentProps {
  imagePaths: string[];
}

export default function MainPageContent({ imagePaths }: MainPageContentProps) {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [randomImage, setRandomImage] = useState<string | null>(null);

  useEffect(() => {
    let frameId: number | null = null;
    // 랜덤 이미지 선택
    if (imagePaths.length > 0) {
      const randomIndex = Math.floor(Math.random() * imagePaths.length);
      frameId = window.requestAnimationFrame(() => {
        setRandomImage(imagePaths[randomIndex]);
      });
    } else {
      frameId = window.requestAnimationFrame(() => {
        setRandomImage(null);
      });
    }

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

    return () => {
      clearInterval(interval);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [imagePaths]);

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-black">
      {/* 배경 이미지 */}
      {randomImage && (
        <div className="absolute inset-0">
          <Image
            src={randomImage}
            alt="Background"
            fill
            className="object-cover opacity-40"
            priority
          />
        </div>
      )}

      {/* 그레인 텍스처 배경 */}
      <div className="absolute inset-0 grain-texture pointer-events-none" />

      {/* 떠다니는 파티클 */}
      <FloatingParticles />

      {/* 메인 컨텐츠 */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-[2.5rem] px-[2rem] max-w-[50rem]"
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
          <div className="font-mono text-[2.5rem] md:text-[3.5rem] font-light text-white tracking-wider">
            {time}
          </div>
          <div className="font-sans text-[0.95rem] md:text-[1.1rem] font-light text-white/50 tracking-wide">
            {date}
          </div>
        </motion.div>

        {/* 환영 메시지 */}
        <motion.h1
          className="font-serif text-[2rem] md:text-[3rem] font-light text-white text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          Welcome
        </motion.h1>

        {/* Notice 섹션 */}
        <motion.div
          className="px-[2rem] py-[1.5rem] md:px-[2.5rem] md:py-[2rem]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-serif text-[1.25rem] md:text-[1.5rem] font-light text-white mb-[1rem] text-center">
            About This Space
          </h2>
          <p className="font-sans text-[0.95rem] md:text-[1rem] font-light text-white/60 leading-[1.8] text-center">
            이곳은 개인 아카이브입니다.<br />
            자료를 보관하고, 감상하고, 전시하기 위한 공간입니다.
          </p>
        </motion.div>

        {/* 버튼 그룹 */}
        <motion.div
          className="flex flex-col gap-[1rem] w-full max-w-[20rem]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link href="/bubbleHome" className="w-full">
            <motion.button
              className="w-full bg-white text-black rounded-[0.5rem] px-[2rem] py-[1rem] font-sans text-[1rem] md:text-[1.1rem] font-medium hover:bg-white/90 transition-colors duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Enter Bubble
            </motion.button>
          </Link>
          <Link href="/filmHome" className="w-full">
            <motion.button
              className="w-full border-2 border-white text-white rounded-[0.5rem] px-[2rem] py-[1rem] font-sans text-[1rem] md:text-[1.1rem] font-medium hover:bg-white/10 transition-colors duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Enter Film
            </motion.button>
          </Link>
          <Link href="/afterTheRoll" className="w-full">
            <motion.button
              className="w-full rounded-[0.5rem] border border-[rgba(215,188,145,0.45)] bg-[rgba(24,17,12,0.72)] px-[2rem] py-[1rem] font-sans text-[1rem] font-medium text-[rgba(244,231,208,0.92)] transition-colors duration-300 hover:bg-[rgba(40,28,18,0.85)] md:text-[1.1rem]"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Enter After the Roll
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
