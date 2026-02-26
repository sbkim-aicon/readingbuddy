# AI Tutor Mock - 프로젝트 문서

## 📋 프로젝트 개요

베트남 대학생 대상 한국어 학습 서비스의 LLM 프롬프트를 테스트하기 위한 내부 개발 도구입니다. 기획자가 실시간으로 프롬프트를 수정하고 AI 응답을 확인할 수 있는 샌드박스 환경을 제공합니다.

### 주요 목표
- **프롬프트 반복 테스트**: 시스템 프롬프트 수정에 따른 AI 응답 품질 및 JSON 파싱 결과 검증
- **Function Calling 연동**: 대화 턴 관리, 발화 평가, 사전 검색 등의 로직 시뮬레이션
- **데이터 축적**: 테스트한 모든 프롬프트와 대화 로그를 로컬 파일로 관리

## 🏗️ 아키텍처

### 기술 스택
- **Framework**: Next.js 16.1.6 (App Router, Turbopack)
- **UI**: React 19.2.3, Tailwind CSS 4, Lucide React Icons
- **AI**: OpenAI SDK 6.16.0 (GPT-4o-mini)
- **Language**: TypeScript 5

### 프로젝트 구조
```
AITutor_mock/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 메인 페이지 (홈)
│   │   ├── layout.tsx            # 루트 레이아웃
│   │   ├── actions.ts            # OpenAI API 호출 및 Function Calling
│   │   ├── actions_prompt.ts     # 프롬프트 저장/로드 로직
│   │   ├── actions_voice.ts      # TTS 및 음성 인식 로직
│   │   └── api/
│   │       └── log/route.ts      # 로그 저장 API
│   └── components/
│       ├── ThreeColumnLayout.tsx # 3단 레이아웃
│       ├── PromptEditor.tsx      # 프롬프트 편집기
│       ├── DebugPanel.tsx        # JSON 디버그 패널
│       ├── MobileMockup.tsx      # 모바일 프레임
│       ├── ChatInterface.tsx     # 채팅 인터페이스
│       ├── VoiceSelector.tsx     # 음성 선택기
│       └── MissionAccordion.tsx  # 미션 아코디언
├── saved_prompts/                # 저장된 프롬프트 파일
├── test_logs/                    # 테스트 로그 파일
├── mock_dict.json                # Mock 사전 데이터
└── package.json
```

## 🎨 UI 구조

### 3단 레이아웃 (Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  좌측: Prompt Editor     중앙: Debug Panel    우측: Mobile  │
├─────────────────────────────────────────────────────────────┤
│ • System Prompt 입력     • JSON 뷰어          • 채팅 UI     │
│ • Variables 설정         • Function Call Log  • 미션 표시   │
│ • Model Config           • Event Log          • 음성 버튼   │
│ • Save/Load 기능         • Token 사용량        • TTS 재생   │
└─────────────────────────────────────────────────────────────┘
```

### 모바일 UI (20:9 비율)
- 상단: 미션 아코디언 (접기/펼치기)
- 중앙: 채팅 메시지 영역
  - 사용자 메시지 (우측, 파란색)
  - AI 메시지 (좌측, 흰색)
  - 베트남어 번역 표시
  - 교정 피드백 (오렌지 배경)
- 하단: 음성/텍스트 입력

## 🔧 핵심 기능

### 1. 프롬프트 관리 (PromptEditor.tsx)

**기능**:
- System Prompt 입력 및 편집
- Variables 동적 추가/삭제 (Mustache 스타일: `{{변수명}}`)
- Temperature 조정 (0.0 - 1.0)
- 프롬프트 저장/로드/히스토리 관리
- 프롬프트 이름 변경

**저장 위치**: `saved_prompts/prompt_[timestamp].json`

**데이터 구조**:
```typescript
{
  systemPrompt: string;
  variables: { key: string; value: string }[];
  name: string;
  timestamp: string;
}
```

### 2. AI 대화 처리 (actions.ts)

**주요 함수**: `chatWithAI(messages, modelConfig)`

**기능**:
- OpenAI Chat Completions API 호출
- JSON 응답 강제 (`response_format: { type: "json_object" }`)
- Function Calling 지원
- Fallback 메커니즘 (응답 실패 시 자동 재시도)
- 토큰 제한 (max_tokens: 400)

**Function Tools**:
1. `get_dictionary_entry`: 사전 검색
   - Input: `{ word: string }`
   - Output: 사전 데이터 또는 "not_found"

**응답 구조**:
```typescript
{
  success: boolean;
  message: ChatCompletionMessage;
  toolResults: Array<{
    id: string;
    name: string;
    result: any;
  }>;
  rawResponse: ChatCompletion;
  isFallback?: boolean; // Fallback 응답 여부
}
```

### 3. 대화 흐름 관리 (page.tsx)

**상태 관리**:
```typescript
messages: MessageWithAudio[]      // 대화 히스토리
isLoading: boolean                 // 로딩 상태
topicState: TopicState             // 토픽 관리
completedMissions: {}              // 미션 완료 상태
logs: LogEntry[]                   // 디버그 로그
lastJson: any                      // 최근 JSON 응답
```

**대화 처리 흐름**:
1. 사용자 입력 → `handleSendMessage`
2. 프롬프트 변수 치환 (Mustache 스타일)
3. `processTurn` 재귀 호출
4. OpenAI API 호출 (`chatWithAI`)
5. Function Calling 처리 (있는 경우)
6. JSON 파싱 및 메시지 생성
7. TTS 생성 (선택적)
8. 미션 완료 체크
9. UI 업데이트

**Fallback 처리**:
- `finish_reason === 'length'`: 토큰 초과
- JSON 파싱 실패: 형식 오류
- 빈 응답: 콘텐츠 누락
- 최대 3회 자동 재시도 (temperature 증가)

### 4. JSON 응답 필드

**필수 필드**:
```typescript
{
  ko: string;           // 한국어 응답
  vn: string;           // 베트남어 번역 (MANDATORY)
  emotion: string;      // 감정 (happy/sad/neutral)
  correct: string;      // 사용자 응답 정확성 (Yes/No)
}
```

**선택 필드** (correct === "No" 시):
```typescript
{
  correct_answer_ko: string;        // 올바른 한국어 문장
  correction_explanation: string;   // 교정 설명 (베트남어)
}
```

**미션 필드**:
```typescript
{
  mission_complete_0: string;  // 미션 0 완료 여부 (Yes/No)
  mission_complete_1: string;  // 미션 1 완료 여부 (Yes/No)
}
```

### 5. TTS (Text-to-Speech) (actions_voice.ts)

**기능**: ElevenLabs API를 통한 음성 합성

**함수**: `generateSpeechResult(text, voiceId)`

**지원 음성**:
- Rachel (기본)
- Drew
- Clyde
- Paul
- Domi
- Dave
- Fin
- Sarah

**응답**: Base64 인코딩된 오디오 데이터

**제한**:
- 최대 5000자
- 에러/시스템 메시지 제외
- TTS 활성화 여부에 따라 스킵 가능

### 6. 음성 인식 (STT)

**기능**: OpenAI Whisper API를 통한 음성 텍스트 변환

**함수**: `transcribeAudio(formData)`

**지원 형식**: WebM (브라우저 MediaRecorder)

**처리 흐름**:
1. 마이크 권한 요청
2. MediaRecorder로 녹음
3. Blob 생성
4. FormData로 서버 전송
5. Whisper API 호출
6. 텍스트 반환

### 7. 미션 시스템 (MissionAccordion.tsx)

**기능**:
- Variables에서 `mission0`, `mission1` 추출
- 미션 완료 상태 표시 (체크 아이콘)
- 접기/펼치기 UI

**상태 업데이트**:
```typescript
setCompletedMissions(prev => ({
  ...prev,
  mission_complete_0: parsed.mission_complete_0 === "Yes",
  mission_complete_1: parsed.mission_complete_1 === "Yes"
}));
```

### 8. 로깅 시스템 (api/log/route.ts)

**저장 위치**: `test_logs/log_[date]_[time].json`

**로그 구조**:
```typescript
{
  timestamp: string;
  prompt: string;      // 스냅샷된 프롬프트
  result: any;         // AI 응답 메시지
  meta: {
    type: string;      // 로그 타입
  };
}
```

**호출 시점**:
- 사용자 메시지 전송 시
- AI 응답 수신 시
- 에러 발생 시

## 🔄 데이터 흐름

### 메시지 전송 흐름
```
User Input
    ↓
handleSendMessage
    ↓
processTurn (재귀)
    ↓
Mustache 변수 치환
    ↓
chatWithAI (OpenAI API)
    ↓
Function Calling 처리
    ↓
JSON 파싱
    ↓
TTS 생성
    ↓
미션 체크
    ↓
UI 업데이트
```

### Function Calling 흐름
```
AI Response with tool_calls
    ↓
각 tool_call 순회
    ↓
get_dictionary_entry 호출
    ↓
lookupDictionary (mock_dict.json)
    ↓
결과를 toolResults에 추가
    ↓
tool 메시지로 재귀 호출
    ↓
최종 AI 응답 생성
```

## 📝 프롬프트 구조 예시

```
1. **ko**
- Role play according to the role and situation.
- role of AI: {{ai}}
- role of User: {{user}}
- Situation: {{situation}}
- Rules:
  - Speak elementary level Korean.
  - Only ask questions or respond to the user's statements.
  - Guide the conversation back to context if user goes off-topic.

2. **vn** (MANDATORY)
- Translate the "ko" field content into natural Vietnamese.
- This field is REQUIRED for EVERY response.

3. **emotion**
- Choose one: happy, sad, neutral.

4. **correct**
- Determine if user's response is natural and grammatically correct.

5. **correct_answer_ko** (if correct = No)
- Provide the correct Korean sentence in Vietnamese.

6. **correction_explanation** (if correct = No)
- Explain why the user's response is incorrect in Vietnamese.

7. **mission_complete_0**
- Evaluate if user completed: {{mission0En}}

8. **mission_complete_1**
- Evaluate if user completed: {{mission1En}}
```

## 🐛 에러 처리

### Fallback 메커니즘
1. **Token 초과** (`finish_reason: 'length'`)
   - Fallback 메시지 반환
   - 자동 재시도

2. **JSON 파싱 실패**
   - 빈 응답 감지
   - Whitespace 루프 감지
   - 재시도 (최대 3회)

3. **빈 콘텐츠**
   - 모든 필드 검증 (ko, en, vn, response)
   - 유효한 콘텐츠 없으면 재시도

### 재시도 로직
```typescript
// Temperature 증가 + 랜덤 Jitter
currentRetryTemp = Math.min(
  temperature + (retryCount * 0.2) + (Math.random() * 0.1),
  1.0
);
```

### 로그 타입
- `info`: 일반 정보
- `func`: Function Call 실행
- `response`: AI 응답
- `error`: 에러 발생

## 🎯 주요 컴포넌트

### ChatInterface.tsx
**역할**: 채팅 UI 및 음성 입력 처리

**Props**:
- `messages`: 메시지 배열
- `onSendMessage`: 텍스트 메시지 전송 핸들러
- `onSendAudio`: 음성 메시지 전송 핸들러
- `isLoading`: 로딩 상태
- `isSessionEnded`: 세션 종료 여부
- `variables`: 프롬프트 변수
- `completedMissions`: 미션 완료 상태

**기능**:
- 텍스트 입력
- 음성 녹음 (MediaRecorder)
- 메시지 표시 (사용자/AI)
- 베트남어 번역 표시
- 교정 피드백 표시
- TTS 오디오 자동 재생

### DebugPanel.tsx
**역할**: JSON 응답 및 로그 표시

**기능**:
- JSON 뷰어 (정렬된 키 순서)
- Function Call 로그
- Event 로그
- 타임스탬프

**JSON 키 순서**:
```
ko → vn → en → emotion → correct →
correct_answer_ko → correct_answer_en →
correction_explanation →
mission_complete_0 → mission_complete_1
```

### MobileMockup.tsx
**역할**: 20:9 모바일 프레임

**기능**:
- 모바일 화면비 적용
- 헤더 커스터마이징
- 스크롤 가능한 콘텐츠 영역

## ⚙️ 환경 설정

### 필수 환경 변수 (.env.local)
```
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...  # TTS 사용 시
```

### 빌드 및 실행
```bash
# 개발 모드
npm run dev

# 프로덕션 빌드
npm run build
npm start

# Lint 검사
npm run lint
```

## 📊 데이터 파일

### mock_dict.json
베트남어-한국어 사전 Mock 데이터
```json
[
  {
    "word": "안녕하세요",
    "meaning": "Xin chào",
    "example": "안녕하세요, 만나서 반갑습니다."
  }
]
```

### saved_prompts/
프롬프트 저장 파일
```
prompt_2026-02-03T15-30-45.json
```

### test_logs/
테스트 로그 파일
```
log_2026-02-03_15-30-45.json
```

## 🔐 보안 및 제한사항

### API 키 보호
- `.env.local`에 저장
- Git에서 제외 (.gitignore)
- 서버 사이드에서만 사용 (`"use server"`)

### 토큰 제한
- `max_tokens: 400` (대화형 응답에 최적화)
- 긴 응답 방지
- 비용 절감

### 메시지 크기 제한
- 4000자 초과 시 자동 truncate
- 컨텍스트 윈도우 보호

## 🚀 향후 개선 사항

### 계획된 기능
- [ ] 다중 프롬프트 비교 뷰
- [ ] 대화 히스토리 내보내기 (CSV/JSON)
- [ ] 프롬프트 템플릿 라이브러리
- [ ] A/B 테스트 모드
- [ ] 통계 대시보드 (성공률, 평균 응답 시간)

### 기술 부채
- TypeScript `any` 타입 제거
- React Hook 의존성 경고 해결
- 컴포넌트 분리 (page.tsx 너무 큼)
- 에러 바운더리 추가
- 단위 테스트 작성

## 📚 참고 자료

- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide React Icons](https://lucide.dev)

---

**마지막 업데이트**: 2026-02-03
**버전**: 0.1.0
**상태**: 개발 중 (Development)
