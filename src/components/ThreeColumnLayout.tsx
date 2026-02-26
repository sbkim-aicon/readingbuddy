import React from 'react';

interface ThreeColumnLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftPanelHeaderAction?: React.ReactNode;
}

export default function ThreeColumnLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  leftPanelHeaderAction,
}: ThreeColumnLayoutProps) {
  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden font-sans">
      {/* Left Panel: Prompt Editor & Config */}
      <div className="w-[30%] min-w-[350px] border-r border-gray-200 bg-white flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Prompt Config</h2>
          {leftPanelHeaderAction}
        </div>
        <div className="flex-1 overflow-auto">
          {leftPanel}
        </div>
      </div>

      {/* Center Panel: JSON Output & Debugging */}
      <div className="w-[35%] min-w-[350px] border-r border-gray-200 bg-gray-50 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-800">Debug & Logs</h2>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {centerPanel}
        </div>
      </div>

      {/* Right Panel: Mobile Mockup */}
      <div className="flex-1 min-w-[350px] bg-gray-100 flex items-center justify-center p-8 bg-dot-pattern">
        {rightPanel}
      </div>
    </div>
  );
}
