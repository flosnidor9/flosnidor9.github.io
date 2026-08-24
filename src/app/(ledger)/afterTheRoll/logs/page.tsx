import { getAllTrpgPosts } from '@/lib/data/trpg';
import TrpgArchiveClient from '@/components/trpg/TrpgArchiveClient';

export const dynamic = 'force-static';

export default function LogsPage() {
  const posts = getAllTrpgPosts();

  return (
    <TrpgArchiveClient
      posts={posts}
      title="로그"
      description="다시 읽을 수 있는 세션 로그와 보관된 테이블 기록"
    />
  );
}
