'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import type { FolderData, PostData } from '@/lib/data/folders';

type Props = {
  folder: FolderData;
  posts: PostData[];
  content: string | null;
};

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="font-serif text-[1.25rem] md:text-[1.5rem] text-white/90 mb-[0.75rem]">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="font-serif text-[1.1rem] md:text-[1.25rem] text-white/85 mb-[0.5rem] mt-[1rem]">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="font-sans text-[1rem] text-white/80 mb-[0.5rem] mt-[0.75rem]">
      {children}
    </h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="font-sans text-[0.9rem] text-white/70 leading-relaxed mb-[0.75rem] last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside text-white/70 mb-[0.75rem] space-y-[0.25rem]">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside text-white/70 mb-[0.75rem] space-y-[0.25rem]">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="font-sans text-[0.85rem]">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="text-white/90 font-medium">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="text-white/80 italic">{children}</em>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-[2px] border-white/20 pl-[1rem] my-[0.75rem] text-white/60 italic">
      {children}
    </blockquote>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-white/10 px-[0.3rem] py-[0.1rem] rounded text-[0.85em] text-white/80">
      {children}
    </code>
  ),
  hr: () => <hr className="border-white/10 my-[1rem]" />,
};

export default function FolderDetailScene({ folder, posts, content }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const firstImage = posts.find((p) => p.image)?.image;
  const bgImage = firstImage || folder.thumbnail;

  return (
    <section className="min-h-screen w-full overflow-x-hidden cursor-none">
      {/* 배경 레이어 */}
      <div className="fixed inset-0 z-0">
        {bgImage && (
          <div className="absolute inset-0 hero-blur-bg">
            <Image src={bgImage} alt="" fill className="object-cover" priority />
          </div>
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 grain-texture pointer-events-none" />
      </div>

      {/* 콘텐츠 */}
      <div className="relative z-10 min-h-screen py-[3rem] md:py-[4rem] lg:py-[5rem]">
        {/* 헤더 - 가운데 정렬 */}
        <motion.header
          className="flex flex-col items-center text-center mb-[3rem] md:mb-[4rem] px-[1.5rem]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            href="/"
            className="glass-card flex items-center justify-center w-[2.5rem] h-[2.5rem] rounded-full hover:bg-white/[0.12] transition-colors mb-[1.5rem]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-white/70"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>

          <motion.h1
            className="font-serif text-[2rem] md:text-[2.5rem] lg:text-[3rem] text-white/90 leading-tight mb-[0.75rem]"
            layoutId={`folder-title-${folder.slug}`}
          >
            {folder.title}
          </motion.h1>

          <div className="flex items-center gap-[0.75rem]">
            {folder.tags.map((tag) => (
              <span
                key={tag}
                className="text-[0.75rem] text-white/50 bg-white/5 px-[0.75rem] py-[0.25rem] rounded-full"
              >
                {tag}
              </span>
            ))}
            <span className="text-[0.75rem] text-white/30">
              {posts.length} posts
            </span>
          </div>
        </motion.header>

        {/* 폴더 설명 (content.md) */}
        {content && (
          <motion.article
            className="glass-card rounded-[1.25rem] p-[2rem] md:p-[2.5rem] mx-auto max-w-[40rem] text-center"
            style={{ marginLeft: 'auto', marginRight: 'auto', width: 'calc(100% - 3rem)', marginBottom: '6rem' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <ReactMarkdown components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </motion.article>
        )}

        {/* 포스트 피드 */}
        <div className="flex flex-col gap-[2.5rem] md:gap-[3rem] max-w-[42rem] mx-auto px-[1.5rem] md:px-[2rem]">
          {posts.map((post, i) => (
            <PostCard
              key={post.slug}
              post={post}
              index={i}
              onImageClick={setSelectedImage}
            />
          ))}
        </div>

        {/* 하단 여백 */}
        <div className="h-[4rem] md:h-[6rem]" />
      </div>

      {/* 그레인 최상위 */}
      <div className="fixed inset-0 grain-texture pointer-events-none z-20" />

      {/* 이미지 라이트박스 */}
      <AnimatePresence>
        {selectedImage && (
          <ImageLightbox
            src={selectedImage}
            alt={folder.title}
            onClose={() => setSelectedImage(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

type PostCardProps = {
  post: PostData;
  index: number;
  onImageClick: (src: string) => void;
};

function PostCard({ post, index, onImageClick }: PostCardProps) {
  const hasOnlyImage = post.image && !post.content;
  const hasOnlyText = !post.image && post.content;

  return (
    <motion.article
      className="glass-card rounded-[1.25rem] overflow-hidden"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.15 + index * 0.08,
      }}
    >
      {/* 이미지 */}
      {post.image && (
        <motion.button
          className={`relative w-full overflow-hidden group ${hasOnlyImage ? 'rounded-[1.25rem]' : ''}`}
          style={{ aspectRatio: '4 / 3' }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onImageClick(post.image!)}
        >
          <Image
            src={post.image}
            alt={post.slug}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 42rem"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </motion.button>
      )}

      {/* 글 */}
      {post.content && (
        <div className={`p-[1.5rem] md:p-[2rem] text-center ${post.image ? 'pt-[2rem] md:pt-[2.5rem]' : ''}`}>
          <ReactMarkdown components={markdownComponents}>
            {post.content}
          </ReactMarkdown>
        </div>
      )}
    </motion.article>
  );
}

type LightboxProps = {
  src: string;
  alt: string;
  onClose: () => void;
};

function ImageLightbox({ src, alt, onClose }: LightboxProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center cursor-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
    >
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* 닫기 버튼 */}
      <button
        className="absolute top-[1.5rem] right-[1.5rem] glass-card w-[2.5rem] h-[2.5rem] rounded-full flex items-center justify-center z-10 hover:bg-white/[0.12] transition-colors"
        onClick={onClose}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-white/70"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* 이미지 */}
      <motion.div
        className="relative max-w-[90vw] max-h-[85vh] rounded-[1rem] overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={800}
          className="object-contain max-h-[85vh] w-auto"
          priority
        />
      </motion.div>
    </motion.div>
  );
}
