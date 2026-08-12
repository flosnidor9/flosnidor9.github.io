# flosnidor9.github.io

## 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000` 에서 확인.

---

## 구조

```
src/
├── app/
│   ├── (main)/               # 메인 랜딩
│   ├── (bubble)/
│   │   └── bubbleHome/
│   │       ├── [folder]/     # 폴더별 페이지
│   │       ├── gallery/      # 갤러리
│   │       ├── guestbook/    # 방명록
│   │       └── log/          # 로그
│   ├── (film)/
│   │   └── filmHome/
│   │       ├── gallery/      # 갤러리
│   │       └── log/          # 마크다운 로그
│   └── (ledger)/
│       └── afterTheRoll/
│           ├── archive/      # 아카이브
│           └── logs/         # TRPG 로그
├── components/
│   ├── calendar/             # 캘린더
│   ├── carousel/             # 글래스 카드 캐러셀
│   ├── effects/              # 시각 효과 (파티클, 픽셀더스트)
│   ├── folder/               # 폴더 상세
│   ├── guestbook/            # 방명록
│   ├── hero/                 # 히어로 섹션
│   ├── layout/               # GNB 등 공통 레이아웃
│   ├── log/                  # 로그 관련
│   ├── music-player/         # 뮤직 플레이어
│   ├── providers/            # 전역 Provider
│   ├── sidebar/              # 사이드바
│   └── trpg/                 # TRPG 로그 리더
├── content/
│   └── logs/                 # 마크다운 로그 파일
├── contexts/                 # React Context
├── hooks/                    # 커스텀 훅
└── lib/
    ├── config/               # 설정
    └── data/                 # 데이터 관리
```
