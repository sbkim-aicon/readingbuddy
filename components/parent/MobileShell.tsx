"use client";

import { ReactNode } from "react";

export default function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      {/* 데스크톱: 스마트폰 목업 프레임 / 모바일: 전체화면 */}
      <div
        className="
          w-full bg-white relative flex flex-col
          /* 모바일: 전체화면 */
          min-h-screen
          /* 데스크톱: 스마트폰 목업 */
          md:min-h-0 md:w-[390px] md:min-h-[844px] md:max-h-[844px]
          md:rounded-[44px] md:border-[10px] md:border-gray-800
          md:shadow-[0_0_0_2px_#1a1a1a,0_30px_80px_rgba(0,0,0,0.4)]
          md:overflow-hidden
        "
      >
        {/* 노치 (데스크톱 목업에서만 표시) */}
        <div className="hidden md:flex absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-800 rounded-b-2xl z-20 items-center justify-center">
          <div className="w-16 h-1.5 bg-gray-700 rounded-full" />
        </div>

        {/* 콘텐츠 영역 (flex-1로 프레임 전체를 채우고, pt-8로 노치 영역 확보) */}
        <div className="flex-1 flex flex-col min-h-0 pt-8 relative">
          {children}
        </div>
      </div>
    </div>
  );
}
