import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getAllTrpgPostParams,
  getTrpgPost,
  getTrpgPostHtmlUrl,
} from '@/lib/data/trpg';
import { fromGallerySegments } from '@/lib/galleryPath';
import TrpgLogReader from '@/components/trpg/TrpgLogReader';
import TrpgCastPanel from '@/components/trpg/TrpgCastPanel';

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
            <TrpgCastPanel gmName={post.gmName} gmIconSrc={post.gmIconSrc} cast={post.cast} />
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
