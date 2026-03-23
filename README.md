# Planhai

**AI 창작물 공유 플랫폼 | AI Creation Sharing Platform**

Planhai는 AI로 만든 창작물을 업로드하고 공유하는 플랫폼입니다. Gemini AI가 콘텐츠를 자동 분석하여 메타데이터를 생성하고, 8개 카테고리로 분류합니다.

Planhai is a platform for uploading and sharing AI-generated creations. Gemini AI automatically analyzes your content to generate metadata and categorize it across 8 categories.

---

## Features | 주요 기능

### Upload (4-Step) | 업로드 (4단계)
- **Step 1** — 파일 드래그 & 드롭 또는 URL 붙여넣기 + 카테고리/도구 선택
- **Step 2** — Gemini 2.5 Flash AI가 콘텐츠 분석 (제목, 설명, 태그 자동 생성)
- **Step 3** — AI 추천 메타데이터 편집 + 실시간 카드 프리뷰
- **Step 4** — 게시 완료

### Categories | 카테고리 (8개)
Development, Design, 3D/AR/VR, Media, Document & Business, Template & Prompt, Interactive, Other

### Community | 커뮤니티
- **Like** — Optimistic UI 좋아요 토글
- **Comment** — 댓글 + 1단계 답글
- **Follow** — 팔로우/팔로잉 + Following 피드
- **Bookmark** — 프로필 북마크 탭
- **Fork** — 창작물 포크 + Fork Tree 표시
- **Notifications** — 실시간 알림 (Supabase Realtime)

### Other | 기타
- **Search** — 제목 + 설명 텍스트 검색 + 카테고리 필터
- **Profile** — 프로필 페이지 (Masonry 그리드, 팔로워/팔로잉)
- **Dark Mode** — next-themes 기반 시스템/수동 토글
- **i18n** — 한국어/영어 (next-intl, 쿠키 기반)
- **Ads** — Google AdSense 통합 (환경변수 on/off)
- **Open API** — REST API v1 + Swagger UI 문서 (`/docs`)
- **Rate Limiting** — Upstash Redis 기반 1,000 req/hour

---

## Tech Stack | 기술 스택

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google, GitHub, Magic Link) |
| Storage | Supabase Storage |
| AI | Google Gemini 2.5 Flash |
| i18n | next-intl |
| Dark Mode | next-themes |
| Rate Limit | Upstash Redis + @upstash/ratelimit |
| Deployment | Vercel |

---

## Getting Started | 시작하기

### Prerequisites | 사전 요구사항
- Node.js 18+
- npm
- Supabase 프로젝트
- Gemini API Key

### Installation | 설치

```bash
git clone https://github.com/satsumaemo/planhai.git
cd planhai
npm install
```

### Environment Variables | 환경변수

`.env.example`을 `.env.local`로 복사하고 값을 채워주세요.
Copy `.env.example` to `.env.local` and fill in your values.

```bash
cp .env.example .env.local
```

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Google AdSense (optional)
NEXT_PUBLIC_ADSENSE_ENABLED=false
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-your-id
```

### Run | 실행

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure | 폴더 구조

```
src/
├── app/
│   ├── page.tsx                    # Home (Trending/Latest/Following)
│   ├── explore/                    # Explore (category browsing)
│   ├── login/                      # Auth (Google, GitHub, Magic Link)
│   ├── new/                        # Upload (Step 1 → 2 → 3)
│   ├── c/[id]/                     # Creation detail
│   ├── profile/[nickname]/         # User profile
│   ├── settings/                   # Profile settings + API key
│   ├── search/                     # Search
│   ├── docs/                       # API docs (Swagger UI)
│   ├── auth/                       # Auth callbacks
│   └── api/
│       ├── ai/analyze/             # Gemini AI analysis
│       ├── locale/                 # i18n locale switch
│       └── v1/                     # Public REST API
│           ├── creations/          # CRUD + fork + like
│           ├── search/             # Search endpoint
│           ├── trending/           # Trending endpoint
│           ├── users/[id]/         # User creations
│           └── key/                # API key generation
├── components/
│   ├── Header.tsx / HeaderClient.tsx
│   ├── Footer.tsx
│   ├── Providers.tsx / ThemeToggle.tsx / LocaleSwitcher.tsx
│   ├── ads/                        # AdBanner, AdNative, AdScript
│   ├── community/                  # LikeButton, BookmarkButton, CommentSection,
│   │                                 ForkButton, NotificationBell
│   ├── home/                       # HomeFeed
│   └── upload/                     # CategoryIcon, Step3EditMeta
├── lib/
│   ├── api/                        # API middleware (auth, rate limit), OpenAPI spec
│   ├── constants/                  # Category taxonomy
│   └── supabase/                   # Client & server Supabase clients
├── i18n/                           # next-intl config
└── middleware.ts                    # Supabase session refresh
messages/
├── ko.json                         # Korean translations
└── en.json                         # English translations
```

---

## API Documentation | API 문서

API 문서는 `/docs` 경로에서 Swagger UI로 확인할 수 있습니다.
API docs are available at `/docs` via Swagger UI.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/creations` | Create a new creation |
| GET | `/api/v1/creations/[id]` | Get creation details |
| POST | `/api/v1/creations/[id]/fork` | Fork a creation |
| POST | `/api/v1/creations/[id]/like` | Toggle like |
| GET | `/api/v1/search?q=...` | Search creations |
| GET | `/api/v1/users/[id]/creations` | User's creations |
| GET | `/api/v1/trending` | Trending creations |

Authentication: `Authorization: Bearer <api_key>` (발급: `/settings`)

---

## License | 라이선스

MIT License. See [LICENSE](LICENSE) for details.
