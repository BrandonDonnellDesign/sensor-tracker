'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Play, Square, Trash2 } from 'lucide-react';

interface WebSocketMessage {
  id: string;
  timestamp: Date;
  event: string;
  table: string;
  payload: any;
}

export function WebSocketDebugger() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [channel, setChannel] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');

  const connectWebSocket = () => {
    if (!user || channel) return;

    const supabase = createClient();
    
    console.log('🔌 Connecting to WebSocket for user:', user.id);
    
    const newChannel = supabase
      .channel('debug-notifications')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📨 WebSocket message received:', payload);
          
          const message: WebSocketMessage = {
            id: Date.now().toString(),
            timestamp: new Date(),
            event: payload.eventType || 'unknown',
            table: 'notifications',
            payload: payload
          };
          
          setMessages(prev => [message, ...prev.slice(0, 49)]); // Keep last 50 messages
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'insulin_logs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('💉 Insulin log change:', payload);
          
          const message: WebSocketMessage = {
            id: Date.now().toString() + '-insulin',
            timestamp: new Date(),
            event: payload.eventType || 'unknown',
            table: 'insulin_logs',
            payload: payload
          };
          
          setMessages(prev => [message, ...prev.slice(0, 49)]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'glucose_readings', 
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🩸 Glucose reading change:', payload);
          
          const message: WebSocketMessage = {
            id: Date.now().toString() + '-glucose',
            timestamp: new Date(),
            event: payload.eventType || 'unknown', 
            table: 'glucose_readings',
            payload: payload
          };
          
          setMessages(prev => [message, ...prev.slice(0, 49)]);
        }
      )
      .subscribe((status) => {
        console.log('🔌 WebSocket status changed:', status);
        setConnectionStatus(status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    setChannel(newChannel);
  };

  const disconnectWebSocket = () => {
    if (channel) {
      console.log('🔌 Disconnecting WebSocket');
      const supabase = createClient();
      supabase.removeChannel(channel);
      setChannel(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const testNotification = async () => {
    if (!user) return;
    
    try {
      console.log('🧪 Creating test notification...');
      
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: '🧪 Test WebSocket Notification',
          message: `Test message sent at ${new Date().toLocaleTimeString()}`,
          type: 'test',
          status: 'pending',
          delivery_status: 'pending'
          // read, retry_count, created_at, updated_at will use defaults
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create test notification:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        alert(`Failed to create notification: ${error.message || 'Unknown error'}`);
      } else {
        console.log('✅ Test notification created:', data);
        alert('✅ Test notification created successfully! Check the WebSocket messages below.');
      }
    } catch (error) {
      console.error('❌ Test notification error:', error);
    }
  };

  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, []);

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">Please log in to use WebSocket debugger</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            WebSocket Debugger
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {connectionStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {!isConnected ? (
              <Button onClick={connectWebSocket} className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Connect
              </Button>
            ) : (
              <Button onClick={disconnectWebSocket} variant="destructive" className="flex items-center gap-2">
                <Square className="w-4 h-4" />
                Disconnect
              </Button>
            )}
            
            <Button onClick={testNotification} disabled={!isConnected} variant="outline">
              Send Test Notification
            </Button>
            
            <Button onClick={clearMessages} variant="outline" className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Clear Messages
            </Button>
          </div>
          
          <div className="text-sm text-gray-600">
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Listening to:</strong> notifications, insulin_logs, glucose_readings</p>
            <p><strong>Messages received:</strong> {messages.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Message Log */}
      <Card>
        <CardHeader>
          <CardTitle>WebSocket Messages ({messages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No messages yet. Connect and trigger some database changes!
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          message.event === 'INSERT' ? 'default' :
                          message.event === 'UPDATE' ? 'secondary' :
                          message.event === 'DELETE' ? 'destructive' : 'outline'
                        }
                      >
                        {message.event}
                      </Badge>
                      <Badge variant="outline">{message.table}</Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="text-sm">
                    {message.table === 'notifications' && message.payload.new && (
                      <div>
                        <p><strong>Title:</strong> {message.payload.new.title}</p>
                        <p><strong>Message:</strong> {message.payload.new.message}</p>
                        <p><strong>Type:</strong> {message.payload.new.type}</p>
                      </div>
                    )}
                    
                    {message.table === 'insulin_logs' && message.payload.new && (
                      <div>
                        <p><strong>Amount:</strong> {message.payload.new.units} units</p>
                        <p><strong>Type:</strong> {message.payload.new.insulin_type}</p>
                        <p><strong>Time:</strong> {new Date(message.payload.new.taken_at).toLocaleString()}</p>
                      </div>
                    )}
                    
                    {message.table === 'glucose_readings' && message.payload.new && (
                      <div>
                        <p><strong>Value:</strong> {message.payload.new.value} mg/dL</p>
                        <p><strong>Time:</strong> {new Date(message.payload.new.system_time).toLocaleString()}</p>
                        <p><strong>Trend:</strong> {message.payload.new.trend || 'N/A'}</p>
                      </div>
                    )}
                  </div>
                  
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">Raw payload</summary>
                    <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(message.payload, null, 2)}
                    </pre>
                  </details>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}