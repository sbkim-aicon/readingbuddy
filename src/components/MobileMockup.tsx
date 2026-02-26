import React from 'react';

export default function MobileMockup({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative w-[360px] h-[780px] bg-[#b2c7da] rounded-[3rem] shadow-2xl overflow-hidden border-[10px] border-gray-900 ring-1 ring-gray-900/10">
            {/* Notch / Status Bar Mock */}
            <div className="absolute top-0 w-full h-8 bg-transparent z-20 flex justify-between px-6 items-center">
                <span className="text-gray-900 text-xs font-bold ml-4">9:41</span>
                <div className="flex gap-1.5 mr-4">
                    {/* Signal */}
                    <div className="flex gap-[2px] items-end h-3">
                        <div className="w-[3px] h-[4px] bg-gray-900 rounded-[1px]"></div>
                        <div className="w-[3px] h-[6px] bg-gray-900 rounded-[1px]"></div>
                        <div className="w-[3px] h-[8px] bg-gray-900 rounded-[1px]"></div>
                        <div className="w-[3px] h-[10px] bg-gray-900 rounded-[1px]"></div>
                    </div>
                    {/* Battery */}
                    <div className="w-5 h-3 border border-gray-900 rounded-[3px] relative">
                        <div className="absolute top-0.5 left-0.5 w-3 h-1.5 bg-gray-900 rounded-[1px]"></div>
                    </div>
                </div>
            </div>

            {/* Dynamic Island / Notch Placeholder */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-7 bg-black rounded-full z-30"></div>

            {/* Content */}
            <div className="w-full h-full pt-10 pb-6 bg-transparent overflow-hidden flex flex-col">
                {children}
            </div>

            {/* Home Indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-1.5 bg-gray-900 rounded-full z-20 opacity-20"></div>
        </div>
    );
}
