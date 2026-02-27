import { NextRequest, NextResponse } from "next/server";
import { generateOpenAIChatResponse } from "@/lib/openai-chat";
import fs from "fs/promises";
import path from "path";

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({ status: "analyzer ready - new path" });
}

export async function POST(req: NextRequest) {
    console.log("Analyze Book API hit");
    // Lazy load pdf-parse inside the function to avoid dev server registration issues
    const pdf = require("pdf-parse");
    const PROMPT_PATH = path.join(process.cwd(), "prompts", "read_with_me", "prompt_01_book_analyzer.md");

    try {
        const formData = await req.formData();
        const file = formData.get("pdf") as File | null;
        const bookId = formData.get("book_id") as string | null;

        if (!file || !bookId) {
            return NextResponse.json({ error: "Missing pdf file or book_id" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let extractedText = "";
        try {
            const data = await pdf(buffer);
            extractedText = data.text;
        } catch (parseError) {
            console.error("PDF Parsing Error:", parseError);
            return NextResponse.json({ error: "Failed to parse PDF file" }, { status: 500 });
        }

        if (!extractedText.trim()) {
            return NextResponse.json({ error: "No text could be extracted from the PDF" }, { status: 400 });
        }

        let systemPrompt = "";
        try {
            systemPrompt = await fs.readFile(PROMPT_PATH, "utf8");
        } catch (promptError) {
            console.error("Failed to read system prompt file:", promptError);
            return NextResponse.json({ error: "Internal Configuration Error" }, { status: 500 });
        }

        const userMessage = `다음은 추출된 책 텍스트 원문입니다.\n\n${extractedText}`;
        const aiResponseText = await generateOpenAIChatResponse(systemPrompt, userMessage, [], true);

        let bookData;
        try {
            let jsonString = aiResponseText;
            const jsonMatch = aiResponseText.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
                jsonString = jsonMatch[1];
            }
            bookData = JSON.parse(jsonString);
            bookData.book_id = bookId;
        } catch {
            console.error("Failed to parse JSON response from OpenAI:", aiResponseText);
            return NextResponse.json({ error: "Failed to generate valid JSON format from text" }, { status: 500 });
        }

        const booksDir = path.join(process.cwd(), "public", "data", "books");
        await fs.mkdir(booksDir, { recursive: true });

        const savePath = path.join(booksDir, `${bookId}.json`);
        await fs.writeFile(savePath, JSON.stringify(bookData, null, 2), "utf8");

        return NextResponse.json({
            success: true,
            book_data_path: `data/books/${bookId}.json`,
            book_metadata: bookData.book_metadata
        });

    } catch (error) {
        console.error("Analyze Book API Route Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
    }
}
