import Link from 'next/link';
import { CardConfig } from '@/lib/types';
import { Play } from 'lucide-react';

export default function ContentCard({ card }: { card: CardConfig }) {
    // If no cover image, use a colorful gradient placeholder
    const gradientClass = "bg-gradient-to-br from-indigo-400 to-purple-400";

    return (
        <Link href={`/speaker/${card.card_id}`} className="group relative w-full flex flex-col items-center">
            {/* Cover Image Container */}
            <div className={`relative w-full aspect-[2/3] max-w-[240px] rounded-3xl overflow-hidden shadow-sm transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-md bg-white ${!card.cover_image && gradientClass}`}>
                {card.cover_image && (
                    // We use regular img tag here to support placehold.co without next.config.ts setup, 
                    // or Next Image if configured. 
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        src={card.cover_image}
                        alt={card.title}
                        className="w-full h-full object-cover"
                    />
                )}

                {/* Play Button Overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full flex justify-center">
                    <button className="flex items-center gap-1.5 bg-[#FF7F50] hover:bg-[#FF6347] transition-colors text-white px-5 py-1.5 rounded-full shadow-[0_4px_10px_rgba(255,127,80,0.4)] font-medium text-sm border-2 border-white">
                        <Play className="w-4 h-4 fill-white text-white" />
                        Play Audio
                    </button>
                </div>
            </div>

            {/* Text Content Below */}
            <div className="mt-4 text-center px-2">
                <h3 className="font-bold text-[#333333] text-[15px] leading-tight mb-1">{card.title}</h3>
                <p className="text-[#666666] text-sm">{card.subtitle}</p>
            </div>
        </Link>
    );
}
