import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const getFilePath = () => path.join(process.cwd(), "data", "cards.json");

export async function GET() {
    try {
        const data = await fs.readFile(getFilePath(), "utf8");
        return NextResponse.json(JSON.parse(data));
    } catch {
        return NextResponse.json({ error: "Failed to read cards" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        await fs.writeFile(getFilePath(), JSON.stringify(body, null, 2), "utf8");
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to save cards" }, { status: 500 });
    }
}
