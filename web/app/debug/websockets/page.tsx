'use client';

import { WebSocketDebugger } from '@/components/debug/websocket-debugger';

export default function WebSocketDebugPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">WebSocket Debug Console</h1>
        <p className="text-gray-600">
          Monitor real-time WebSocket messages for notifications, insulin logs, and glucose readings.
        </p>
      </div>
      
      <WebSocketDebugger />
      
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">How to Test WebSocket Flow:</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Click "Connect" to establish WebSocket connection</li>
          <li>Click "Send Test Notification" to see a WebSocket message</li>
          <li>Go to <a href="/dashboard/insulin" className="text-blue-600 underline">Insulin page</a> and log a dose</li>
          <li>Watch for real-time messages in the debugger</li>
          <li>Check if database triggers create safety notifications</li>
        </ol>
        
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
          <h3 className="font-medium mb-2">Expected Flow:</h3>
          <p className="text-sm">
            <strong>Log Insulin</strong> → <strong>Database Trigger</strong> → <strong>Notification Created</strong> → <strong>WebSocket Message</strong> → <strong>Real-time Alert</strong>
          </p>
        </div>
      </div>
    </div>
  );
}