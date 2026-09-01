import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type TendencyItem = {
  label: string;
  value?: string;
};

export type TendencySection = {
  id: string;
  title: string;
  items: TendencyItem[];
};

export type TendencyRule = {
  name: string;
  role: string;
  fluency: string;
  note?: string;
};

export type TendencyRating = {
  label: string;
  level: string;
  note: string;
};

export type TendencyDetailEntry = {
  category: 'prepare' | 'session' | 'roleplay';
  label: string;
  gm: string;
  pl: string;
};

export type TendencyPreferenceItem = {
  label: string;
  status: 'like' | 'neutral' | 'avoid';
};

export type TendencyTriggerItem = {
  label: string;
  status: 'ok' | 'depict' | 'ask' | 'no';
  note?: string;
};

export type TendencyProfile = {
  displayName: string;
  handle: string;
  profileUrl: string;
  avatarUrl: string;
  statusLine: string;
  detailTags: string[];
  sections: TendencySection[];
  rules: TendencyRule[];
  ownedRules: TendencyRule[];
  dislikes: string[];
  ratings: TendencyRating[];
  details: TendencyDetailEntry[];
  characterTraits: TendencyPreferenceItem[];
  preferences: TendencyPreferenceItem[];
  triggers: TendencyTriggerItem[];
  updatedAt?: Timestamp;
};

export type TendencyProfileInput = Omit<TendencyProfile, 'updatedAt'>;

export const DEFAULT_TENDENCY_PROFILE: TendencyProfileInput = {
  displayName: '바나나',
  handle: 'banananabana_t',
  profileUrl: 'https://x.com/banananabana_t',
  avatarUrl: 'https://unavatar.io/x/banananabana_t',
  statusLine: 'DX3에 입문하고 싶다',
  detailTags: ['#사담많음', '#롤플빠름', '#조율시맞추는편', '#딴짓안함'],
  sections: [
    {
      id: 'session-type',
      title: '세션 유형',
      items: [
        { label: '온라인' },
        { label: '오프라인' },
        { label: '보이스' },
        { label: '텍스트' },
        { label: '1:1' },
        { label: '다인' },
        { label: '마스터링' },
        { label: '플레이어' },
        { label: '단기' },
        { label: '장기' },
      ],
    },
    {
      id: 'platform',
      title: '선호 유형',
      items: [
        { label: 'Roll20' },
        { label: '코코포리아' },
        { label: '도돈토후' },
        { label: '디스코드' },
        { label: '오픈카톡' },
        { label: '외부 구인 가능' },
        { label: '외부 관전 가능' },
      ],
    },
    {
      id: 'schedule',
      title: '일정 조율',
      items: [
        { label: '월', value: '7월은 아침 제외 가능' },
        { label: '화', value: '모두 가능' },
        { label: '수', value: '모두 가능' },
        { label: '목', value: '모두 가능' },
        { label: '금', value: '저녁-새벽 제외 가능' },
        { label: '토', value: '8월은 저녁 제외 가능' },
        { label: '일', value: '7월은 아침 제외 가능' },
        { label: 'N달 전 조율', value: '좋음' },
        { label: 'N주 전 조율', value: '좋음' },
        { label: 'N일 전 조율', value: '괜찮음' },
      ],
    },
    {
      id: 'play-style',
      title: '플레이 성향',
      items: [
        { label: '단문' },
        { label: '중문' },
        { label: '장문' },
        { label: '대사 (행동)' },
        { label: '"대사" 행동' },
        { label: '사담 가능' },
        { label: '메타 발언 가능' },
        { label: '초성 사용 가능' },
      ],
    },
    {
      id: 'game-style',
      title: '게임 성향',
      items: [
        { label: '연애요소' },
        { label: 'PVP' },
        { label: 'RP' },
        { label: 'G' },
      ],
    },
    {
      id: 'etc',
      title: '기타 성향',
      items: [
        { label: '글' },
        { label: '그림' },
        { label: '소비' },
        { label: '디자인' },
        { label: '덕질' },
        { label: '캐릭터성' },
      ],
    },
  ],
  rules: [
    { name: 'CoC', role: 'GM/PL', fluency: '능숙' },
    { name: '인세인', role: 'GM/PL', fluency: '미숙' },
    { name: '시노비가미', role: 'GM/PL', fluency: '능숙' },
  ],
  ownedRules: [],
  dislikes: ['2차 캐입 TRPG', '조용한 사담방'],
  ratings: [
    { label: '노출', level: '4', note: '성기 노출' },
    { label: '성행위', level: '4', note: '성범죄 또는 노골적인 성행위' },
    { label: '폭력', level: '4', note: '잔인한 살해' },
    { label: '언어', level: '4', note: '노골적이고 외설적인 비속어' },
  ],
  details: [
    { category: 'prepare', label: '플랫폼', gm: '코코포리아 선호', pl: '상관없음' },
    { category: 'prepare', label: 'BGM', gm: '추천 위주, 없으면 직접 찾아서 사용', pl: '상관없음' },
    { category: 'prepare', label: '세션카드', gm: '배포사용, 없으면 커미션이나 직접 제작', pl: '상관없음' },
    { category: 'prepare', label: '맵시트', gm: 'Roll20 플레이 시에는 배포 사용', pl: '상관없음' },
    { category: 'prepare', label: '핸드아웃', gm: '그때마다 직접 타이핑', pl: '상관없음' },
    { category: 'prepare', label: '스탠딩', gm: '상관없음', pl: '필요 시 픽크루 혹은 커미션 이용' },
    { category: 'session', label: '연락수단', gm: '디스코드 및 오픈카톡', pl: '상관없음' },
    { category: 'session', label: '도착시간', gm: '5분 전 도착 선호', pl: '5분~10분 전 도착' },
    { category: 'session', label: '집중시간', gm: '모두에게 맞춥니다', pl: '최장 8시간' },
    { category: 'session', label: '휴식시간', gm: '조율 후 다같이 휴식', pl: '조율 후 다같이 휴식' },
    { category: 'session', label: '자리비움', gm: '사전에 고지, 5분 미만', pl: '사전에 고지, 5분 미만' },
    { category: 'session', label: '연락답장 시간', gm: '빠름, 늦어도 1시간 이내 확인', pl: '빠름, 늦어도 1시간 이내 확인' },
    { category: 'session', label: '당일 일정 파기', gm: '본인: 석고대죄 / 타인: 반복적이지만 않으면 됨', pl: '본인: 석고대죄 / 타인: 상관없음' },
    { category: 'roleplay', label: '스타일', gm: '대사 (지문)', pl: '상관없음' },
    { category: 'roleplay', label: '문장길이', gm: '단문, 중문', pl: '단문 위주, 필요시 중문, 빠름' },
    { category: 'roleplay', label: '메타발언', gm: 'PL끼리 조율 시 허용', pl: '사용하지 않음' },
    { category: 'roleplay', label: '개그발언', gm: 'PL끼리 조율 시 허용', pl: '상대방에게 맞춤' },
    { category: 'roleplay', label: '초성사용', gm: 'PL끼리 조율 시 허용', pl: '사용하지 않음' },
    { category: 'roleplay', label: 'RP', gm: '정해진 시간이 있을 때만 그에 맞춰서 진행', pl: '몰입감 중요시 함' },
    { category: 'roleplay', label: '딴짓', gm: '없음, 가끔 트위터에 중계트윗', pl: '없음, 가끔 트위터에 중계트윗' },
    { category: 'roleplay', label: '사담탭', gm: '사담탭 사용', pl: '무엇을 사용하든 상관없음' },
    { category: 'roleplay', label: '세션 외적인 내용', gm: '사담 많은 편, 반응 빠름', pl: '사담 많은 편, 반응 빠름' },
    { category: 'roleplay', label: '타 룰 언급', gm: '모두가 알고있는 룰이라면 허용', pl: '안하는 편' },
    { category: 'roleplay', label: '참여태도', gm: '세션 중 단순작업 허용', pl: '트위터에 중계트윗만 함' },
  ],
  characterTraits: [
    { label: '여캐러', status: 'like' },
    { label: '남캐러', status: 'avoid' },
    { label: '츤데레', status: 'avoid' },
    { label: '얀데레', status: 'avoid' },
    { label: '갭모에', status: 'like' },
    { label: '천연', status: 'like' },
    { label: '츳코미역', status: 'avoid' },
    { label: '마이페이스', status: 'avoid' },
    { label: '다혈질', status: 'like' },
    { label: '냉혈한', status: 'avoid' },
    { label: '소심', status: 'avoid' },
    { label: '인외', status: 'avoid' },
  ],
  preferences: [
    { label: '협력', status: 'like' },
    { label: '대립', status: 'like' },
    { label: '전투', status: 'like' },
    { label: 'PVP', status: 'like' },
    { label: '은닉', status: 'like' },
    { label: '레일로드', status: 'like' },
    { label: '정보 격차', status: 'like' },
    { label: '캐릭터 간 로맨스', status: 'like' },
    { label: 'NPC와의 로맨스', status: 'like' },
    { label: '메타 추리', status: 'avoid' },
    { label: '캐릭터 조종', status: 'avoid' },
    { label: '로스트 가능', status: 'avoid' },
  ],
  triggers: [
    { label: '유혈', status: 'ok' },
    { label: '고어', status: 'ok' },
    { label: '상해', status: 'ok' },
    { label: '사고', status: 'ok' },
    { label: '시체', status: 'ok' },
    { label: '아동 학대', status: 'ok' },
    { label: '동물 학대', status: 'ok' },
    { label: '가정 폭력', status: 'ok' },
    { label: '따돌림', status: 'ok' },
    { label: '가스라이팅', status: 'ok' },
    { label: '자해', status: 'ok' },
    { label: '자살', status: 'ok' },
    { label: '신체 훼손', status: 'ok' },
    { label: '신체 변이', status: 'ok' },
    { label: '성적 요구', status: 'ask' },
    { label: '성폭행', status: 'ask' },
    { label: '성희롱', status: 'ask' },
    { label: '근친', status: 'ok' },
    { label: '고문', status: 'ok' },
    { label: '거미', status: 'ok' },
    { label: '벌레', status: 'ok' },
    { label: '악마, 귀신', status: 'ok' },
    { label: '쥐', status: 'ok' },
    { label: '성적 지향 차별', status: 'depict' },
    { label: '성차별', status: 'depict' },
    { label: '성적 정체성 차별', status: 'depict' },
  ],
};

const TENDENCY_DOC = doc(db, 'profile_config', 'tendency');

export function subscribeToTendencyProfile(
  callback: (profile: TendencyProfile) => void,
): Unsubscribe {
  return onSnapshot(TENDENCY_DOC, (snap) => {
    callback(
      snap.exists()
        ? ({ ...DEFAULT_TENDENCY_PROFILE, ...snap.data() } as TendencyProfile)
        : DEFAULT_TENDENCY_PROFILE,
    );
  });
}

export async function updateTendencyProfile(profile: TendencyProfileInput): Promise<void> {
  await setDoc(
    TENDENCY_DOC,
    {
      ...profile,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
