import Image from 'next/image';
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

  return (
    <main className="afterroll-read-shell afterroll-desk min-h-screen px-[1rem] pb-[4rem] pt-[4.7rem] text-[var(--ledger-ink)] md:px-[2rem] md:pt-[5.1rem]">
      <article className="afterroll-read-paper ledger-paper-sheet paper-lined paper-holes-left mx-auto max-w-[72rem] overflow-hidden rounded-[0.8rem]">
        <div className="afterroll-read-header border-b border-[rgba(87,67,48,0.12)] px-[1.2rem] py-[1.1rem] md:px-[1.5rem]">
          <Link
            href="/afterTheRoll"
            className="ledger-note-card ledger-dashed afterroll-note mb-[1rem] inline-flex items-center gap-[0.4rem] rounded-[0.5rem] px-[0.9rem] py-[0.5rem] text-[1rem] text-[var(--ledger-muted)] transition-transform hover:-translate-y-[0.03rem]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Home</span>
          </Link>

          <h1 className="afterroll-title text-[2.8rem] leading-[0.92] text-[var(--ledger-ink)] md:text-[3.8rem]">
            {post.title}
          </h1>
          {post.description ? (
            <p className="afterroll-body mt-[0.6rem] max-w-[42rem] text-[1.08rem] leading-[1.65] text-[var(--ledger-muted)]">
              {post.description}
            </p>
          ) : null}

          {post.gmName || post.cast.length > 0 ? (
            <div className="ledger-paper-sheet paper-grid relative mt-[1rem] rounded-[0.55rem] px-[0.9rem] py-[0.85rem]">
              <p className="afterroll-meta relative z-[1] text-[0.86rem] uppercase tracking-[0.16em] text-[var(--ledger-soft)]">Cast</p>

              <div className="relative z-[1] mt-[0.65rem] space-y-[0.45rem]">
                {post.gmName ? (
                  <div className="ledger-typed-box paper-plain rounded-[0.35rem] px-[0.75rem] py-[0.55rem]">
                    <div className="flex items-center gap-[0.6rem]">
                      {post.gmIconSrc ? (
                        <Image
                          src={post.gmIconSrc}
                          alt={post.gmName}
                          width={30}
                          height={30}
                          className="h-[1.9rem] w-[1.9rem] rounded-[0.2rem] border border-[rgba(87,67,48,0.18)] object-cover p-[0.1rem]"
                        />
                      ) : (
                        <div className="flex h-[1.8rem] w-[1.8rem] items-center justify-center border border-[rgba(87,67,48,0.18)] bg-[rgba(127,79,42,0.08)] text-[var(--ledger-accent)]">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M12 3l2.35 4.76 5.25.76-3.8 3.7.9 5.23L12 15l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76L12 3z" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="afterroll-meta text-[0.92rem] text-[var(--ledger-soft)]">GM</p>
                        <p className="afterroll-body text-[0.82rem] text-[var(--ledger-ink)]">{post.gmName}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {post.cast.map((entry) => (
                  <div
                    key={`${entry.plName}-${entry.pcName}`}
                    className="ledger-typed-box paper-plain rounded-[0.35rem] px-[0.75rem] py-[0.55rem]"
                  >
                    <div className="flex items-center gap-[0.6rem]">
                      {entry.iconSrc ? (
                        <Image
                          src={entry.iconSrc}
                          alt={entry.pcName}
                          width={30}
                          height={30}
                          className="h-[1.9rem] w-[1.9rem] rounded-[0.2rem] border border-[rgba(87,67,48,0.18)] object-cover p-[0.1rem]"
                        />
                      ) : (
                        <div className="flex h-[1.8rem] w-[1.8rem] items-center justify-center border border-[rgba(87,67,48,0.18)] bg-[rgba(122,139,97,0.08)] text-[var(--ledger-green)]">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <circle cx="12" cy="8" r="3.2" />
                            <path d="M5.5 19.5c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="afterroll-body text-[0.8rem] text-[var(--ledger-ink)]">{entry.plName}</p>
                        <p className="afterroll-meta text-[0.72rem] text-[var(--ledger-muted)]">{entry.pcName}</p>
                      </div>
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
                className="afterroll-meta rounded-[0.45rem] border border-[rgba(87,67,48,0.12)] bg-[rgba(255,250,239,0.85)] px-[0.76rem] py-[0.26rem] text-[0.96rem] text-[var(--ledger-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="afterroll-read-log-wrap px-[0.2rem] py-[0.2rem] md:px-[0.45rem] md:py-[0.45rem]">
          <TrpgLogReader htmlUrl={htmlUrl} fallbackAvatarSrc={post.gmIconSrc} />
        </div>
      </article>
    </main>
  );
}
