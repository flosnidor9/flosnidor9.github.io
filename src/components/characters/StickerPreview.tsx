import Image from '@/components/ArchiveImage';
import type { CharacterSticker } from '@/lib/data/characters';

const STICKER_PREVIEW_POSITIONS = [
  { left: '0%', top: '12%' },
  { left: '100%', top: '43%' },
  { left: '70%', top: '100%' },
  { left: '20%', top: '100%' },
  { left: '0%', top: '64%' },
] as const;

export default function StickerPreview({ stickers }: { stickers: CharacterSticker[] }) {
  return <div className="relative mx-auto mt-[0.65rem] aspect-[4/3] w-full max-w-[18rem] rounded-[0.35rem] border border-dashed border-[var(--atr-line)] bg-[rgba(255,248,250,0.45)] p-[0.6rem]"><div className="h-full w-full rounded-[0.15rem] bg-[rgba(200,121,147,0.14)]" />{stickers.map((sticker, index) => {
    const position = STICKER_PREVIEW_POSITIONS[index % STICKER_PREVIEW_POSITIONS.length];
    const size = sticker.size ?? 1;
    return <div key={`${sticker.src}-${index}`} className="pointer-events-none absolute" style={{ ...position, width: `${3.2 * size}rem`, height: `${3.2 * size}rem`, transform: 'translate(-50%, -50%)' }}><Image src={sticker.src} alt="" fill sizes="6rem" unoptimized className="object-contain drop-shadow-[0_0.18rem_0.2rem_rgba(91,48,64,0.2)]" /></div>;
  })}<p className="absolute bottom-[0.35rem] left-1/2 -translate-x-1/2 whitespace-nowrap afterroll-meta text-[0.62rem] text-[var(--atr-soft)]">상세 카드 미리보기</p></div>;
}
