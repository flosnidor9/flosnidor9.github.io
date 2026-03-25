'use client';

import { useEffect, useRef } from 'react';
import { PUBLIC_SITE_CONFIG } from '@/lib/config/public';

const {
  repo: REPO,
  repoId: REPO_ID,
  category: CATEGORY,
  categoryId: CATEGORY_ID,
} = PUBLIC_SITE_CONFIG.giscus;

const isConfigured = REPO && REPO_ID && CATEGORY && CATEGORY_ID;

export default function GiscusEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!isConfigured || !container) return;

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

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
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
            src/lib/config/public.ts
          </code>{' '}
          환경변수를 채워주세요.
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className="giscus-container" />;
}
