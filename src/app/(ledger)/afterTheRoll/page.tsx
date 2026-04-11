import TrpgArchiveClient from '@/components/trpg/TrpgArchiveClient';
import { getAllTrpgPosts } from '@/lib/data/trpg';

export default function AfterTheRollPage() {
  return (
    <TrpgArchiveClient
      posts={getAllTrpgPosts()}
      title="After the Roll"
      description="세션 로그와 메모를 폴더 단계 없이 바로 펼쳐 둡니다. 태그를 고르면 원하는 결만 남겨서 볼 수 있습니다."
    />
  );
}
