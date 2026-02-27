import CardGrid from "@/components/CardGrid";
import fs from "fs/promises";
import path from "path";
import { CardConfig } from "@/lib/types";

export default async function Home() {
  const cardsFilePath = path.join(process.cwd(), "data", "cards.json");
  const cardsData = await fs.readFile(cardsFilePath, "utf8");
  const cards: CardConfig[] = JSON.parse(cardsData);

  return (
    <main className="min-h-screen bg-[#F4F6F8] p-6 sm:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 flex flex-col items-center md:flex-row md:justify-between text-center md:text-left">
          <div>
            <h1 className="text-3xl font-extrabold text-[#333333] tracking-tight">Reading Buddy</h1>
            <p className="text-lg text-[#666666] mt-1">Tap your Card!</p>
          </div>
          <div className="mt-4 md:mt-0 items-center justify-center flex">
            <a href="/admin" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors">
              ⚙ 관리 (Admin)
            </a>
          </div>
        </header>

        <CardGrid cards={cards.filter(c => c.active)} />
      </div>
    </main>
  );
}
