import PlaysSection from '@/components/plays/PlaysSection';

export const dynamic = 'force-static';

export default function PlaysPage() {
  return (
    <main className="afterroll-desk min-h-screen px-[1.1rem] pb-[4rem] pt-[5rem] md:px-[2rem]">
      <div className="mx-auto max-w-[52rem]">
        <header className="mb-[2rem]">
          <h1 className="afterroll-title text-[2.4rem] leading-none text-[var(--ledger-ink)]">Plays</h1>
          <p className="afterroll-meta mt-[0.4rem] text-[0.85rem] text-[var(--ledger-muted)]">
            플레이한 세션들의 기록
          </p>
        </header>
        <PlaysSection />
      </div>
    </main>
  );
}
