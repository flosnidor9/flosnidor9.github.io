import PlaysSection from '@/components/plays/PlaysSection';

export const dynamic = 'force-static';

export default function PlaysPage() {
  return (
    <main className="afterroll-desk min-h-screen px-[1.1rem] pb-[4rem] pt-[5.4rem] md:px-[2rem]">
      <div className="mx-auto max-w-[52rem]">
        <header className="mb-[2rem]">
          <p className="afterroll-meta text-[0.72rem] uppercase tracking-[0.18em] text-[var(--atr-accent)]">
            플레이 목록
          </p>
          <h1 className="afterroll-title mt-[0.35rem] text-[2.4rem] leading-none text-[var(--ledger-ink)]">
            플레이 목록
          </h1>
          <p className="afterroll-meta mt-[0.55rem] text-[0.78rem] text-[var(--ledger-muted)]">
            플레이 기록, 진행 상태, 참여 이력을 모아둔 정리함
          </p>
        </header>
        <PlaysSection />
      </div>
    </main>
  );
}
