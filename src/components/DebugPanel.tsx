'use client';

import React from 'react';
import { Terminal, Code } from 'lucide-react';

export interface LogEntry {
    timestamp: string;
    message: string;
    type: 'info' | 'error' | 'success';
}

export default function DebugPanel({ lastJson, logs }: { lastJson: any, logs: LogEntry[] }) {
    return (
        <div className="h-full flex flex-col gap-4 font-mono">
            {/* JSON Viewer */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                    <Code size={14} className="text-gray-500" />
                    <span className="font-semibold text-xs text-gray-600 uppercase tracking-wider">Latest JSON Response</span>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-white relative group">
                    {lastJson ? (
                        <pre className="text-xs text-gray-800 whitespace-pre-wrap break-all">
                            {JSON.stringify(lastJson, null, 2)}
                        </pre>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300">
                            <Code size={48} className="mb-2 opacity-20" />
                            <p className="text-sm">No response data yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* System Logs */}
            <div className="h-1/3 bg-gray-900 rounded-xl overflow-hidden flex flex-col shadow-md text-gray-100">
                <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center gap-2">
                    <Terminal size={14} className="text-gray-400" />
                    <span className="font-semibold text-xs text-gray-400 uppercase tracking-wider">System Logs</span>
                </div>
                <div className="flex-1 overflow-auto p-3 space-y-1.5 font-mono text-xs">
                    {logs.length === 0 && (
                        <div className="text-gray-600 italic px-1">Waiting for events...</div>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className={`flex gap-2 ${log.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                            <span className="opacity-50 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            <span className="break-all">{log.message}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
