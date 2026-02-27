import GiscusEmbed from '@/components/guestbook/GiscusEmbed';

export default function GuestbookPage() {
  return (
    <main className="relative min-h-screen pt-[5rem] pb-[4rem]">
      <div className="max-w-[48rem] mx-auto px-[1.5rem]">
        {/* 헤더 */}
        <header className="mb-[3rem]">
          <h1 className="font-serif text-[2.5rem] font-light text-[var(--color-text)] tracking-wide mb-[0.5rem]">
            Guestbook
          </h1>
          <p className="text-[0.85rem] text-[var(--color-muted)]">
            방문해줘서 고마워요
          </p>
        </header>

        <GiscusEmbed />
      </div>
    </main>
  );
}
