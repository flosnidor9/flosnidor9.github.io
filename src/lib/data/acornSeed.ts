import type { AcornCategory, AcornRole } from './firebaseAcorns';

export type SeedAcorn = {
  id: string;
  title: string;
  rule: string;
  category: AcornCategory;
  role: AcornRole;
  playerCount: string;
  order: number;
};

const shinobigami = [
  ['시노비가미', 'fanmade', '잠자는 수라여', 'GM', '2인'],
  ['시노비가미', 'official', '가을 하늘에 눈이 흩날리면', 'PL', '4인'],
  ['시노비가미', 'fanmade', '우로보로스', 'GM', '2인'],
  ['시노비가미', 'official', '로드무비 改', 'PL', '5인'],
  ['시노비가미', 'official', '가을 하늘에 눈이 흩날리면', 'PL', '4인'],
  ['시노비가미', 'fanmade', '검, 비급, 무덤', 'PL', '4인'],
  ['시노비가미', 'fanmade', '저수지 아래', 'GM', '4인'],
  ['시노비가미', 'fanmade', '혼약승계합', 'PL', '2인'],
  ['시노비가미', 'fanmade', 'Bloody Circulation', 'BOTH', '타이만'],
] as const;

const coc = [
  ['CoC', 'fanmade', '아귀공양', 'BOTH', '다인'],
  ['CoC', 'fanmade', '이능력제한구역 캠페인', 'GM', '타이만'],
  ['CoC', 'fanmade', '사계배웅', 'PL', '4인'],
  ['CoC', 'fanmade', '이디블', 'PL', '4인'],
  ['CoC', 'fanmade', "B'ash", 'PL', '4인'],
  ['CoC', 'fanmade', '클리셰 SF 세계관의 크리쳐는 그어그어하고 울지 않는다', 'PL', '타이만'],
  ['CoC', 'fanmade', '라스트 골든 레코드', 'PL', '타이만'],
  ['CoC', 'fanmade', '팬텀 블루 미스트', 'BOTH', '타이만'],
  ['CoC', 'fanmade', '쾌도난마', 'PL', '4인'],
  ['CoC', 'fanmade', '크립토바운드', 'PL', '4인'],
  ['CoC', 'fanmade', '증오 결핍 바이러스', 'GM', '타이만'],
] as const;

const insane = [['인세인', 'fanmade', '사계기담', 'GM', '3인']] as const;

export const ACORN_RULE_ORDER = ['시노비가미', 'CoC', '인세인'];

export const ACORN_SEED: SeedAcorn[] = [...shinobigami, ...coc, ...insane].map(
  ([rule, category, title, role, playerCount], order) => ({
    id: `sheet-${order + 6}`,
    rule,
    category: category as AcornCategory,
    title,
    role: role as AcornRole,
    playerCount,
    order,
  }),
);
