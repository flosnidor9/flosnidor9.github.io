import { getAllTrpgPosts } from '@/lib/data/trpg';
import TrpgArchiveClient from '@/components/trpg/TrpgArchiveClient';

export const dynamic = 'force-static';

export default function LogsPage() {
  const posts = getAllTrpgPosts();

  return (
    <TrpgArchiveClient
      posts={posts}
      title="Logs"
      description="세션 로그 백업 아카이브입니다."
    />
  );
}
