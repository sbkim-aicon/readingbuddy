# Reading Buddy — Product Requirements Document (PRD)
> **Version:** 1.0 | **Target:** Vibe Coding Prototype  
> **Stack 제안:** Next.js 14 (App Router) + Tailwind CSS + OpenAI Realtime API + OpenAI TTS + Anthropic Claude API  
> **대상 사용자:** 만 4~7세 아동 + 보호자(카드 관리)

---

## 1. 서비스 개요

### 1-1. 제품 비전
Reading Buddy는 AI 스피커 디바이스와 연동되는 **어린이 전용 AI 학습·독서 서비스**입니다. 아이가 콘텐츠 카드를 선택하면 AI 스피커 캐릭터가 해당 콘텐츠의 페르소나로 변신하여 음성 대화를 진행합니다.

### 1-2. 핵심 플로우
```
[카드 선택 화면] → 카드 탭 → [AI 스피커 화면] → 음성/텍스트 대화
                                      ↑
                          선택 카드의 프롬프트·페르소나 로드
```

### 1-3. 주요 화면 구성
| 화면 | 설명 |
|---|---|
| 카드 선택 화면 | 등록된 콘텐츠 카드 그리드. 탭하면 AI 스피커 화면으로 이동 |
| AI 스피커 화면 | 스피커 캐릭터 영상 재생 + 음성 대화 + 타이핑 입력창 |
| 카드 관리 화면 | 관리자용. 카드 등록/수정/삭제. Read with me 카드는 도서 PDF 업로드 포함 |

---

## 2. 화면별 상세 요구사항

### 2-1. 카드 선택 화면 (Home Screen)

#### UI 레이아웃
- 상단 타이틀: `"Reading Buddy"` + `"Tap your Card!"` (중앙 정렬)
- 카드 그리드: 4열 × 2행 (모바일: 2열, 태블릿: 4열)
- 각 카드: 세로형 카드 (약 180×260px)
  - 상단: 카드 커버 이미지 (full-width)
  - 하단 오버레이: `▶ Play Audio` 버튼 (주황색)
  - 카드 하단 외부: 타이틀 + 서브타이틀 텍스트

#### 초기 콘텐츠 카드 목록 (하드코딩)
```
1. Astro The Explorer AI Companion  /  Learn about Space
2. Riddles AI Companion             /  Solve Riddles, Learn Facts
3. Word Ladder AI Game              /  Improve Vocabulary
4. Read with me - Book 1            /  (등록된 도서명 표시)
5. Read with me - Book 2            /  (등록된 도서명 표시)
6. Mindreader                       /  20 questions to guess the answer!
7. Math Battle                      /  Where numbers and fun meet!
8. What's That Sound                /  Hear it!, Guess it!, Learn it!
```

#### 카드 인터랙션
- 카드 탭 → 해당 카드의 `card_config` 로드 → AI 스피커 화면으로 라우팅
- 우상단 고정 버튼: `⚙ 관리` (카드 관리 화면으로 이동)

#### 카드 상태
- `active` : 정상 활성 (탭 가능)
- `empty` : Read with me 카드에 도서 미등록 시 → 반투명 + "도서 등록 필요" 배지

---

### 2-2. AI 스피커 화면 (Speaker Screen)

#### UI 레이아웃
```
┌─────────────────────────────────────┐
│  [종료] 버튼           (우상단)      │
│                                     │
│         🟢 스피커 캐릭터            │
│         (Lottie 애니메이션)         │
│         표정 상태에 따라 변화        │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  💬 대화 히스토리 (스크롤)    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  타이핑 영역          [전송]  │  │
│  └───────────────────────────────┘  │
│  [🎤 음성 입력]  [🔊 음성 출력 중] │
└─────────────────────────────────────┘
```

#### 스피커 캐릭터 영상
- **파일:** `/public/RB.mp4` (미리 제작된 스피커 캐릭터 영상)
- **재생 방식:** HTML `<video>` 태그로 루프 재생 (`loop autoPlay muted playsInline`)
- **레이아웃:** 화면 중앙 배치, 고정 크기 (약 300×300px), 원형 마스크 또는 그대로 표시
- **상태 표현 방식:** 영상 위에 CSS 오버레이 효과로 상태 시각화

  | 상태 | 시각 처리 |
  |---|---|
  | `idle` | 영상 정상 재생 (기본) |
  | `speaking` | 영상 위 밝기 살짝 상승 + 테두리 pulse 애니메이션 (파란색 glow) |
  | `listening` | 테두리 pulse 애니메이션 (초록색 glow) + 마이크 아이콘 오버레이 |
  | `thinking` | 영상 위 반투명 오버레이 + 로딩 스피너 |
  | `error` | 영상 위 붉은 테두리 |

- **구현 코드 예시:**
  ```tsx
  // SpeakerCharacter.tsx
  <div className={`relative rounded-full ${glowClass[speakerState]}`}>
    <video
      src="/RB.mp4"
      autoPlay
      loop
      muted
      playsInline
      className="w-72 h-72 object-cover rounded-full"
    />
    {speakerState === 'listening' && <MicPulseOverlay />}
    {speakerState === 'thinking' && <ThinkingOverlay />}
  </div>
  ```

#### 음성 대화 (OpenAI Realtime API)
- **API:** `wss://api.openai.com/v1/realtime`
- **모델:** `gpt-4o-realtime-preview`
- **음성 입력:** 브라우저 `MediaRecorder` API → WebSocket으로 오디오 스트리밍
- **음성 출력:** Realtime API 응답 오디오 → Web Audio API로 재생
- **TTS 목소리:** OpenAI 내장 보이스 사용. 카드별 `voice_openai` 필드로 지정
  - 사용 가능 보이스: `alloy` / `echo` / `fable` / `onyx` / `nova` / `shimmer`
- **세션 설정:**
  ```json
  {
    "model": "gpt-4o-realtime-preview",
    "voice": "{card_config.voice_openai}",
    "instructions": "{card_config.system_prompt}",
    "turn_detection": {
      "type": "server_vad",
      "threshold": 0.5,
      "silence_duration_ms": 800
    }
  }
  ```

#### 텍스트 입력 (프로토타입용)
- 하단 타이핑 영역: placeholder `"여기에 입력하세요..."`
- `Enter` 또는 `[전송]` 버튼 → Claude API (텍스트 모드) 호출
- 응답은 **OpenAI TTS** (`/v1/audio/speech`)로 음성 변환 후 재생 + 화면에 텍스트 표시
- 사용 모델: `tts-1` / 보이스: 카드별 `voice_openai` 값 사용
- **텍스트 모드와 음성 모드는 동시에 사용 가능 (프로토타입 편의성)**

#### 종료 버튼
- 좌상단 `[종료]` 버튼 → 세션 종료 확인 모달 → 카드 선택 화면으로 복귀
- Read with me 카드: 종료 시 독서 진행 상태 저장 (localStorage)

#### Read with me 특수 처리
- 스피커 화면 하단에 **책 페이지 이미지** 추가 표시 (선택적)
- 세션 상태: `pre → during_dialogic/echo → post` 순서 관리
- 현재 페이지 번호 표시 (예: `3 / 7`)
- 읽기 모드 전환 버튼: `[💬 대화형]` ↔ `[📖 따라 읽기]`

---

### 2-3. 카드 관리 화면 (Admin Screen)

#### 접근 방법
- 홈 화면 우상단 `⚙ 관리` 버튼 → 간단한 비밀번호 입력 (4자리 PIN, 기본값: `1234`)

#### 카드 목록 관리
- 등록된 카드 목록 (리스트 형태)
- 각 카드: 편집(✏️) / 삭제(🗑️) / 활성화 토글

#### 신규 카드 등록 폼
```
카드 타입 선택:    [일반 AI 대화] [Read with me]
카드 이름:         _________________________
서브타이틀:        _________________________
커버 이미지:       [이미지 업로드]
시스템 프롬프트:   _________________________ (textarea)
페르소나 이름:     _________________________
OpenAI Voice:      [alloy / echo / fable / onyx / nova / shimmer]
온도(Temperature): [슬라이더 0.0 ~ 1.0]
```

#### Read with me 카드 추가 필드
```
카드 타입: [Read with me] 선택 시 추가 노출
도서 PDF 업로드: [파일 선택]
→ 업로드 후 [도서 분석 시작] 버튼
→ PROMPT 01 (Book Analyzer) API 호출
→ 분석 완료: book_data.json 저장 + "✅ 분석 완료" 표시
→ 각 세션 프롬프트 확인 탭:
   [PRE] [DURING-대화형] [DURING-에코] [POST]
```

#### 카드 설정 저장 구조 (`card_config`)
```json
{
  "card_id": "astro_explorer",
  "card_type": "general | read_with_me",
  "title": "Astro The Explorer AI Companion",
  "subtitle": "Learn about Space",
  "cover_image": "/images/cards/astro.png",
  "persona_name": "Astro",
  "system_prompt": "...",
  "voice_openai": "nova",
  "temperature": 0.8,
  "active": true,
  "book_data_path": null,
  "session_prompts": {
    "pre": null,
    "during_dialogic": null,
    "during_echo": null,
    "post": null
  }
}
```
- 저장소: 프로토타입은 `localStorage` + 서버는 SQLite or JSON 파일

---

## 3. 기술 아키텍처

### 3-1. 폴더 구조 (Next.js)
```
/reading-buddy
├── app/
│   ├── page.tsx                    # 카드 선택 화면 (홈)
│   ├── speaker/[cardId]/page.tsx   # AI 스피커 화면
│   ├── admin/page.tsx              # 카드 관리 화면
│   └── api/
│       ├── analyze-book/route.ts   # PDF → book_data.json (Claude API)
│       ├── chat/route.ts           # 텍스트 대화 (Claude API)
│       ├── tts/route.ts            # OpenAI TTS (tts-1 모델)
│       └── realtime/route.ts       # OpenAI Realtime 세션 토큰 발급
├── components/
│   ├── CardGrid.tsx                # 카드 그리드
│   ├── ContentCard.tsx             # 개별 카드 컴포넌트
│   ├── SpeakerCharacter.tsx        # RB.mp4 재생 + 상태별 오버레이
│   ├── ConversationHistory.tsx     # 대화 히스토리
│   ├── AudioInput.tsx              # 음성 입력 컴포넌트
│   └── admin/
│       ├── CardForm.tsx            # 카드 등록/수정 폼
│       └── BookUploader.tsx        # PDF 업로드 + 분석
├── lib/
│   ├── claude.ts                   # Claude API 클라이언트
│   ├── openai-tts.ts               # OpenAI TTS 클라이언트 (tts-1)
│   ├── openai-realtime.ts          # OpenAI Realtime WebSocket
│   ├── session-manager.ts          # 세션 상태 관리
│   └── book-analyzer.ts            # book_data.json 슬라이서
├── prompts/
│   ├── cards/
│   │   ├── astro_explorer.md       # 카드 1 시스템 프롬프트
│   │   ├── riddles_companion.md    # 카드 2
│   │   ├── word_ladder.md          # 카드 3
│   │   ├── mindreader.md           # 카드 6
│   │   ├── math_battle.md          # 카드 7
│   │   └── whats_that_sound.md     # 카드 8
│   └── read_with_me/
│       ├── prompt_01_analyzer.md
│       ├── prompt_02_pre.md
│       ├── prompt_03_during_dialogic.md
│       ├── prompt_04_during_echo.md
│       └── prompt_05_post.md
├── data/
│   ├── cards.json                  # 카드 설정 데이터
│   └── books/
│       └── {book_id}.json          # Book Analyzer 결과
└── public/
    ├── RB.mp4                      # 스피커 캐릭터 영상 (루프 재생)
    ├── images/cards/               # 카드 커버 이미지
    └── sounds/                     # What's That Sound 카드용 오디오
```

### 3-2. API 연동 명세

#### A. 텍스트 대화 API (`/api/chat`)
```typescript
// Request
POST /api/chat
{
  card_id: string,
  message: string,
  conversation_history: Message[],
  session_state?: SessionState,    // Read with me 전용
  page_data?: PageData             // Read with me 전용
}

// Response
{
  response: string,
  session_state?: SessionState,
  audio_url?: string               // OpenAI TTS 결과 (tts-1 모델)
}
```

#### B. 도서 분석 API (`/api/analyze-book`)
```typescript
// Request (multipart/form-data)
POST /api/analyze-book
{
  pdf: File,
  book_id: string
}

// Response
{
  success: boolean,
  book_data_path: string,          // 저장된 JSON 경로
  book_metadata: BookMetadata
}
```

#### C. OpenAI Realtime 세션 (`/api/realtime`)
```typescript
// Request
POST /api/realtime
{
  card_id: string
}

// Response (클라이언트가 WebSocket 연결에 사용)
{
  client_secret: { value: string },
  session_config: RealtimeSessionConfig
}
```

### 3-3. 환경 변수
```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_NAME=Reading Buddy
NEXT_PUBLIC_ADMIN_PIN=1234
```

---

## 4. 콘텐츠 카드 시스템

### 4-1. 카드 타입별 동작

| 카드 타입 | API | 세션 관리 | 프롬프트 구조 |
|---|---|---|---|
| 일반 AI 대화 | OpenAI Realtime API | 단순 히스토리 | 단일 System Prompt |
| Read with me | Claude API (텍스트) + OpenAI TTS | 5단계 세션 | 프롬프트 02~05 순차 |

### 4-2. Read with me 세션 상태 머신
```
[START]
  ↓
[PRE_READING] → prompt_02 사용 → 완료 신호 수신
  ↓
[DURING_READING] → 모드 선택
  ├─ [DIALOGIC] → prompt_03 (페이지마다)
  └─ [ECHO] → prompt_04 (세그먼트마다)
  ↓ (total_pages 완료)
[POST_READING] → prompt_05 사용 → 완료
  ↓
[END]
```

**완료 신호 감지:** AI 응답에서 특정 키워드 또는 JSON 메타 필드로 처리
```json
// AI 응답 끝에 숨겨진 메타데이터 (파싱용)
{"__signal": "session_complete", "next_session": "during_reading"}
```

### 4-3. 토큰 최적화 (카드 타입별)

| 카드 | System Prompt | 매 턴 주입 | 히스토리 유지 |
|---|---|---|---|
| 일반 카드 (1,2,3,6,7,8) | ~300~500 tokens (캐싱) | 없음 | 최근 10턴 |
| Read with me PRE | ~400 tokens (캐싱) | ~150 tokens | 4턴 |
| Read with me DURING | ~500 tokens (캐싱) | pages[n] ~200 tokens | 4턴 |
| Read with me POST | ~400 tokens (캐싱) | ~120 tokens | 6턴 |

---

## 5. 데이터 모델

### 5-1. cards.json (초기 데이터)
```json
[
  {
    "card_id": "astro_explorer",
    "card_type": "general",
    "title": "Astro The Explorer AI Companion",
    "subtitle": "Learn about Space",
    "cover_image": "/images/cards/astro.png",
    "persona_name": "Astro",
    "prompt_file": "prompts/cards/astro_explorer.md",
    "voice_openai": "nova",
    "temperature": 0.8,
    "active": true
  },
  {
    "card_id": "riddles_companion",
    "card_type": "general",
    "title": "Riddles AI Companion",
    "subtitle": "Solve Riddles, Learn Facts",
    "cover_image": "/images/cards/riddles.png",
    "persona_name": "Riddles",
    "prompt_file": "prompts/cards/riddles_companion.md",
    "voice_openai": "fable",
    "temperature": 0.9,
    "active": true
  },
  {
    "card_id": "word_ladder",
    "card_type": "general",
    "title": "Word Ladder AI Game",
    "subtitle": "Improve Vocabulary",
    "cover_image": "/images/cards/word_ladder.png",
    "persona_name": "WordWiz",
    "prompt_file": "prompts/cards/word_ladder.md",
    "voice_openai": "echo",
    "temperature": 0.7,
    "active": true
  },
  {
    "card_id": "read_with_me_1",
    "card_type": "read_with_me",
    "title": "Read with me - Book 1",
    "subtitle": "",
    "cover_image": "/images/cards/read_with_me.png",
    "persona_name": "Reading Buddy",
    "prompt_file": null,
    "book_data_path": null,
    "voice_openai": "shimmer",
    "temperature": 0.7,
    "active": false
  },
  {
    "card_id": "read_with_me_2",
    "card_type": "read_with_me",
    "title": "Read with me - Book 2",
    "subtitle": "",
    "cover_image": "/images/cards/read_with_me.png",
    "persona_name": "Reading Buddy",
    "prompt_file": null,
    "book_data_path": null,
    "voice_openai": "shimmer",
    "temperature": 0.7,
    "active": false
  },
  {
    "card_id": "mindreader",
    "card_type": "general",
    "title": "Mindreader",
    "subtitle": "20 questions to guess the answer!",
    "cover_image": "/images/cards/mindreader.png",
    "persona_name": "Mystic",
    "prompt_file": "prompts/cards/mindreader.md",
    "voice_openai": "onyx",
    "temperature": 0.9,
    "active": true
  },
  {
    "card_id": "math_battle",
    "card_type": "general",
    "title": "Math Battle",
    "subtitle": "Where numbers and fun meet!",
    "cover_image": "/images/cards/math_battle.png",
    "persona_name": "MathBot",
    "prompt_file": "prompts/cards/math_battle.md",
    "voice_openai": "alloy",
    "temperature": 0.7,
    "active": true
  },
  {
    "card_id": "whats_that_sound",
    "card_type": "general",
    "title": "What's That Sound",
    "subtitle": "Hear it!, Guess it!, Learn it!",
    "cover_image": "/images/cards/whats_that_sound.png",
    "persona_name": "Soundy",
    "prompt_file": "prompts/cards/whats_that_sound.md",
    "voice_openai": "nova",
    "temperature": 0.9,
    "active": true
  }
]
```

---

## 6. 비기능 요구사항

### 6-1. 프로토타입 범위
- **포함:** 카드 선택, AI 스피커 화면, 텍스트 대화, 카드 관리 기본 기능
- **포함:** Read with me PDF 업로드 + 분석 + 세션 진행
- **제외 (v2):** 사용자 계정 관리, 독서 이력 통계, 멀티 디바이스 동기화

### 6-2. 반응형 지원
- 기본 타깃: 태블릿 (768px ~ 1024px)
- 홈 화면: 모바일 2열 / 태블릿 4열
- AI 스피커 화면: 세로 최적화

### 6-3. 오류 처리
- API 호출 실패 → RB.mp4 위에 붉은 테두리 오버레이 + "잠깐, 다시 연결해볼게요!" 메시지
- 음성 인식 실패 → 텍스트 모드 자동 전환 안내
- PDF 분석 실패 → "다시 시도해주세요" + 오류 상세 표시

---

## 7. 개발 우선순위 (MVP 순서)

```
Phase 1 (Core):
  ✅ 카드 선택 화면 (정적 카드 데이터)
  ✅ AI 스피커 화면 (텍스트 입력 + Claude API)
  ✅ RB.mp4 루프 재생 + 상태별 CSS 오버레이 효과

Phase 2 (Content):
  ✅ 카드별 시스템 프롬프트 연동
  ✅ OpenAI TTS 연동 (tts-1 모델, 카드별 voice 설정)
  ✅ 카드 관리 화면 (기본 CRUD)

Phase 3 (Read with me):
  ✅ PDF 업로드 + Book Analyzer API
  ✅ book_data.json 세션 관리
  ✅ PRE/DURING/POST 세션 전환

Phase 4 (Voice):
  ✅ OpenAI Realtime API 연동
  ✅ 스피커 상태별 CSS 오버레이 분기 (speaking / listening / thinking)
```

---

## 8. 관련 파일 목록

| 파일 | 설명 |
|---|---|
| `PRD.md` | 본 문서 (Reading Buddy 제품 요구사항) |
| `public/RB.mp4` | 스피커 캐릭터 루프 영상 |
| `prompts/cards/astro_explorer.md` | 카드 1 시스템 프롬프트 |
| `prompts/cards/riddles_companion.md` | 카드 2 시스템 프롬프트 |
| `prompts/cards/word_ladder.md` | 카드 3 시스템 프롬프트 |
| `prompts/cards/mindreader.md` | 카드 6 시스템 프롬프트 |
| `prompts/cards/math_battle.md` | 카드 7 시스템 프롬프트 |
| `prompts/cards/whats_that_sound.md` | 카드 8 시스템 프롬프트 |
| `prompts/read_with_me/prompt_01_analyzer.md` | PDF → JSON 분석 |
| `prompts/read_with_me/prompt_02_pre.md` | 독서 전 활동 |
| `prompts/read_with_me/prompt_03_during_dialogic.md` | 대화형 독서 |
| `prompts/read_with_me/prompt_04_during_echo.md` | 에코 리딩 |
| `prompts/read_with_me/prompt_05_post.md` | 독서 후 활동 |
| `data/cards.json` | 카드 초기 설정 데이터 |
