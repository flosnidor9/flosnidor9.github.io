import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getAllTrpgPostParams,
  getTrpgPost,
  getTrpgPostHtmlUrl,
} from '@/lib/data/trpg';
import { fromGallerySegments } from '@/lib/galleryPath';
import TrpgLogReader from '@/components/trpg/TrpgLogReader';

type Props = {
  params: Promise<{ postPath: string[] }>;
};

function splitPostPath(postPath: string[]) {
  if (postPath.length < 2) return null;
  const decoded = fromGallerySegments(postPath);
  if (!decoded) return null;

  const segments = decoded.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  return {
    folderSlug: segments.slice(0, -1).join('/'),
    postSlug: segments[segments.length - 1],
  };
}

export async function generateStaticParams() {
  return getAllTrpgPostParams().map(({ folderSlug, postSlug }) => ({
    postPath: [...folderSlug.split('/'), postSlug],
  }));
}

export async function generateMetadata({ params }: Props) {
  const resolved = splitPostPath((await params).postPath);
  if (!resolved) return { title: 'Not Found' };

  const post = getTrpgPost(resolved.folderSlug, resolved.postSlug);
  if (!post) return { title: 'Not Found' };

  return {
    title: `${post.title} | After the Roll`,
    description: post.description || post.title,
  };
}

export default async function TrpgReadPage({ params }: Props) {
  const resolved = splitPostPath((await params).postPath);
  if (!resolved) notFound();

  const post = getTrpgPost(resolved.folderSlug, resolved.postSlug);
  const htmlUrl = getTrpgPostHtmlUrl(resolved.folderSlug, resolved.postSlug);
  if (!post || !htmlUrl) notFound();

  const backHref = '/afterTheRoll';

  return (
    <main className="min-h-screen bg-[var(--film-bg)] px-[1rem] pb-[4rem] pt-[4.5rem] text-amber-50 md:px-[2rem] md:pt-[5rem]">
      <article className="mx-auto max-w-[72rem] overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
        <div className="border-b border-white/10 px-[1.25rem] py-[1.1rem] md:px-[1.5rem]">
          <Link
            href={backHref}
            className="mb-[1rem] inline-flex items-center gap-[0.4rem] rounded-full border border-white/30 bg-white/5 px-[0.75rem] py-[0.45rem] text-[0.82rem] text-white/80 transition-colors hover:bg-white/10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Back</span>
          </Link>

          <h1 className="font-serif text-[2rem] text-white/95 md:text-[2.5rem]">{post.title}</h1>
          {post.description ? <p className="mt-[0.6rem] text-[0.95rem] text-white/60">{post.description}</p> : null}
          {post.gmName || post.cast.length > 0 ? (
            <div className="mt-[1rem] rounded-[1rem] border border-white/10 bg-white/[0.04] px-[0.9rem] py-[0.85rem]">
              <p className="text-[0.7rem] uppercase tracking-[0.18em] text-white/40">Cast</p>

              <div className="mt-[0.65rem] space-y-[0.45rem]">
                {post.gmName ? (
                  <div className="flex items-center gap-[0.6rem] rounded-[0.9rem] border border-white/8 bg-white/[0.03] px-[0.75rem] py-[0.55rem]">
                    {post.gmIconSrc ? (
                      <img
                        src={post.gmIconSrc}
                        alt={post.gmName}
                        className="h-[1.9rem] w-[1.9rem] rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-[1.8rem] w-[1.8rem] items-center justify-center rounded-full bg-amber-100/12 text-amber-50/78">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M12 3l2.35 4.76 5.25.76-3.8 3.7.9 5.23L12 15l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76L12 3z" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[0.64rem] uppercase tracking-[0.14em] text-white/38">GM</p>
                      <p className="text-[0.82rem] text-white/84">{post.gmName}</p>
                    </div>
                  </div>
                ) : null}

                {post.cast.map((entry) => (
                  <div
                    key={`${entry.plName}-${entry.pcName}`}
                    className="flex items-center gap-[0.6rem] rounded-[0.9rem] border border-white/8 bg-white/[0.03] px-[0.75rem] py-[0.55rem]"
                  >
                    {entry.iconSrc ? (
                      <img
                        src={entry.iconSrc}
                        alt={entry.pcName}
                        className="h-[1.9rem] w-[1.9rem] rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-[1.8rem] w-[1.8rem] items-center justify-center rounded-full bg-white/8 text-white/70">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <circle cx="12" cy="8" r="3.2" />
                          <path d="M5.5 19.5c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[0.8rem] text-white/82">{entry.plName}</p>
                      <p className="text-[0.72rem] text-white/45">{entry.pcName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-[1rem] flex flex-wrap gap-[0.5rem]">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-[0.75rem] py-[0.25rem] text-[0.75rem] text-white/65"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="px-[0.2rem] py-[0.2rem] md:px-[0.5rem] md:py-[0.5rem]">
          <TrpgLogReader htmlUrl={htmlUrl} fallbackAvatarSrc={post.gmIconSrc} />
        </div>
      </article>
    </main>
  );
}
