# PRD: AI Tutor Prompt Testing Sandbox (Internal)

## 1. 프로젝트 개요
베트남 대학생 대상 한국어 학습 서비스의 LLM 프롬프트를 고도화하기 위한 내부 테스트 웹 도구입니다. 기획자가 직접 프롬프트를 수정하고, 실제 서비스와 유사한 20:9 모바일 환경에서 결과값(JSON 및 UI)을 즉시 확인할 수 있도록 합니다.

## 2. 주요 목표
- **프롬프트 반복 테스트:** 시스템 프롬프트 수정에 따른 AI 응답 품질 및 JSON 파싱 결과 검증.
- **Function Calling 연동:** 대화 턴 관리, 발화 평가, 사전 검색 등의 로직 시뮬레이션.
- **데이터 축적:** 테스트한 모든 프롬프트와 대화 로그를 로컬 JSON 파일로 관리하여 데이터 자산화.

## 3. 핵심 기능 명세

### 3.1 3단 레이아웃 (Web)
1. **좌측: Prompt Editor & Config**
   - System Prompt 입력창 (Monaco Editor 스타일 권장)
   - 변수(Variables) 설정 영역: `{{name}}`, `{{level}}` 등 프롬프트 내 치환될 값 정의
   - 모델 설정: GPT-4o-mini 고정 및 온도(Temperature) 조절
2. **중앙: JSON Output & Debugging**
   - LLM으로부터 전달받은 원본 JSON 데이터 트리 뷰어
   - Function Calling 호출 이력 및 반환 데이터 로깅 영역
   - 토큰 소모량 및 디버그 메시지 표시
3. **우측: Mobile Mockup (20:9)**
   - 실제 모바일 화면비(20:9)가 적용된 폰 프레임
   - 4가지 학습 모드(미션, 롤플레잉, 사진 설명, 자유 대화) UI 시뮬레이션
   - 발화 말풍선, 미션 체크리스트, 교정안 팝업 UI

### 3.2 데이터 처리 및 저장
- **Local Storage:** 모든 테스트 로그(프롬프트, 설정, 결과 JSON)를 `logs/[date]/[id].json` 형태로 로컬 저장.
- **Prompt Versioning:** 프롬프트 변경 이력을 로컬에 저장하고 불러오기 가능.
- **Mock Dictionary:** 외부 API 대신 로컬 `mock_dict.json`에서 베트남어-한국어 단어 검색 수행.

### 3.3 Function Calling 정의
- `evaluate_turn`: 개별 발화에 대한 점수(0-100), 교정 문장, 피드백 제공.
- `manage_session`: 전체 대화 턴(Turn) 수 체크 및 종료 여부 판단.
- `get_dictionary_entry`: 특정 단어의 뜻과 예문을 Mock 데이터에서 조회.

## 4. 모드별 UI 요구사항 (이미지 기반)
1. **AI 대화 미션:** 상황 설명 카드 + 발화별 실시간 교정 피드백 노출.
2. **롤플레잉:** 하단 미션 리스트 팝업 + 달성 완료 시 체크 UI.
3. **사진 설명:** 중앙 이미지 배치 + 이미지 분석 기반 AI 튜터 응답.
4. **자유 대화:** 상단 주제 가이드 + 자유로운 채팅 인터페이스.

## 5. 기술 스택 (권장)
- **Frontend:** Next.js (App Router), Tailwind CSS, Lucide React (Icons)
- **AI:** OpenAI SDK (GPT-4o-mini)
- **Storage:** Node.js File System (fs) API 또는 유사 환경