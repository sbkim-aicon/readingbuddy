"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, MessageCircle, Settings, Library } from "lucide-react";

const tabs = [
  { href: "/parent/home", label: "홈", icon: Home },
  { href: "/parent/cards", label: "콘텐츠", icon: Library },
  { href: "/parent/reports", label: "리포트", icon: BarChart2 },
  { href: "/parent/talk-guide", label: "대화가이드", icon: MessageCircle },
  { href: "/parent/settings", label: "설정", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="
      sticky bottom-0 left-0 right-0 z-10
      bg-white border-t border-gray-100
      flex items-stretch flex-shrink-0
      pb-5
    ">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`
              flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors
              ${active ? "text-indigo-600" : "text-gray-400"}
            `}
          >
            <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
