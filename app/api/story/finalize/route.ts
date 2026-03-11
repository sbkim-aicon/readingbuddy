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

        // 3. Split final story into pages (simple split by paragraph/sentences)
        const sentences = final_story.match(/[^.!?]+[.!?]+/g) || [final_story];
        const pages = [];
        let currentPageText = "";
        let pageIndex = 0;

        for (const sentence of sentences) {
            // Group sentences into pages (~2 sentences per page for kids)
            currentPageText += sentence.trim() + " ";
            if (currentPageText.length > 80 || sentence === sentences[sentences.length - 1]) {
                pages.push({
                    page_number: pageIndex + 1,
                    image_url: `/images/books/${imageFileName}`, // same cover image for all pages for now
                    illustration_description: "A page of the story",
                    text: currentPageText.trim(),
                    tts_read_script: currentPageText.trim(),
                    crowd_questions: [
                        {
                            question_type: "completion",
                            question: "이 다음엔 어떤 일이 일어날까요?",
                            scaffolding: {
                                hint_if_wrong: "주인공이 어떻게 할 것 같아요?",
                                simplified_version: "어떤 일이 생길까요?",
                                deeper_question_if_correct: "우와, 정말 그럴 것 같네요! 왜 그렇게 생각했어요?"
                            }
                        }
                    ]
                });
                currentPageText = "";
                pageIndex++;
            }
        }

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
