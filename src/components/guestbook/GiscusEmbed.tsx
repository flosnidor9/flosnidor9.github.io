'use client';

import { useEffect, useRef } from 'react';

const REPO = process.env.NEXT_PUBLIC_GISCUS_REPO ?? '';
const REPO_ID = process.env.NEXT_PUBLIC_GISCUS_REPO_ID ?? '';
const CATEGORY = process.env.NEXT_PUBLIC_GISCUS_CATEGORY ?? '';
const CATEGORY_ID = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID ?? '';

const isConfigured = REPO && REPO_ID && CATEGORY && CATEGORY_ID;

export default function GiscusEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isConfigured || !containerRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', REPO);
    script.setAttribute('data-repo-id', REPO_ID);
    script.setAttribute('data-category', CATEGORY);
    script.setAttribute('data-category-id', CATEGORY_ID);
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', 'transparent_dark');
    script.setAttribute('data-lang', 'ko');
    script.setAttribute('data-loading', 'lazy');
    script.crossOrigin = 'anonymous';
    script.async = true;

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  if (!isConfigured) {
    return (
      <div className="glass-card rounded-[1.25rem] p-[3rem] flex flex-col items-center justify-center gap-[1rem] text-center">
        <p className="font-serif text-[1.5rem] font-light text-[var(--color-text)] tracking-wide">
          방명록 준비 중
        </p>
        <p className="text-[0.85rem] text-[var(--color-muted)] leading-relaxed max-w-[24rem]">
          Giscus 설정 후 이 자리에 방명록이 열립니다.
          <br />
          <code className="text-[0.78rem] text-[var(--color-accent)] bg-white/5 px-[0.4rem] py-[0.15rem] rounded">
            NEXT_PUBLIC_GISCUS_*
          </code>{' '}
          환경변수를 채워주세요.
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className="giscus-container" />;
}
