'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { addLog } from '@/lib/data/firebaseLog';
import PixelDustEffect from '@/components/effects/PixelDustEffect';

type Props = {
  timelineRef: React.RefObject<HTMLDivElement | null>;
  onSuccess?: () => void;
};

const AVAILABLE_TAGS = ['일상', '마젠타', '그린', '스카이', '마제그린', '마코스카'];

const tagColors: Record<string, string> = {
  일상: 'bg-gray-500/20 text-gray-300 border-gray-400/30',
  마젠타: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/30',
  그린: 'bg-green-500/20 text-green-300 border-green-400/30',
  스카이: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
  마제그린: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  마코스카: 'bg-violet-500/20 text-violet-300 border-violet-400/30',
};

export default function LogComposer({ timelineRef, onSuccess }: Props) {
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imagePaths, setImagePaths] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDust, setShowDust] = useState(false);

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const parsedImages = imagePaths
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.startsWith('/images/'));

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setShowDust(true);

    try {
      await addLog({
        content: content.trim(),
        tags: selectedTags,
        images: parsedImages,
      });

      // 폼 초기화
      setContent('');
      setSelectedTags([]);
      setImagePaths('');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to add log:', error);
      setShowDust(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDustComplete = () => {
    setShowDust(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="log-card rounded-[1rem] mb-[2rem]"
    >
      {/* 텍스트 입력 */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="무엇을 기록할까요? (마크다운 지원)"
        className="w-full min-h-[6rem] bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-muted)] resize-none focus:outline-none text-[0.95rem] leading-relaxed"
      />

      {/* 이미지 경로 입력 */}
      <div className="mt-[1rem] pt-[1rem] border-t border-[var(--color-border)]">
        <input
          type="text"
          value={imagePaths}
          onChange={(e) => setImagePaths(e.target.value)}
          placeholder="/images/log/파일명.jpg (쉼표로 구분)"
          className="w-full bg-[var(--color-surface)]/50 text-[var(--color-text)] placeholder:text-[var(--color-muted)] rounded-[0.5rem] px-[0.75rem] py-[0.5rem] text-[0.85rem] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />

        {/* 이미지 미리보기 */}
        {parsedImages.length > 0 && (
          <div className="flex gap-[0.5rem] flex-wrap mt-[0.75rem]">
            {parsedImages.map((path, i) => (
              <div
                key={i}
                className="relative w-[4rem] h-[4rem] rounded-[0.5rem] overflow-hidden bg-[var(--color-surface)]"
              >
                <Image
                  src={path}
                  alt={`preview-${i}`}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 태그 선택 */}
      <div className="mt-[1rem] pt-[1rem] border-t border-[var(--color-border)]">
        <div className="flex gap-[0.4rem] flex-wrap">
          {AVAILABLE_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            const colorClass = tagColors[tag] || 'bg-gray-500/20 text-gray-300 border-gray-400/30';
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`text-[0.8rem] font-medium px-[0.6rem] py-[0.25rem] rounded-full border transition-all ${
                  isSelected
                    ? colorClass
                    : 'bg-[var(--color-surface)]/50 text-[var(--color-muted)] border-transparent hover:bg-[var(--color-surface)]'
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* 제출 버튼 */}
      <div className="mt-[1rem] pt-[1rem] border-t border-[var(--color-border)] flex justify-end">
        <button
          ref={submitButtonRef}
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className="px-[1.25rem] py-[0.5rem] rounded-full text-[0.85rem] font-medium bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '기록 중...' : '기록하기'}
        </button>
      </div>

      {/* 픽셀 가루 효과 */}
      <PixelDustEffect
        isActive={showDust}
        originRef={submitButtonRef}
        targetRef={timelineRef}
        onComplete={handleDustComplete}
      />
    </motion.div>
  );
}
