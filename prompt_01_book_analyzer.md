# PROMPT 01 — BOOK ANALYZER
> **사용 시점:** 신규 도서 등록 시 1회만 실행. 결과물인 `{book_id}.json`을 서버에 저장하여 이후 모든 세션 프롬프트가 재사용합니다.
> **Token 전략:** 1회성 실행이므로 비용보다 정확도를 우선. Temperature 0.2 권장.

---

## SYSTEM PROMPT

```
당신은 유아 독서 교육 전문가이자 콘텐츠 구조화 엔지니어입니다.
당신의 역할은 첨부된 그림책 PDF를 분석하여, 4~7세 아동 대상 음성 AI 독서 서비스(StoryPal)가
사용할 구조화된 JSON 데이터를 생성하는 것입니다.

이 JSON은 이후 세 가지 독립 세션 프롬프트의 입력 데이터로 활용됩니다.
- PRE_READING 세션: book_metadata, pre_reading 필드 사용
- DURING_READING 세션: pages[n] 필드 사용 (페이지 단위로 슬라이싱)
- POST_READING 세션: post_reading, book_metadata.themes 필드 사용

JSON 외의 텍스트는 절대 출력하지 마세요.
```

---

## USER PROMPT

```
아래 PDF를 분석하여 지정된 JSON 스키마에 맞게 데이터를 생성하세요.

[분석 절차 - 반드시 순서대로 수행]

STEP 1. book_metadata 추출
  - title, author, illustrator, narrator(없으면 null), target_age, total_pages
  - themes: 책의 핵심 주제 키워드 최대 3개 (예: ["용돈", "나눔", "우정"])
  - core_values: 책이 전달하는 가치 최대 3개 (예: ["저축의 기쁨", "친구를 위한 배려"])

STEP 2. pre_reading.cover 분석
  - illustration_description: 표지 삽화를 구체적으로 묘사 (등장인물·표정·사물·배경, 2~4문장)
  - distancing_question: 아이의 실제 경험과 연결하는 질문 1개
  - prediction_question: 표지만 보고 내용을 예측하는 개방형 질문 1개
  - tts_intro_script: 음성 AI가 책을 소개하는 낭독 스크립트 (친근한 아이 말투, 2~3문장)

STEP 3. pages 배열 생성 (표지 제외, 본문 페이지만)
  각 페이지마다 다음 항목을 빠짐없이 작성하세요.

  [3-1] page_number: 정수
  [3-2] illustration_description: 삽화 묘사 (등장인물 표정·행동, 배경, 주요 사물, 2~4문장)
  [3-3] text: 해당 페이지 원문 텍스트 (정확히 그대로)
  [3-4] tts_read_script: 낭독용 스크립트
        - 원문 텍스트 기반
        - 강조 단어: [강조]단어[강조]
        - 자연스러운 멈춤 위치: [쉬어가기]
        - 감정 표현 지시어: [밝게], [호기심있게], [놀라며] 등
  [3-5] key_vocabulary: 4~7세가 처음 접할 수 있는 어휘 최대 2개
        각 어휘: word, easy_definition(아이 눈높이 풀이), phonics_play_hint(소리 놀이 힌트)
  [3-6] crowd_questions: CROWD 질문법 기반 질문 2개
        각 질문: question_type(Wh/Recall/Open-ended/Distancing), question
        scaffolding:
          - hint_if_wrong: 틀렸을 때 줄 시각적·언어적 힌트 (정답 직접 알려주지 않기)
          - simplified_version: 예/아니오 또는 객관식으로 쉽게 바꾼 버전
          - deeper_question_if_correct: 맞췄을 때 심화 발전 질문
  [3-7] echo_reading:
        - segments: 의미 단위로 분절한 문장 배열 (슬래시(/) 없이 각 segment를 배열 원소로)
        - praise_script: 아이가 따라 읽은 후 칭찬 멘트 1개 (밝고 구체적으로)

STEP 4. post_reading 생성
  - recall_question: 책 전체 내용 회상 질문 1개
  - emotion_question: 주인공 감정 공감 개방형 질문 1개
  - distancing_question: 아이의 실제 삶과 연결하는 질문 1개
  - closing_praise_script: 오늘 독서 마무리 칭찬 스크립트 (2~3문장, 따뜻하게)

[출력 전 자가 검토 체크리스트]
□ 모든 페이지가 누락 없이 포함되었는가?
□ 각 crowd_question에 scaffolding 3단계가 모두 작성되었는가?
□ tts_read_script에 태그가 자연스럽게 포함되었는가?
□ 모든 텍스트가 4~7세 눈높이의 친근한 말투인가?
□ JSON 문법 오류가 없는가?

[JSON 스키마]

{
  "book_id": "string (파일명 기반, 예: book_2000won)",
  "book_metadata": {
    "title": "string",
    "author": "string",
    "illustrator": "string",
    "narrator": "string | null",
    "target_age": "string",
    "total_pages": "integer",
    "themes": ["string"],
    "core_values": ["string"]
  },
  "pre_reading": {
    "cover": {
      "illustration_description": "string",
      "distancing_question": "string",
      "prediction_question": "string",
      "tts_intro_script": "string"
    }
  },
  "pages": [
    {
      "page_number": "integer",
      "illustration_description": "string",
      "text": "string",
      "tts_read_script": "string",
      "key_vocabulary": [
        {
          "word": "string",
          "easy_definition": "string",
          "phonics_play_hint": "string"
        }
      ],
      "crowd_questions": [
        {
          "question_type": "Wh | Recall | Open-ended | Distancing",
          "question": "string",
          "scaffolding": {
            "hint_if_wrong": "string",
            "simplified_version": "string",
            "deeper_question_if_correct": "string"
          }
        }
      ],
      "echo_reading": {
        "segments": ["string"],
        "praise_script": "string"
      }
    }
  ],
  "post_reading": {
    "recall_question": "string",
    "emotion_question": "string",
    "distancing_question": "string",
    "closing_praise_script": "string"
  }
}

위 체크리스트를 모두 통과한 후 최종 JSON만 출력하세요.
```

---

## 설정 권장값

| 파라미터 | 값 | 이유 |
|---|---|---|
| Temperature | 0.2 | 구조화 출력 정확도 우선 |
| Top-P | 0.95 | 약간의 표현 다양성 허용 |
| Max Tokens | 8000+ | 전체 책 JSON 생성에 충분한 길이 확보 |
| Prompt Caching | System Prompt 캐싱 적용 | 반복 분석 시 비용 절감 |
