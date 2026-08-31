import type { CharacterStat, CocCharacterData, InsaneCharacterData, ShinobigamiCharacterData } from '@/lib/data/characters';

type CcParam = { label?: unknown; value?: unknown };
type CcData = { name?: unknown; memo?: unknown; params?: unknown; commands?: unknown; [key: string]: unknown };

export type CocofoliaImport = {
  name: string;
  catchphrase?: string;
  color?: string;
  age: string;
  gender: string;
  heightWeight: string;
  occupation: string;
  setting: string;
  coc?: CocCharacterData;
  shinobigami?: ShinobigamiCharacterData;
  insane?: InsaneCharacterData;
};

const COC_CHARACTERISTICS: Array<{ label: string; aliases: string[] }> = [
  { label: '근력', aliases: ['근력'] },
  { label: '민첩', aliases: ['민첩', '민첩성'] },
  { label: '지능', aliases: ['지능', '지능(아이디어)'] },
  { label: '건강', aliases: ['건강'] },
  { label: '외모', aliases: ['외모'] },
  { label: '정신력', aliases: ['정신력', '정신'] },
  { label: '크기', aliases: ['크기'] },
  { label: '교육', aliases: ['교육'] },
];

function text(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function paramsFrom(data: CcData) {
  return Array.isArray(data.params)
    ? data.params.map((item) => item as CcParam).map((item) => ({ label: text(item.label), value: text(item.value) })).filter((item) => item.label)
    : [];
}

function memoValue(memo: string, label: string) {
  const match = memo.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*[:：]\\s*([^\\n]+)`, 'm'));
  return match?.[1]?.trim() ?? '';
}

function valueFor(params: CharacterStat[], memo: string, labels: string[]) {
  return params.find((item) => labels.includes(item.label))?.value
    ?? labels.map((label) => memoValue(memo, label)).find(Boolean)
    ?? '';
}

function characteristicsFromCommands(commands: string) {
  const values = new Map<string, string>();
  for (const match of commands.matchAll(/^\s*cc\s*<=\s*(\d+)\s+([^\n]+)$/gim)) {
    const sourceLabel = match[2].trim();
    const characteristic = COC_CHARACTERISTICS.find(({ aliases }) => aliases.some((alias) => sourceLabel === alias));
    if (characteristic && !values.has(characteristic.label)) values.set(characteristic.label, match[1]);
  }
  return values;
}

function cocCharacteristics(params: CharacterStat[], commands: string) {
  const commandValues = characteristicsFromCommands(commands);
  return COC_CHARACTERISTICS.flatMap(({ label, aliases }) => {
    const value = params.find((item) => aliases.includes(item.label))?.value ?? commandValues.get(label);
    return value ? [{ label, value }] : [];
  });
}

export function isCocRule(rule: string) {
  return /(?:^|\\s)(?:coc|call of cthulhu)(?:\\s|$)|크툴루/i.test(rule);
}

export function isShinobigamiRule(rule: string) {
  return /시노비가미|shinobigami/i.test(rule);
}

export function isInsaneRule(rule: string) {
  return /인세인|insane/i.test(rule);
}

function parseCoc(data: CcData): CocofoliaImport {
  const params = paramsFrom(data);
  const memo = text(data.memo);
  const commands = text(data.commands);
  const height = valueFor(params, memo, ['키', '신장', '키/체중']);
  const weight = valueFor(params, memo, ['몸무게', '체중']);
  const heightWeight = valueFor(params, memo, ['키/체중']) || [height, weight].filter(Boolean).join(' / ');
  return {
    name: text(data.name),
    age: valueFor(params, memo, ['나이']),
    gender: valueFor(params, memo, ['성별']),
    heightWeight,
    occupation: valueFor(params, memo, ['직업']),
    color: text(data.color),
    setting: valueFor(params, memo, ['설정']) || memo,
    coc: { characteristics: cocCharacteristics(params, commands) },
  };
}

function commandNames(commands: string, heading: string) {
  const section = commands.match(new RegExp(`◆───────${heading}───────◆([\\s\\S]*?)(?=◆───────|$)`));
  if (!section) return [];
  return [...section[1].matchAll(/【([^】]+)】/g)].map((match) => match[1]).filter((name) => !/^(?:행동 완료|회상|사망|자발적 탈락)/.test(name));
}

function parseShinobigami(data: CcData): CocofoliaImport {
  const memo = text(data.memo);
  const commands = text(data.commands);
  const classLine = memo.match(/【([^】]+)】\s*([^\n]*)/) ?? [];
  const factions = (classLine[2] ?? '').split('|').map((item) => item.trim()).filter(Boolean);
  const identity = memo.match(/나이\s*[:：]\s*([^/\n]*)\s*\/\s*성별\s*[:：]\s*([^/\n]*)\s*\/\s*신분\s*[:：]\s*([^\n]*)/);
  const setting = memo.match(/《설정》\s*\n?([\s\S]*?)(?=\n《|$)/)?.[1]?.trim() ?? '';
  const secretArt = commands.match(/◆───────오의───────◆[\s\S]*?오의\s*[·・]\s*([^《|\n]+).*?【오의\s*[:：]\s*([^】]+)】/);
  return {
    name: text(data.name),
    age: identity?.[1]?.trim() ?? '',
    gender: identity?.[2]?.trim() ?? '',
    heightWeight: '',
    occupation: '',
    color: text(data.color),
    setting,
    shinobigami: {
      rank: classLine[1]?.trim() ?? '',
      faction: factions[0] ?? '',
      subfaction: factions[1] ?? '',
      belief: memoValue(memo, '신념'),
      socialStatus: identity?.[3]?.trim() ?? '',
      setting,
      ninpo: commandNames(commands, '인법'),
      secretArt: secretArt ? { name: secretArt[1].trim(), type: secretArt[2].trim() } : undefined,
    },
  };
}

function parseInsane(data: CcData): CocofoliaImport {
  const memo = text(data.memo);
  const commands = text(data.commands);
  const identity = memo.match(/｜연령\s*:\s*([^｜\n]+)｜성별\s*:\s*([^｜\n]+)｜직업\s*:\s*([^\n]+)/);
  const abilitySection = commands.match(/――+어빌리티\s*\n([\s\S]*?)(?=――+다이스)/)?.[1] ?? '';
  const abilities = [...abilitySection.matchAll(/【([^】]+)】/g)].map((match) => match[1]);
  const insane: InsaneCharacterData = {
    abilities,
    color: text(data.color),
  };
  const catchphrase = memo.match(/^[\s\n]*["“]([^"”\n]+)["”]/)?.[1]?.trim() ?? '';
  return { name: text(data.name), catchphrase, color: text(data.color), age: identity?.[1]?.trim() ?? '', gender: identity?.[2]?.trim() ?? '', heightWeight: '', occupation: identity?.[3]?.trim() ?? '', setting: '', insane };
}

export function parseCocofoliaCharacter(raw: string, rule: string): CocofoliaImport | null {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!parsed || typeof parsed !== 'object') return null;
  const payload = parsed as { kind?: unknown; data?: unknown };
  if (payload.kind !== 'character' || !payload.data || typeof payload.data !== 'object') return null;
  const data = payload.data as CcData;
  if (!text(data.name)) return null;
  if (isCocRule(rule)) return parseCoc(data);
  if (isShinobigamiRule(rule)) return parseShinobigami(data);
  if (isInsaneRule(rule)) return parseInsane(data);
  return null;
}
