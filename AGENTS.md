# CLAUDE.md — 개발 규칙 및 대전제

이 파일은 AI(Claude)가 이 프로젝트를 작업할 때 반드시 준수해야 할 규칙과 원칙을 정의합니다.

---

## 1. 프로젝트 본질 이해

이 사이트는 **개인 아카이브**입니다. 기능 과잉보다 **감상 경험**이 우선입니다.
모든 기술적 결정은 "이게 자료를 더 잘 보관하고, 더 깊이 감상하게 하는가?"를 기준으로 판단하세요.

---

## 2. 기술 스택 규칙

- **Framework**: Next.js App Router 기준으로 작성. Pages Router 방식 금지.
- **Styling**: Tailwind CSS 유틸리티 클래스 우선. 커스텀 CSS는 Tailwind로 해결 불가능한 경우에만 작성.
- **Animation**: Framer Motion 필수. CSS 애니메이션만으로 처리하지 말 것.
- **3D/Shader**: Three.js는 리퀴드 효과 등 꼭 필요한 곳에만 제한적으로 적용. 남용 금지.
- **배포**: `next export` 기반 Static Export. 서버 컴포넌트에서 서버 전용 기능(DB, API Route 등) 사용 금지.

---

## 3. 디자인 시스템 규칙

### 단위
- 모든 크기 수치는 `rem`, `vw`, `vh` 사용. `px`는 border, shadow 등 1px 고정값에만 허용.
- Media Query는 Tailwind의 `sm`, `md`, `lg`, `xl` 브레이크포인트 기준으로 작성.

### 컬러
- 소프트 뮤트 팔레트 유지. 고채도 원색 직접 사용 금지.
- 배경, 텍스트, 글래스 레이어의 3계층 컬러 시스템을 유지.

### 폰트
- 제목: 고대비 세리프 폰트 (예: Playfair Display, Cormorant).
- 본문/UI: 소프트 산세리프 (예: Inter, Pretendard).
- 폰트 크기 하드코딩 금지. Tailwind 타이포그래피 스케일 또는 CSS 변수 사용.

---

## 4. 핵심 UI 컴포넌트 규칙

### 히어로 섹션 (메인 랜딩)
- `favorites` 태그가 붙은 이미지 배열에서 무작위 1장을 선택해 `100vh` 전체를 채운다.
- 블러 오버레이: `backdrop-filter: blur(40px)` + film grain noise 레이어를 반드시 함께 적용.
- 마우스/터치 이레이저 효과: 커서 주변 반경 내 블러·노이즈를 0으로 마스킹.
  - 경계는 반드시 **Feather(부드러운 퍼짐)** 처리. 칼같이 잘리는 마스크 금지.

### 스크롤 트랜지션
- 스크롤 시작 즉시 애니메이션 트리거.
- 메인 이미지: `scale(1.2)` + `opacity(0)` 으로 뒤로 사라짐.
- 전환 배경: 리퀴드 그라데이션. 고정된 색 금지 — 색상이 물감처럼 천천히 일렁여야 함.
- 그레인 텍스처는 배경 전환 후에도 계속 유지.

### 글래스모피즘 카드 (캐러셀)
- 카드 스타일: 반투명 배경 + 투명 테두리 + 물방울 하이라이트 효과.
- 카드 구성: [폴더 대표 썸네일 / 폴더 제목 / 태그 리스트].
- 데스크톱: 휠 스크롤 → 가로 스크롤 자동 변환.
- 모바일: 부드러운 터치 스와이프.
- 호버 시: 카드 미세 반응 + 뒤 리퀴드 배경 일렁임 강도 증가.

### 상세 페이지 전환
- 카드 클릭 → 해당 폴더 게시물 리스트로 **Shared Layout Transition** 적용.
- `framer-motion`의 `layoutId`를 활용해 카드 → 상세 페이지 연속성 유지.

---

## 5. 성능 규칙

- 그레인, 셰이더, 리퀴드 효과는 반드시 **GPU 가속(transform, opacity, will-change)** 활용.
- `filter`, `backdrop-filter`는 필요한 레이어에만 국소 적용. 전체 페이지 적용 금지.
- 이미지는 Next.js `<Image>` 컴포넌트 사용. `layout="fill"` 또는 `sizes` 속성 명시.
- 애니메이션 루프는 `requestAnimationFrame` 기반으로 작성. `setInterval` 사용 금지.

---

## 6. 반응형 규칙

- 모바일 퍼스트 작성. 데스크톱은 `md:` 이상에서 덮어씀.
- 텍스트, 카드 배열은 어떤 뷰포트에서도 깨지지 않아야 함.
- 터치 디바이스에서 마우스 이레이저 효과는 터치 포인트로 대체.

---

## 7. 코드 품질 규칙

- 컴포넌트는 단일 책임 원칙. 하나의 파일에 하나의 역할.
- 마법의 숫자(magic number) 직접 사용 금지. 상수 또는 CSS 변수로 추출.
- 요청되지 않은 기능 추가 금지. 현재 요구사항에만 집중.
- 접근성(a11y): 이미지에 `alt` 속성 필수. 키보드 내비게이션 고려.

---

## 8. 알려진 이슈 및 주의사항

### Next.js 16 + output: export + generateStaticParams 버그
- `generateStaticParams`가 빈 배열 `[]`을 반환하면 "missing generateStaticParams" 빌드 에러 발생 (알려진 버그)
- **해결책**: 동적 라우트(`[folder]`, `[post]`)는 실제 데이터가 생긴 시점에 추가할 것
- 데이터 추가 시 `generateStaticParams`에 반드시 실제 slug 목록을 반환해야 빌드 통과

---

## 9. 파일 구조 원칙

```
/app
  /[folder]
    /[post]
/components
  /hero          # 히어로 섹션 관련
  /carousel      # 글래스 카드 캐러셀
  /effects       # grain, liquid, glass 등 시각 효과
  /layout        # 공통 레이아웃
/lib
  /data          # 이미지/폴더 데이터 관리
/public
  /images        # 정적 이미지 에셋
```
