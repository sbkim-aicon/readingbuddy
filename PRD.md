# Reading Buddy — Product Requirements Document (PRD)

> **Version:** 2.1 | **Updated:** 2026-03-17
> **Stack:** Next.js 14 (App Router) + Tailwind CSS + OpenAI Realtime API + OpenAI TTS + ElevenLabs TTS + DALL-E 3
> **대상 사용자:** 만 4~7세 아동 + 보호자(카드 관리)

---

## 목차

1. [서비스 개요 — 실제 제품 구성](#1-서비스-개요)
2. [프로토타입 범위 및 목적](#2-프로토타입-범위-및-목적)
3. [프로토타입 화면 요구사항](#3-프로토타입-화면-요구사항)
4. [기술 아키텍처](#4-기술-아키텍처)
5. [콘텐츠 카드 시스템](#5-콘텐츠-카드-시스템)
6. [데이터 모델](#6-데이터-모델)
7. [비기능 요구사항](#7-비기능-요구사항)
8. [구현 현황 (v2 기준)](#8-구현-현황-v2-기준)
9. [신규 기획 아이디어 (v3 제안)](#9-신규-기획-아이디어-v3-제안)
10. [관련 파일 목록](#10-관련-파일-목록)

---

## 1. 서비스 개요

### 1-1. 제품 비전

Reading Buddy는 **물리적 AI 스피커 하드웨어**와 **NFC 실물 카드**로 구성되는 어린이 전용 AI 학습·독서 서비스입니다.
아이는 원하는 콘텐츠가 담긴 NFC 카드를 스피커에 태그하는 것만으로 AI 친구를 불러냅니다.
스피커는 해당 카드의 페르소나로 변신하여 아이와 **음성으로만** 상호작용합니다.
아이는 화면을 보지 않아도 되며, 스피커와 목소리로만 대화하는 것이 핵심 사용 경험입니다.

### 1-2. 실제 제품 구성 (목표 하드웨어 형태)

```
[실물 NFC 카드]  →  [AI 스피커 하드웨어]  →  아이와 음성 대화
   (콘텐츠 정보 내장)       ↑
                  NFC 태그 감지 →
                  카드 ID 식별 →
                  해당 콘텐츠 로드 →
                  AI 페르소나 활성화
```

| 구성 요소 | 설명 |
|---|---|
| AI 스피커 하드웨어 | NFC 리더 내장. 마이크/스피커. 아이와 음성 대화 담당 |
| NFC 실물 카드 | 각 콘텐츠(게임, 독서, 학습 주제)를 담은 물리적 카드. 스피커에 올려두면 콘텐츠 시작 |
| 관리자 인터페이스 | 보호자가 카드 콘텐츠를 등록·수정하는 웹 화면 |

### 1-3. 핵심 사용 시나리오

```
1. 아이가 "우주 탐험" NFC 카드를 스피커 위에 올려놓는다
2. 스피커가 카드를 인식하고 "우주 탐험가 Astro" 페르소나를 로드한다
3. 스피커가 인사 음성을 재생한다: "안녕! 나는 Astro야. 오늘 우주 여행 떠날까?"
4. 아이는 스피커에 대고 목소리로 대답한다 (화면 불필요)
5. AI가 실시간 음성으로 응답하며 학습·게임·독서 활동을 진행한다
6. 카드를 치우면 세션이 종료된다
```

---

## 2. 프로토타입 범위 및 목적

### 2-1. 프로토타입이 존재하는 이유

실제 제품은 **NFC 실물 카드 + AI 스피커 하드웨어** 조합으로 동작합니다.
그러나 하드웨어 개발 전에 **콘텐츠 경험 자체를 먼저 검증**해야 할 필요가 있습니다.

> 프로토타입의 목표: "NFC 카드 태그 이후, 스피커와 아이의 음성 대화 경험"을 소프트웨어로 시뮬레이션하여 콘텐츠 품질과 AI 상호작용을 테스트한다.

### 2-2. 프로토타입과 실제 제품의 차이

| 구분 | 실제 제품 (목표) | 프로토타입 (현재) |
|---|---|---|
| 카드 | NFC 실물 카드를 스피커에 태그 | 웹 화면에서 카드 목록 클릭 |
| 스피커 | 물리적 AI 스피커 하드웨어 | 태블릿/브라우저 화면으로 대체 |
| 스피커 외형 | 스피커 기기 자체 | RB.mp4 캐릭터 영상으로 시각 표현 |
| 아동 인터페이스 | 음성만 사용 (화면 없음) | 음성 + 보조 텍스트 입력 제공 |
| 텍스트 대화창 | 없음 | 프로토타입 테스트 편의용으로만 존재 |
| 대화 히스토리 | 없음 (스피커 전용) | 프로토타입 디버깅/검토용으로만 표시 |

### 2-3. 프로토타입 검증 범위

```
✅ 검증 대상 (프로토타입으로 테스트)
  - 카드별 AI 페르소나 품질 및 자연스러움
  - 음성 상호작용 플로우 (VAD, 응답 속도, TTS 품질)
  - Read with me 세션 단계 전환 (PRE → DURING → POST)
  - 게임 로직 및 난이도 (Riddles, Mindreader, Math 등)
  - Story Writer 창작 플로우 및 결과물
  - 사운드/BGM 경험 (분위기, 피드백 음향)
  - 프롬프트 A/B 테스트 (버전 관리)

❌ 프로토타입 범위 외 (하드웨어 단계에서 검증)
  - NFC 태그 인식 및 카드 ID 매핑
  - 스피커 하드웨어 음질, 마이크 노이즈 캔슬링
  - 물리적 디바이스 전원/네트워크 관리
  - 스피커와 아이 간 거리에 따른 음성 인식률
```

---

## 3. 프로토타입 화면 요구사항

> **주의:** 아래의 모든 화면은 프로토타입 전용입니다.
> 실제 제품에서 아동은 화면을 보지 않으며, 실물 NFC 카드와 스피커로만 상호작용합니다.

### 3-1. 카드 선택 화면 *(프로토타입에서 NFC 태그를 시뮬레이션하는 화면)*

실제 제품에서는 이 화면이 존재하지 않습니다.
아이가 실물 NFC 카드를 스피커에 태그하는 동작을 웹에서 흉내내기 위한 목적입니다.

#### UI 레이아웃
- 상단 타이틀: `"Reading Buddy"` + `"Tap your Card!"` (중앙 정렬)
- 카드 그리드: 4열 × N행 (모바일: 2열, 태블릿: 4열)
- 각 카드: 세로형 카드 (약 180×260px)
  - 상단: 카드 커버 이미지 (실물 NFC 카드 전면 디자인과 동일하게 제작 예정)
  - 하단 오버레이: `▶ Play` 버튼 (주황색)
  - 카드 하단: 타이틀 + 서브타이틀 텍스트
- Story Writer로 생성된 스토리 카드: 다운로드 버튼 노출 (생성된 카드를 실물로 인쇄하기 위한 용도)

#### 등록 카드 목록 (v2 기준, data/cards.json)

| # | 카드명 | 타입 | 설명 |
|---|---|---|---|
| 1 | Astro The Explorer | general | 우주 학습 컴패니언 |
| 2 | Riddles AI Companion | general | 수수께끼 게임 + 사실 학습 |
| 3 | Word Ladder AI Game | general | 어휘력 향상 게임 |
| 4 | Read with me (생성 스토리들) | read_with_me | AI 생성 스토리 독서 |
| 5 | Read with me (Book 1, 2) | read_with_me | PDF 업로드 도서 독서 |
| 6 | Mindreader | general | 20 Questions 추측 게임 |
| 7 | Math Battle | general | 수학 게임 |
| 8 | What's That Sound | general | 소리 맞추기 게임 |
| 9 | Soccer 20Q | general | 축구 관련 20 Questions |
| 10 | Ocean Chosung | general | 해양 초성 퀴즈 (한국어) |
| 11 | Story Writer | story_writer | AI 공동 스토리 창작 |
| 12 | Who Am I | general | 역방향 20 Questions |
| 13 | Market Game | general | 기억력 게임 (장보기) |
| 14 | Reverse Word | general | 단어 뒤집기 스피드 게임 |

#### 카드 인터랙션
- 카드 탭 → 해당 카드의 `card_config` 로드 → AI 스피커 세션 화면으로 라우팅
  - 실제 제품에서는 이 동작이 "NFC 카드 태그 감지 → 카드 ID 식별"로 대체됨
- 우상단 고정 버튼: `⚙ Admin` (카드 관리 화면으로 이동, 보호자 전용)

---

### 3-2. AI 스피커 세션 화면 *(프로토타입에서 스피커 하드웨어를 시뮬레이션하는 화면)*

실제 제품에서는 이 "화면"이 물리적 AI 스피커 기기 자체입니다.
- 프로토타입의 **RB.mp4 캐릭터 영상** = 실제 제품의 **스피커 하드웨어 외형/표시등**
- 프로토타입의 **텍스트 입력창** = 실제 제품에 없음 (테스트 편의용)
- 프로토타입의 **대화 히스토리** = 실제 제품에 없음 (디버깅/검토용)

실제 아이들은 스피커 기기에 대고 말하고, 스피커에서 나오는 소리를 듣는 것으로만 상호작용합니다.

#### UI 레이아웃 (프로토타입)
```
┌─────────────────────────────────────┐
│  [← 종료] 버튼         (좌상단)     │
│      ※ 실제 제품: 카드 치우면 종료   │
│                                     │
│         🎬 스피커 캐릭터 영상        │
│         (RB.mp4 루프 재생)           │
│         상태별 glow/overlay 효과     │
│    [🎤 길게 눌러서 말해요!]          │
│      ※ 실제 제품: 그냥 말하면 됨    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 💬 대화 히스토리 (디버깅용)   │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  텍스트 입력 (테스트용) [전송]│  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

#### 스피커 캐릭터 영상 상태 (실제 제품에서는 스피커 LED/표시등으로 대체)

| 상태 | 프로토타입 시각 처리 | 실제 제품 대응 |
|---|---|---|
| `idle` | 영상 정상 재생 | 대기 상태 LED |
| `speaking` | 파란색 glow pulse | 말하는 중 표시등 |
| `listening` | 초록색 glow + 마이크 아이콘 | 듣는 중 표시등 |
| `thinking` | 반투명 오버레이 + 로딩 | 처리 중 표시등 |
| `error` | 붉은 테두리 | 오류 표시등 |

#### 음성 대화 (OpenAI Realtime API - WebRTC)
- **방식:** WebRTC Peer Connection
- **모델:** `gpt-4o-realtime-preview`
- **토큰 발급:** `/api/realtime` → ephemeral token → 클라이언트 WebRTC 연결
- **VAD 설정:**
  - 일반 카드: `threshold: 0.5, silence_duration_ms: 800`
  - Read with me 카드: 더 관대한 설정 (읽기 중 끊김 방지)
- **도구(Function Call):** `check_answer` 툴 - 게임 정답 검증

#### 텍스트 입력 *(프로토타입 테스트 전용 - 실제 제품에 없음)*
- 하단 타이핑 영역 → OpenAI Chat API 호출 → TTS 음성 재생
- 목적: 마이크 없는 환경에서도 콘텐츠 검토 가능
- `use_realtime: false` 카드는 텍스트 모드 전용으로 동작

#### 사운드 시스템 *(프로토타입 및 실제 제품 공통 - 핵심 경험)*
- **BGM:** 카드별 배경음악 (fade in/out)
- **SFX:** 정답/오답/힌트/게임시작/레벨업 등 Web Audio API 합성음
- **ElevenLabs 효과음:** 커스텀 효과음 생성 + 임베딩 기반 캐싱 (유사도 0.85 임계값)
- **Thinking 사운드:** AI 응답 대기 중 랜덤 재생

#### Read with me 특수 처리
- 세션 상태: `pre → during_dialogic → post` 순서 관리
- 페이지 진행 추적 (현재 페이지 / 전체 페이지)
  - 프로토타입: 화면에 숫자로 표시 (예: `3 / 7`)
  - 실제 제품: 스피커가 음성으로 알림 ("지금 3페이지야!")
- Listen-only 변형 지원 (`is_listen_only` 플래그)

#### Story Writer 특수 처리
- 7단계 음성 대화 구조: 캐릭터 → 배경 → 문제 → 해결 → 초안 검토 → 수정 → 완성
- 완성 시 DALL-E 3 커버 이미지 자동 생성
- GPT-4o로 5~10페이지 분량 JSON 분해
- 새로운 Read with me 카드로 홈 화면에 등록 (실물 NFC 카드 인쇄용 이미지 포함)

#### 타이머 게임
- `has_timer: true` 카드 (Market Game, Reverse Word): 180초 카운트다운
- 타이머 틱톡 사운드 재생 (음성으로 시간 경과 표현 - 실제 제품과 동일)

---

### 3-3. 카드 관리 화면 (Admin Screen) *(보호자 전용 - 실제 제품 포함)*

이 화면은 실제 제품에서도 필요합니다.
보호자가 자녀에게 제공할 콘텐츠 카드를 관리하는 인터페이스입니다.

#### 접근
- 홈 화면 `⚙ Admin` → `NEXT_PUBLIC_ADMIN_PIN` 환경변수 PIN 인증

#### 카드 목록 관리
- 등록된 카드 목록 (리스트)
- 각 카드: 활성화 토글 / 편집 / 삭제

#### 카드 등록/편집 필드

```
카드 타입:         [general | read_with_me | story_writer]
카드 ID:           (자동 생성)
카드 이름:         _________________________
서브타이틀:        _________________________
커버 이미지:       [이미지 업로드]
시스템 프롬프트:   _________________________ (textarea)
페르소나 이름:     _________________________
Voice Provider:    [openai | elevenlabs]
OpenAI Voice:      [alloy / echo / fable / onyx / nova / shimmer / coral]
ElevenLabs ID:     _________________________ (elevenlabs 선택 시)
온도:              [슬라이더 0.0 ~ 1.0]
LLM 모델:          [gpt-4o | gpt-4o-mini]
Realtime 사용:     [ON / OFF]
JSON 모드:         [ON / OFF]
타이머:            [ON / OFF] + 초 설정
BGM 파일:          [파일 선택] + 볼륨 슬라이더
```

#### Read with me 추가 필드
```
도서 PDF 업로드: [파일 선택] → [도서 분석 시작]
→ book-data-analyzer API 호출
→ book_data.json 저장
세션 프롬프트 탭: [PRE] [DURING-대화형] [POST]
```

#### 프롬프트 버전 관리 (PromptEditor)
- 카드별/프롬프트 키별 버전 히스토리
- 신규 버전 저장 + 활성 버전 전환 (A/B 테스트)
- 버전별 타임스탬프 및 레이블
- 저장 위치: `data/prompt-versions/{cardId}__{promptKey}.json`

---

## 4. 기술 아키텍처

### 4-1. 폴더 구조 (v2 현재)

```
/readingbuddy
├── app/
│   ├── page.tsx                              # 카드 선택 화면 (홈)
│   ├── speaker/[cardId]/page.tsx             # AI 스피커 화면
│   ├── admin/page.tsx                        # 카드 관리 화면
│   └── api/
│       ├── chat/route.ts                     # 텍스트 대화 (OpenAI Chat)
│       ├── realtime/route.ts                 # Realtime API 토큰 발급
│       ├── tts/route.ts                      # OpenAI TTS + ElevenLabs TTS
│       ├── elevenlabs/sound_effect/route.ts  # ElevenLabs 효과음 생성 + 캐싱
│       ├── story/finalize/route.ts           # 스토리 완성 + DALL-E 이미지 생성
│       ├── book-data-analyzer/route.ts       # PDF → book_data.json
│       └── admin/cards/
│           ├── route.ts                      # 카드 목록 GET/POST
│           ├── [cardId]/route.ts             # 개별 카드 CRUD
│           ├── [cardId]/prompt/route.ts      # 프롬프트 버전 관리
│           └── [cardId]/prompt/activate/route.ts  # 활성 버전 전환
├── components/
│   ├── CardGrid.tsx                          # 카드 그리드
│   ├── ContentCard.tsx                       # 개별 카드 컴포넌트
│   ├── SpeakerCharacter.tsx                  # RB.mp4 + 상태별 오버레이
│   ├── SpeakerSession.tsx                    # 메인 세션 컨테이너 (825줄)
│   └── admin/
│       ├── PromptEditor.tsx                  # 프롬프트 편집/버전 관리
│       └── VersionHistory.tsx               # 버전 타임라인
├── hooks/
│   ├── useRealtimeVoice.ts                   # OpenAI Realtime WebRTC 훅
│   └── useSoundManager.ts                    # BGM/SFX 오디오 관리 훅
├── lib/
│   ├── types.ts                              # TypeScript 타입 정의
│   ├── openai-chat.ts                        # OpenAI Chat API 래퍼
│   ├── openai-tts.ts                         # OpenAI TTS 래퍼
│   ├── openai-image.ts                       # DALL-E 3 이미지 생성
│   ├── elevenlabs-tts.ts                     # ElevenLabs TTS 래퍼
│   └── prompt-versions.ts                    # 프롬프트 버전 관리 유틸
├── prompts/
│   ├── cards/                                # 12개 카드 시스템 프롬프트
│   └── read_with_me/                         # PRE/DURING/POST 단계별 프롬프트
├── data/
│   ├── cards.json                            # 카드 레지스트리 (14개+)
│   ├── sound_cache.json                      # ElevenLabs 효과음 캐시
│   └── prompt-versions/                      # 버전별 프롬프트 JSON
├── public/
│   ├── RB.mp4                                # 스피커 캐릭터 영상
│   ├── images/cards/                         # 카드 커버 이미지 (16개)
│   ├── images/books/                         # AI 생성 스토리 커버 이미지
│   ├── sounds/                               # BGM + thinking 사운드 + 타이머
│   │   ├── generated/                        # ElevenLabs 생성 효과음 캐시
│   │   └── thinking/                         # 대기 중 재생 사운드
│   └── data/books/                           # book_data.json (스토리 + 업로드 도서)
└── scripts/                                  # 유틸리티 스크립트
```

### 4-2. 기술 스택

| 영역 | 기술 | 용도 |
|---|---|---|
| 프레임워크 | Next.js 14 (App Router) | 전체 앱 |
| UI | React 18 + Tailwind CSS | 컴포넌트/스타일링 |
| AI 대화 (음성) | OpenAI Realtime API (WebRTC) | 실시간 음성 대화 |
| AI 대화 (텍스트) | OpenAI GPT-4o / GPT-4o-mini | 텍스트 기반 카드 |
| TTS | OpenAI TTS (tts-1) | 기본 음성 출력 |
| TTS (다국어) | ElevenLabs multilingual_v2 | 한국어 지원 카드 |
| 이미지 생성 | OpenAI DALL-E 3 | 스토리 커버 이미지 |
| 효과음 | ElevenLabs + Web Audio API | SFX 합성/캐싱 |
| 임베딩 캐싱 | cosine-similarity | 효과음 중복 방지 |
| PDF 파싱 | pdf-parse | 도서 텍스트 추출 |
| 저장소 | JSON 파일 시스템 | 카드/북/버전 데이터 |
| 언어 | TypeScript | 전체 코드베이스 |

### 4-3. 환경 변수

```bash
# .env.local
NEXT_PUBLIC_ADMIN_PIN=1234
OPENAI_API_KEY=sk-proj-...
ELEVENLABS_API_KEY=sk_...
```

---

## 5. 콘텐츠 카드 시스템

### 5-1. 카드 타입별 동작

| 카드 타입 | AI API | 음성 | 프롬프트 구조 | 특수 기능 |
|---|---|---|---|---|
| `general` | Realtime API 또는 Chat API | OpenAI TTS / ElevenLabs | 단일 System Prompt | 타이머, JSON 모드, check_answer 툴 |
| `read_with_me` | Chat API + TTS | OpenAI TTS | PRE/DURING/POST 순차 | 페이지 추적, listen-only 변형 |
| `story_writer` | Chat API | OpenAI TTS | 7단계 대화 | DALL-E 이미지, 자동 카드 등록 |

### 5-2. 카드 설정 스키마 (`card_config`)

```typescript
interface CardConfig {
  card_id: string;
  card_type: "general" | "read_with_me" | "story_writer";
  title: string;
  subtitle: string;
  cover_image: string;
  persona_name: string;
  prompt_file: string | null;
  system_prompt?: string;
  book_data_path?: string | null;
  voice_openai: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" | "coral";
  voice_provider: "openai" | "elevenlabs";
  elevenlabs_voice_id?: string;
  temperature: number;         // 0.7 ~ 0.9
  active: boolean;
  use_realtime: boolean;
  use_json_mode: boolean;
  disable_thinking_cue: boolean;
  has_timer: boolean;
  timer_seconds?: number;
  llm_model: "gpt-4o" | "gpt-4o-mini";
  is_listen_only: boolean;
  sounds: {
    bgm: string;
    volume: number;
  };
}
```

### 5-3. Read with me 세션 상태 머신

```
[START]
  ↓
[PRE_READING] → prompt_02_pre 사용 → 완료 신호
  ↓
[DURING_DIALOGIC] → prompt_03_during_dialogic (페이지마다)
  ↓ (total_pages 완료)
[POST_READING] → prompt_05_post 사용
  ↓
[END]
```

### 5-4. 프롬프트 버전 관리

```
data/prompt-versions/
├── mindreader__default.json
├── story_0a1bdeb1__during_dialogic.json
└── {cardId}__{promptKey}.json

각 파일 구조:
{
  "card_id": "mindreader",
  "prompt_key": "default",
  "active_version_id": "v3",
  "versions": [
    { "id": "v1", "content": "...", "label": "초기 버전", "created_at": "..." },
    { "id": "v2", "content": "...", "label": "개선 버전", "created_at": "..." },
    { "id": "v3", "content": "...", "label": "A/B 테스트", "created_at": "..." }
  ]
}
```

---

## 6. 데이터 모델

### 6-1. BookData (스토리/도서 구조)

```typescript
interface BookData {
  metadata: {
    title: string;
    author?: string;
    target_age: string;
    total_pages: number;
    themes: string[];
    cover_image?: string;
  };
  pages: BookPage[];
}

interface BookPage {
  page_number: number;
  text: string;
  reading_script: string;          // TTS용 읽기 스크립트
  illustration_description: string; // 삽화 설명
  discussion_questions: string[];   // 대화 유도 질문
  vocabulary: string[];             // 새 단어 목록
}
```

### 6-2. SoundCache

```typescript
interface SoundCacheEntry {
  id: string;
  description: string;        // 효과음 설명 텍스트
  embedding: number[];        // 텍스트 임베딩 벡터
  file_url: string;           // /sounds/generated/*.mp3
  created_at: string;
}
```

---

## 7. 비기능 요구사항

### 7-1. 반응형 지원 (프로토타입)
- 기본 타깃: 태블릿 (768px ~ 1024px) — 스피커 옆에 두고 보호자가 테스트하는 용도
- 카드 선택 화면: 모바일 2열 / 태블릿 4열
- 세션 화면: 세로 최적화

### 7-2. 오류 처리
- API 호출 실패 → RB.mp4 위에 붉은 테두리 + "잠깐, 다시 연결해볼게요!" 메시지
  - 실제 제품에서는 스피커 음성으로 오류 안내
- 음성 인식 실패 → 프로토타입: 텍스트 모드 안내 / 실제 제품: 다시 말해달라는 음성 안내
- PDF 분석 실패 → 관리자 화면에 오류 상세 표시

### 7-3. 오디오 초기화
- AudioContext는 사용자 제스처 후 lazy 초기화 (브라우저 정책 준수 — 프로토타입 한정)
- BGM은 카드/세션 시작 후 fade-in

---

## 8. 구현 현황 (v2 기준)

### 완료된 기능

```
Phase 1 (Core):
  ✅ 카드 선택 화면 (cards.json 기반 동적 로드)
  ✅ AI 스피커 화면 (텍스트 입력 + OpenAI Chat API)
  ✅ RB.mp4 루프 재생 + 상태별 CSS 오버레이 효과

Phase 2 (Content):
  ✅ 카드별 시스템 프롬프트 연동 (12개 카드)
  ✅ OpenAI TTS 연동 (6가지 음성)
  ✅ ElevenLabs TTS 연동 (한국어 다국어 지원)
  ✅ 카드 관리 화면 (CRUD + 활성화 토글)

Phase 3 (Read with me):
  ✅ PDF 업로드 + Book Analyzer API
  ✅ book_data.json 세션 관리
  ✅ PRE/DURING/POST 세션 전환
  ✅ Listen-only 변형 지원

Phase 4 (Voice):
  ✅ OpenAI Realtime API 연동 (WebRTC)
  ✅ VAD 설정 (카드 타입별 임계값 분리)
  ✅ Function Call 툴 (check_answer)

Phase 5 (New Cards):
  ✅ Soccer 20Q (축구 20 Questions)
  ✅ Ocean Chosung (해양 초성 퀴즈)
  ✅ Who Am I (역방향 20 Questions)
  ✅ Market Game (기억력 게임, 180초 타이머)
  ✅ Reverse Word (단어 뒤집기, 180초 타이머)

Phase 6 (Story Writer):
  ✅ 7단계 대화형 스토리 창작
  ✅ DALL-E 3 커버 이미지 자동 생성
  ✅ GPT-4o 스토리 JSON 분해 (5~10페이지)
  ✅ 자동 Read with me 카드 등록

Phase 7 (Sound System):
  ✅ 카드별 BGM (fade in/out)
  ✅ Web Audio API 합성 SFX
  ✅ ElevenLabs 커스텀 효과음 생성
  ✅ 임베딩 기반 효과음 캐싱 (코사인 유사도 0.85)
  ✅ Thinking 대기 사운드

Phase 8 (Prompt Versioning):
  ✅ 카드/프롬프트 키별 버전 히스토리
  ✅ 활성 버전 전환 (A/B 테스트)
  ✅ Admin UI (PromptEditor, VersionHistory)
```

### 미구현 (백로그)

```
- 사용자 계정 / 아동 프로필 관리
- 독서 이력 및 학습 통계
- 멀티 디바이스 동기화
- PIN 이외의 관리자 인증
- 카드 커버 이미지 업로드 UI (현재 수동)
```

---

## 9. 신규 기획 아이디어 (v3 제안)

### 9-\1. 아동 학습 진도 추적 (Learning Progress)

**우선순위: P0**

> 현재 상태: 세션 종료 시 학습 데이터가 사라짐. 부모가 아이의 학습 현황을 알 수 없음.

**기능:**
- 세션별 학습 데이터 저장: 플레이한 카드, 소요 시간, 정답률, 새로 배운 단어
- 아동 프로필 최대 3명 생성 (가족 공유 디바이스 대응)
- 주간/월간 학습 리포트 (부모용)
- 특정 단어/주제 반복 학습 추천

**기술 접근:**
- 세션 데이터를 `data/sessions/{profileId}/` JSON으로 저장
- 부모용 대시보드 `/parent` 라우트 추가
- 차트 라이브러리 (recharts 등)

**예상 효과:** 부모 만족도 ↑, 재사용률 ↑

---

### 9-\1. 단어장/학습 노트 자동 생성 (Vocabulary Notebook)

**우선순위: P0**

> 현재 상태: 대화 중 나온 새 단어가 기록되지 않음.

**기능:**
- AI 대화 중 새로운 단어/개념 자동 추출 및 저장
- 단어장 카드: "오늘 배운 단어" 리뷰 세션
- 단어 복습 퀴즈 자동 생성 (Riddles/Mindreader 프롬프트 재활용)
- Read with me 카드의 vocabulary 필드와 연동

**기술 접근:**
- `chat/route.ts`에서 응답 후처리로 단어 추출
- `data/vocabulary/{profileId}.json` 저장
- 새 카드 타입 `vocabulary_review` 추가

---

### 9-\1. 부모 대시보드 & 알림 (Parent Dashboard)

**우선순위: P1**

**기능:**
- 오늘 플레이 요약: "오늘 30분, 우주 탐험 + 수학 배틀 플레이"
- 주간 학습 리포트 이메일 발송 (선택)
- 아이가 어려워한 단어/문제 하이라이트
- 오늘의 추천 카드 제안 ("어제 수학을 잘했어요! 오늘은 도전!")

**기술 접근:**
- `/parent` 라우트, 별도 PIN 또는 패스워드
- 이메일: Resend 또는 SendGrid API

---

### 9-\1. 보상 및 성취 시스템 (Reward System)

**우선순위: P1**

> 아이들의 지속 학습 동기 부여.

**기능:**
- 카드 완료/정답 시 스티커/배지 획득
- "3일 연속 플레이" 같은 스트릭 보상
- 수집한 배지 갤러리 화면
- 특정 조건 달성 시 새 카드 언락

**기술 접근:**
- `data/achievements/{profileId}.json`
- 홈 화면 상단에 배지 + 스트릭 카운터 표시
- 애니메이션: CSS 기반 confetti 효과

---

### 9-\1. 그림 그리기 카드 (Drawing Card)

**우선순위: P1**

> Story Writer의 자연스러운 확장.

**기능:**
- AI가 "빨간 사과를 그려봐요!" 같은 드로잉 미션 제시
- 아이가 그림을 그리는 동안 AI가 이야기 나눔
- 완성된 그림을 카메라로 찍어 업로드 → GPT-4o Vision으로 분석
- AI 피드백: "우와, 정말 둥근 사과네요! 초록 잎도 그렸어요?"
- DALL-E로 AI가 그린 버전과 비교 보여주기

**기술 접근:**
- 새 카드 타입 `drawing_activity`
- Canvas API 또는 카메라 업로드 (input type=file)
- GPT-4o Vision API로 그림 분석

---

### 9-\1. 일과 루틴 카드 (Daily Routine)

**우선순위: P1**

> 아침/저녁 루틴 습관 형성 도구.

**기능:**
- "아침 루틴" 카드: 이닦기 체크 → 아침밥 얘기 → 오늘 날씨 학습
- "잠자리 루틴" 카드: 오늘 하루 복습 → 수면 명상 음악 → 동화 한 편
- 루틴 완료 체크리스트 + 스티커 보상 연동
- 부모가 루틴 순서/내용 커스터마이즈 가능

**기술 접근:**
- 새 카드 타입 `routine`
- 여러 미니 세션으로 구성된 시퀀스 프롬프트
- 시간대별 자동 추천 (아침 8시 → 아침 루틴 카드 우선 노출)

---

### 9-\1. 친구/형제 대결 모드 (Multiplayer Mode)

**우선순위: P2**

**기능:**
- 같은 기기에서 2명이 번갈아가며 플레이 (Math Battle, Riddles 등)
- 점수 비교 화면
- "두 명 모두 정답!" 같은 협력 모드

**기술 접근:**
- `SpeakerSession`에 멀티플레이어 상태 추가
- 프롬프트에 "Player 1 vs Player 2" 컨텍스트 주입
- 간단한 로컬 스코어보드

---

### 9-\1. AI 책 추천 (Book Recommendation)

**우선순위: P2**

**기능:**
- 아이의 관심사, 최근 플레이한 카드 기반 책 추천
- "우주 탐험을 좋아하는 친구에게: '별이 빛나는 밤에' 추천!"
- 추천된 책을 Read with me 카드로 쉽게 등록하는 플로우
- 도서관 API 연동 (국립어린이청소년도서관 API 등)

---

### 9-\1. 오프라인/캐시 모드 (Offline Support)

**우선순위: P2**

**기능:**
- 자주 사용하는 카드의 TTS 미리 캐싱
- 인터넷 없이도 기존 스토리 카드 재생 가능 (Listen-only 모드)
- 오프라인 상태 표시 + 사용 가능 카드 필터링

**기술 접근:**
- Service Worker + Cache API
- `/api/tts` 응답을 IndexedDB에 캐싱
- PWA manifest 추가

---

### 9-\1. 콘텐츠 마켓플레이스 (Card Marketplace)

**우선순위: P3 (장기 비전)**

**기능:**
- 부모/선생님이 만든 카드를 커뮤니티와 공유
- 카드 평점/리뷰 시스템
- 교육 기관 전용 카드 팩
- 유료 프리미엄 카드 (교육 전문가 제작)

**기술 접근:**
- 사용자 계정 시스템 (NextAuth.js)
- DB 전환 필요 (현재 JSON → Supabase/PlanetScale)
- 결제 연동 (Stripe)

---

### 9-\1. 발음 평가 카드 (Pronunciation Coach)

**우선순위: P2**

> 영어/한국어 발음 교정 특화 카드.

**기능:**
- AI가 특정 단어/문장 발음하면 아이가 따라 읽기
- OpenAI Whisper로 발음 텍스트 변환 → 정확도 비교
- "Good!" / "다시 한 번 해볼까요?" 피드백
- 발음 개선 그래프 (세션별 추적)

**기술 접근:**
- `use_realtime: false` 카드로 구현 (Whisper API 별도 사용)
- `/api/pronunciation/route.ts` 신규 엔드포인트
- 문자열 유사도 비교 (Levenshtein distance)

---

### 9-\1. AI 스피커 캐릭터 커스터마이즈 (Character Customization)

**우선순위: P2**

**기능:**
- RB.mp4 외에 다른 캐릭터 선택 가능 (고양이, 로봇, 공룡 등)
- 아이가 캐릭터에 이름 붙이기
- 카드별로 다른 캐릭터 할당 가능
- 아이가 선택한 캐릭터가 인사 메시지에 반영

**기술 접근:**
- `character_video` 필드를 `CardConfig`에 추가
- `/public/characters/` 폴더에 캐릭터 영상 관리
- 첫 사용 시 캐릭터 선택 온보딩 플로우

---

### v3 우선순위 요약

| 기능 | 우선순위 | 난이도 | 예상 임팩트 |
|---|---|---|---|
| 학습 진도 추적 | P0 | 보통 | 재방문율 ↑↑ |
| 단어장 자동 생성 | P0 | 쉬움 | 학습 효과 ↑↑ |
| 부모 대시보드 | P1 | 보통 | 부모 만족도 ↑↑ |
| 보상/성취 시스템 | P1 | 쉬움 | 아이 참여도 ↑↑ |
| 그림 그리기 카드 | P1 | 보통 | 콘텐츠 다양성 ↑ |
| 일과 루틴 카드 | P1 | 쉬움 | 일상 습관 형성 ↑ |
| 발음 평가 카드 | P2 | 어려움 | 영어교육 차별화 ↑ |
| 친구 대결 모드 | P2 | 보통 | 사회성 발달 ↑ |
| AI 책 추천 | P2 | 보통 | 독서 확장 ↑ |
| 캐릭터 커스터마이즈 | P2 | 쉬움 | 애착감 ↑ |
| 오프라인 모드 | P2 | 어려움 | 접근성 ↑ |
| 콘텐츠 마켓플레이스 | P3 | 매우어려움 | 수익화 ↑↑↑ |

---

## 10. 관련 파일 목록

| 파일 | 설명 |
|---|---|
| `PRD.md` | 본 문서 |
| `app/page.tsx` | 홈 화면 |
| `app/speaker/[cardId]/page.tsx` | 스피커 세션 화면 |
| `app/admin/page.tsx` | 관리자 화면 |
| `app/api/chat/route.ts` | 텍스트 대화 API |
| `app/api/realtime/route.ts` | Realtime 토큰 발급 |
| `app/api/tts/route.ts` | TTS API |
| `app/api/elevenlabs/sound_effect/route.ts` | 효과음 생성 + 캐싱 |
| `app/api/story/finalize/route.ts` | 스토리 완성 API |
| `app/api/book-data-analyzer/route.ts` | PDF 분석 API |
| `components/SpeakerSession.tsx` | 메인 세션 컴포넌트 (825줄) |
| `components/SpeakerCharacter.tsx` | 캐릭터 영상 컴포넌트 |
| `hooks/useRealtimeVoice.ts` | Realtime WebRTC 훅 |
| `hooks/useSoundManager.ts` | BGM/SFX 관리 훅 |
| `lib/types.ts` | TypeScript 타입 정의 |
| `lib/prompt-versions.ts` | 프롬프트 버전 관리 |
| `data/cards.json` | 카드 레지스트리 (14개+) |
| `data/sound_cache.json` | 효과음 캐시 |
| `data/prompt-versions/` | 버전별 프롬프트 저장소 |
| `prompts/cards/` | 12개 카드 시스템 프롬프트 |
| `prompts/read_with_me/` | 독서 단계별 프롬프트 |
| `public/RB.mp4` | 스피커 캐릭터 영상 |
| `public/sounds/` | BGM + 효과음 |
| `public/data/books/` | book_data JSON |
