import { ReactNode } from "react";
import MobileShell from "@/components/parent/MobileShell";
import BottomNav from "@/components/parent/BottomNav";

export const metadata = {
  title: "리딩버디 부모 앱",
  description: "아이의 학습을 한눈에 확인하고 대화를 이어가세요",
};

export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <MobileShell>
      <div className="flex flex-col h-full">
        <main className="flex-1 overflow-y-auto">{children}</main>
        <BottomNav />
      </div>
    </MobileShell>
  );
}
