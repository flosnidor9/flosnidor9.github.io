'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import type { FolderData } from '@/lib/data/folders';

type Props = {
  folders: FolderData[];
};

/**
 * 사이드바용 세션(폴더) 목록
 */
export default function SessionList({ folders }: Props) {
  if (folders.length === 0) {
    return (
      <motion.div
        className="glass-card rounded-[1rem] p-[1.25rem]"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
      >
        <p className="text-[0.75rem] text-white/30 text-center">
          No sessions yet
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-[0.75rem] max-h-[60vh] overflow-y-auto hide-scrollbar pr-[0.25rem]"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
    >
      {folders.map((folder, i) => (
        <SessionItem key={folder.slug} folder={folder} index={i} />
      ))}
    </motion.div>
  );
}

type SessionItemProps = {
  folder: FolderData;
  index: number;
};

function SessionItem({ folder, index }: SessionItemProps) {
  return (
    <motion.a
      href={`/${folder.slug}`}
      className="session-item group relative flex items-center gap-[0.75rem] p-[0.75rem] rounded-[0.75rem] glass-card hover:bg-white/[0.08] transition-colors cursor-pointer"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.5 + index * 0.08,
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* 썸네일 */}
      <div className="relative w-[3rem] h-[3rem] rounded-[0.5rem] overflow-hidden flex-shrink-0 bg-[var(--color-surface)]">
        {folder.thumbnail ? (
          <Image
            src={folder.thumbnail}
            alt={folder.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="flex flex-col gap-[0.15rem] min-w-0 flex-1">
        <h4 className="font-sans text-[0.85rem] text-white/90 truncate leading-tight">
          {folder.title}
        </h4>
        <div className="flex items-center gap-[0.3rem]">
          {folder.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[0.6rem] text-white/40 bg-white/5 px-[0.4rem] py-[0.1rem] rounded-full"
            >
              {tag}
            </span>
          ))}
          <span className="text-[0.6rem] text-white/30">
            {folder.count}
          </span>
        </div>
      </div>

      {/* 화살표 */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </motion.a>
  );
}
