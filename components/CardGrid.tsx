import ContentCard from "./ContentCard";
import { CardConfig } from "@/lib/types";

export default function CardGrid({ cards }: { cards: CardConfig[] }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12">
            {cards.map((card) => (
                <ContentCard key={card.card_id} card={card} />
            ))}
        </div>
    );
}
