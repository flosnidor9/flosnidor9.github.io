'use client';

import { motion } from 'framer-motion';

type Props = {
  onRequest: () => void;
};

export default function GyroPermissionPrompt({ onRequest }: Props) {
  return (
    <motion.button
      className="absolute inset-0 flex flex-col items-end justify-end pb-[7rem] pr-[2rem] z-50 w-full cursor-pointer"
      onClick={onRequest}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.3 } }}
      transition={{ delay: 1.8, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      aria-label="기기 기울기 센서 허용하기"
    >
      <motion.div
        className="flex flex-col items-center gap-[0.6rem] px-[1.4rem] py-[1rem] rounded-[1.2rem] pointer-events-none"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.14)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      >
        {/* 기울이기 아이콘 */}
        <motion.div
          className="text-white/60"
          animate={{ rotate: [-12, 12, -12] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <rect x="7" y="3" width="12" height="20" rx="3" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="13" cy="19" r="1.2" fill="currentColor" />
            {/* 기울기 화살표 힌트 */}
            <path d="M3 13 L6 10 M3 13 L6 16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
            <path d="M23 13 L20 10 M23 13 L20 16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
          </svg>
        </motion.div>

        <p className="font-sans text-[0.7rem] text-white/70 text-center leading-snug whitespace-nowrap">
          기울여서 탐색하기
        </p>
        <p className="font-sans text-[0.6rem] text-white/35 text-center">
          탭하여 허용
        </p>
      </motion.div>
    </motion.button>
  );
}
