/**
 * 페이지 로드마다 favorites에서 새 이미지를 랜덤 선택하고,
 * 같은 세션(네비게이션) 내에서는 동일한 이미지를 유지한다.
 *
 * 모듈 레벨 변수이므로:
 * - 새로고침/재방문 → null 초기화 → 새 이미지 선택
 * - 페이지 간 이동 → 이미 선택된 값 반환
 */
let selected: string | null = null;

export function pickHeroImage(paths: string[]): string | null {
  if (selected) return selected;
  if (!paths.length) return null;
  selected = paths[Math.floor(Math.random() * paths.length)];
  return selected;
}
