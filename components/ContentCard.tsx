"use client";

import Link from 'next/link';
import { CardConfig } from '@/lib/types';
import { Play, Download } from 'lucide-react';

// Extract bg/fg colors from a placehold.co URL so we can render Korean text via CSS.
function parsePlaceholdUrl(url: string): { bg: string; fg: string } | null {
    const match = url.match(/placehold\.co\/\d+x\d+\/([A-Fa-f0-9]+)\/([A-Fa-f0-9]+)/);
    if (!match) return null;
    return { bg: `#${match[1]}`, fg: `#${match[2]}` };
}

export default function ContentCard({ card }: { card: CardConfig }) {
    // If no cover image, use a colorful gradient placeholder
    const gradientClass = "bg-gradient-to-br from-indigo-400 to-purple-400";
    
    const isGeneratedStory = card.card_id.startsWith("story_") && card.cover_image;

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!card.cover_image) return;
        
        try {
            const response = await fetch(card.cover_image);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${card.title || 'story_cover'}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to download image", err);
        }
    };

    const placeholdColors = card.cover_image ? parsePlaceholdUrl(card.cover_image) : null;

    return (
        <Link href={`/speaker/${card.card_id}`} className="group relative w-full flex flex-col items-center">
            {/* Cover Image Container */}
            <div className={`relative w-full aspect-[2/3] max-w-[240px] rounded-3xl overflow-hidden shadow-sm transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-md bg-white ${!card.cover_image && gradientClass}`}>
                {card.cover_image && (
                    placeholdColors ? (
                        // CSS placeholder — renders Korean text correctly (placehold.co doesn't support Korean fonts)
                        <div
                            className="w-full h-full flex items-center justify-center p-6 text-center"
                            style={{ backgroundColor: placeholdColors.bg, color: placeholdColors.fg }}
                        >
                            <span className="font-bold text-xl leading-snug break-keep">{card.title}</span>
                        </div>
                    ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={card.cover_image}
                            alt={card.title}
                            className="w-full h-full object-cover"
                        />
                    )
                )}

                {/* Play Button Overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full flex justify-center">
                    <button className="flex items-center gap-1.5 bg-[#FF7F50] hover:bg-[#FF6347] transition-colors text-white px-5 py-1.5 rounded-full shadow-[0_4px_10px_rgba(255,127,80,0.4)] font-medium text-sm border-2 border-white">
                        <Play className="w-4 h-4 fill-white text-white" />
                        Play Audio
                    </button>
                </div>
                
                {/* Download Button Overlay for Generated Stories */}
                {isGeneratedStory && (
                    <button 
                        onClick={handleDownload}
                        title="표지 색칠공부 다운로드"
                        className="absolute top-3 right-3 bg-white/80 hover:bg-white backdrop-blur-sm p-2 rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Download className="w-4 h-4 text-gray-700" />
                    </button>
                )}
            </div>

            {/* Text Content Below */}
            <div className="mt-4 text-center px-2">
                <h3 className="font-bold text-[#333333] text-[15px] leading-tight mb-1">{card.title}</h3>
                <p className="text-[#666666] text-sm">{card.subtitle}</p>
            </div>
        </Link>
    );
}
