import PromiseTicketsSection from '@/components/promises/PromiseTicketsSection';

export const dynamic = 'force-static';

export default function PromisesPage() {
  return (
    <main className="afterroll-desk min-h-screen px-[1.1rem] pb-[4rem] pt-[5.4rem] md:px-[2rem]">
      <div className="mx-auto max-w-[52rem]">
        <header className="mb-[2rem]">
          <p className="afterroll-meta text-[0.72rem] uppercase tracking-[0.18em] text-[var(--atr-accent)]">promise tickets</p>
          <h1 className="afterroll-title mt-[0.35rem] text-[2.4rem] leading-none text-[var(--ledger-ink)]">공수표 목록</h1>
        </header>
        <PromiseTicketsSection />
      </div>
    </main>
  );
}
