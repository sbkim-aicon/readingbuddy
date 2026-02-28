# 프롬프트 에디터 & 버전 관리 기능 구현 계획

## 현재 상태 분석
- **카드 설정**: `data/cards.json`에 flat JSON 배열로 저장
- **프롬프트**: `prompts/cards/*.md` (general), `prompts/read_with_me/*.md` (read_with_me)
- **어드민**: `/admin` 페이지에 카드 목록 테이블만 존재 (PIN 인증)
- **DB 없음**: 전체가 파일 기반

## 구현 계획

### 1. 데이터 구조: 프롬프트 버전 저장
- `data/prompt-versions/` 디렉토리에 카드별 JSON 파일 저장
- 파일 형식: `data/prompt-versions/{card_id}.json`
```json
{
  "card_id": "astro_explorer",
  "versions": [
    {
      "id": "v_1709123456789",
      "content": "프롬프트 내용...",
      "label": "v1 - 초기 버전",
      "created_at": "2024-02-28T12:00:00Z",
      "is_active": true
    }
  ],
  "active_version_id": "v_1709123456789"
}
```
- `read_with_me` 카드의 경우 phase별 프롬프트(pre, during_dialogic, post)를 각각 관리

### 2. API Routes

#### `GET/PUT /api/admin/cards/[cardId]/prompt`
- GET: 해당 카드의 현재 활성 프롬프트와 버전 히스토리 조회
- PUT: 새 버전으로 프롬프트 저장 (자동 버전 생성)

#### `POST /api/admin/cards/[cardId]/prompt/activate`
- 특정 버전을 활성 버전으로 설정 (히스토리에서 이전 버전 복원)

### 3. 어드민 UI 변경

#### 카드 목록 (`/admin`)
- 각 카드 행에 "상세/편집" 버튼 추가 → 카드 상세 페이지로 이동

#### 카드 상세 페이지 (`/admin/cards/[cardId]`)
두 영역으로 구성:

**A. 카드 정보 관리 (상단)**
- 카드 기본 설정 편집 (title, subtitle, voice, temperature, active 등)
- 기존 어드민의 카드별 설정을 상세 페이지로 이동

**B. 프롬프트 에디터 (하단)**
- **에디터 영역**: 마크다운 프롬프트를 직접 편집하는 textarea
- **버전 히스토리 사이드바/드롭다운**: 이전 버전 목록, 클릭 시 해당 버전 로드
- **저장 버튼**: 새 버전으로 저장 (라벨 입력 가능)
- **활성화 버튼**: 히스토리에서 선택한 버전을 현재 활성 버전으로 설정
- **테스트 미리보기**: 저장된 프롬프트가 실제 카드에 즉시 반영되어 테스트 가능
- `read_with_me` 카드: 탭으로 phase별 프롬프트 전환 (PRE / DURING / POST)

### 4. 구현 순서

1. **데이터 레이어**: 프롬프트 버전 저장/조회 유틸리티 함수 (`lib/prompt-versions.ts`)
2. **API Routes**: `/api/admin/cards/[cardId]/prompt` 엔드포인트
3. **카드 상세 페이지**: `/admin/cards/[cardId]/page.tsx`
4. **프롬프트 에디터 컴포넌트**: `components/admin/PromptEditor.tsx`
5. **버전 히스토리 컴포넌트**: `components/admin/VersionHistory.tsx`
6. **카드 목록 업데이트**: 기존 `/admin` 페이지에 상세 링크 추가
7. **프롬프트 로딩 로직 수정**: 기존 `chat/route.ts`, `speaker/[cardId]/page.tsx`에서 버전 관리된 프롬프트를 우선 사용하도록 변경

### 5. 파일 변경 목록

**신규 파일:**
- `lib/prompt-versions.ts` — 버전 관리 유틸리티
- `app/api/admin/cards/[cardId]/prompt/route.ts` — 프롬프트 CRUD API
- `app/api/admin/cards/[cardId]/prompt/activate/route.ts` — 버전 활성화 API
- `app/api/admin/cards/[cardId]/route.ts` — 개별 카드 CRUD API
- `app/admin/cards/[cardId]/page.tsx` — 카드 상세 페이지
- `components/admin/PromptEditor.tsx` — 에디터 컴포넌트
- `components/admin/VersionHistory.tsx` — 버전 히스토리 컴포넌트
- `data/prompt-versions/` — 버전 데이터 디렉토리

**수정 파일:**
- `app/admin/page.tsx` — 상세 링크 추가
- `app/api/chat/route.ts` — 버전 관리 프롬프트 우선 로딩
- `app/speaker/[cardId]/page.tsx` — 버전 관리 프롬프트 우선 로딩
- `lib/types.ts` — 버전 관련 타입 추가
