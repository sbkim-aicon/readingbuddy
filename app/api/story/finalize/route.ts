import { NextRequest, NextResponse } from "next/server";
import { generateOpenAIImage } from "@/lib/openai-image";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { CardConfig } from "@/lib/types";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { final_story, image_prompt, title } = body;

        if (!final_story || !image_prompt || !title) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Generate Image URL via DALL-E 3
        const imageUrl = await generateOpenAIImage(image_prompt);

        // 2. Fetch image and save it to public/images/books/
        const imageRes = await fetch(imageUrl);
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const storyId = `story_${crypto.randomBytes(4).toString("hex")}`;
        const imageFileName = `${storyId}.png`;
        const imagePath = path.join(process.cwd(), "public", "images", "books", imageFileName);
        
        // Ensure directory exists
        const booksImageDir = path.join(process.cwd(), "public", "images", "books");
        await fs.mkdir(booksImageDir, { recursive: true });
        await fs.writeFile(imagePath, buffer);

        // 3. Use LLM to split story into logical pages and generate rich content
        const splittingSystemPrompt = `
당신은 어린이 동화책 편집자입니다. 제공된 동화 원고를 바탕으로 5~10페이지 분량의 풍부한 그림책 JSON 데이터를 만드세요.
각 페이지는 이야기의 흐름(기승전결)에 따라 논리적으로 나누어야 하며, 아이들이 지루해하지 않도록 페이지당 2~3문장 정도의 분량을 유지하세요.

반드시 아래 JSON 형식을 지켜야 합니다:
{
  "pages": [
    {
      "page_number": number,
      "illustration_description": "이 페이지의 내용을 잘 나타내는 상세한 그림 묘사(DALL-E 프롬프트 기반)",
      "text": "아이에게 들려줄 동화 본문 텍스트",
      "tts_read_script": "텍스트와 동일(또는 약간 더 구어체)",
      "crowd_questions": [
        {
          "question_type": "completion",
          "question": "아이에게 던질 흥미로운 질문",
          "scaffolding": {
            "hint_if_wrong": "힌트",
            "simplified_version": "쉬운 질문",
            "deeper_question_if_correct": "심화 질문"
          }
        }
      ]
    }
  ]
}
`;
        const splittingUserMsg = `제목: ${title}\n\n원고 내용:\n${final_story}`;
        
        const { generateOpenAIChatResponse } = await import("@/lib/openai-chat");
        const llmResponseRaw = await generateOpenAIChatResponse(splittingSystemPrompt, splittingUserMsg, [], true, "gpt-4o");
        const parsedLlmResponse = JSON.parse(llmResponseRaw);
        const pages = parsedLlmResponse.pages.map((p: any) => ({
            ...p,
            image_url: `/images/books/${imageFileName}` // Global cover image for now
        }));

        const bookData = {
            book_metadata: {
                title: title,
                author: "꼬마 작가님 & 지니",
                illustrator: "AI",
                total_pages: pages.length
            },
            pre_reading: {
                cover: {
                    image_url: `/images/books/${imageFileName}`,
                    illustration_description: "동화책 표지",
                    tts_intro_script: "작가님이 만드신 새로운 이야기책이에요! 어떤 재미있는 모험이 기다리고 있을까요? 이야기를 들어볼까요?",
                    prediction_question: "어떤 모험일지 상상해볼까요?"
                }
            },
            pages: pages,
            post_reading: {
                wrap_up: {
                    summary_question: "작가님이 만드신 이야기 정말 멋졌어요! 가장 기억에 남는 장면은 무엇인가요?",
                    closing_statement: "다음에도 저와 함께 멋진 이야기를 또 만들어봐요!"
                }
            }
        };

        const bookJsonPath = path.join(process.cwd(), "public", "data", "books", `${storyId}.json`);
        await fs.mkdir(path.join(process.cwd(), "public", "data", "books"), { recursive: true });
        await fs.writeFile(bookJsonPath, JSON.stringify(bookData, null, 2), "utf8");

        // 4. Update cards.json to append new listen-only read_with_me card
        const cardsFilePath = path.join(process.cwd(), "data", "cards.json");
        const cardsDataStr = await fs.readFile(cardsFilePath, "utf8");
        const cards: CardConfig[] = JSON.parse(cardsDataStr);

        const newCard: CardConfig = {
            card_id: storyId,
            card_type: "read_with_me",
            title: title,
            subtitle: "우리가 함께 만든 동화책",
            cover_image: `/images/books/${imageFileName}`,
            persona_name: "Reading Buddy",
            prompt_file: null,
            book_data_path: `data/books/${storyId}.json`,
            voice_openai: "shimmer",
            temperature: 0.7,
            active: true,
            use_realtime: true, // 듣기/말하기 모드로 구성
            is_listen_only: false, // 상호작용 가능 모드
            sounds: {
                bgm: "sounds/Read%20with%20me_2.mp3",
                bgm_volume: 0.15
            }
        };

        cards.unshift(newCard); // Add to beginning
        await fs.writeFile(cardsFilePath, JSON.stringify(cards, null, 2), "utf8");

        return NextResponse.json({ success: true, new_card_id: storyId });
    } catch (error) {
        console.error("Story Finalize API Error:", error);
        return NextResponse.json({ error: "Failed to finalize story" }, { status: 500 });
    }
}
