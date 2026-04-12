import TrpgArchiveClient from '@/components/trpg/TrpgArchiveClient';
import { getAllTrpgPosts } from '@/lib/data/trpg';

export default function AfterTheRollPage() {
  return (
    <TrpgArchiveClient
      posts={getAllTrpgPosts()}
      title="After the Roll"
      description="태그를 고르면 원하는 분류만 남겨서 볼 수 있습니다."
    />
  );
}
