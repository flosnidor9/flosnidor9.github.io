import AcornsSection from '@/components/acorns/AcornsSection';

export const dynamic = 'force-static';

export default function AcornsPage() {
  return (
    <main className="afterroll-desk min-h-screen px-[1.1rem] pb-[4rem] pt-[5.4rem] md:px-[2rem]">
      <div className="mx-auto max-w-[52rem]">
        <header className="mb-[2rem]">
          <p className="afterroll-meta text-[0.72rem] uppercase tracking-[0.18em] text-[var(--atr-accent)]">
            acorn list
          </p>
          <h1 className="afterroll-title mt-[0.35rem] text-[2.4rem] leading-none text-[var(--ledger-ink)]">
            도토리 목록
          </h1>
          <p className="afterroll-meta mt-[0.55rem] text-[0.78rem] text-[var(--ledger-muted)]">
            룰별로 모아 둔 플레이 후보입니다. 공식과 팬메이드를 나누어 살펴볼 수 있어요.
          </p>
        </header>
        <AcornsSection />
      </div>
    </main>
  );
}
