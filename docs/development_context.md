# Development Context & Status

## 1. Project Overview
**Name**: aitutor-mock
**Goal**: A Korean language tutoring application for Vietnamese students, featuring AI-driven roleplay, photo description, and free talk modes.
**Current State**: Prototype/MVP phase.

## 2. Technology Stack
- **Framework**: Next.js 16.1.6 (App Router)
- **UI Library**: React 19.2.3
- **Styling**: Tailwind CSS 4, Lucide React
- **AI/ML**: OpenAI API (GPT-4o-mini used in prompts)
- **Avatar/Streaming**: 
    - `@heygen/liveavatar-web-sdk`
    - `@heygen/streaming-avatar`
    - `livekit-client`
- **State Management**: React `useState` (Local component state)

## 3. Key Features & Modes
The application uses a **Three-Column Layout**:
1.  **Left**: Prompt Editor (Configurable system prompts & variables)
2.  **Center**: Debug Panel (JSON responses, Logs)
3.  **Right**: Mobile Mockup (Interactive Chat/Avatar UI)

### Modes (`src/app/page.tsx`)
1.  **Roleplay (AI 대화)**
    - Scenario-based learning (e.g., ordering at a bakery).
    - Mission system (e.g., "Order strawberry cake").
    - AI acts as a specific character (Owner, Clerk).
2.  **Photo Description (AI 대화)**
    - "Friend" persona discussing a photo.
    - Focus on vocabulary and description.
3.  **Free Talk (AI 대화)**
    - Casual conversation with a Tutor persona.
    - Error correction and feedback.
4.  **Wrap Up (본학습)**
    - **Live Avatar Interface**.
    - Teacher persona reviewing the session.
    - Voice/Video interaction capabilities.

## 4. Current Architecture
- **Entry Point**: `src/app/page.tsx` manages global state (`messages`, `config`, `logs`, `currentMode`).
- **Server Actions**:
    - `actions.ts`: Main chat logic.
    - `actions_prompt.ts`: Prompt configuration management.
    - `actions_log.ts`: Logging to filesystem/DB.
    - `actions_tts.ts`: Text-to-Speech generation.
    - `actions_heygen.ts`: HeyGen avatar session management.
- **Data Flow**: User Input -> `handleSendMessage` -> Server Action (OpenAI) -> JSON Response -> Update State -> TTS/Avatar (optional).

## 5. Known Issues / To-Dos
- **Prototype Status**: Currently running as a mock/dev environment.
- **State Persistence**: Relies heavily on local state; long-term session storage needs verification.
- **Error Handling**: Basic try-catch blocks in place; needs robust error recovery for API failures.
- **Avatar Integration**: "Wrap Up" mode uses a distinct `LiveAvatarInterface`, separate from the text-based `ChatInterface`.

## 6. Reference Documentation
- `Build Any App The Technical Co-Foun.md`: Guiding principles for the development process.
