import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const VISITOR_KEY = 'chat-visitor-uid';

function getVisitorUid() {
  let uid = localStorage.getItem(VISITOR_KEY);
  if (!uid) {
    uid = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(VISITOR_KEY, uid);
  }
  return uid;
}

export default function ChatWidget() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [config, setConfig] = useState<any>(null);
  const [convoId, setConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load config
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-widget-config?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
        if (!res.ok) { setError('Chat is unavailable'); return; }
        setConfig(await res.json());
      } catch { setError('Chat is unavailable'); }
    })();
  }, [token]);

  // Start session
  useEffect(() => {
    if (!config) return;
    (async () => {
      const { data } = await supabase.functions.invoke('chat-session-start', {
        body: { token, visitor_uid: getVisitorUid() },
      });
      if (data?.conversation_id) {
        setConvoId(data.conversation_id);
        // Inject greeting as system message visually
        setMessages([{ id: 'greet', sender_type: 'system', body: config.brand?.greeting || 'Hello!', created_at: new Date().toISOString() }]);
      }
    })();
  }, [config, token]);

  // Subscribe to messages
  useEffect(() => {
    if (!convoId) return;
    const load = async () => {
      const { data } = await supabase.from('chat_messages').select('*').eq('conversation_id', convoId).order('created_at', { ascending: true });
      if (data) setMessages(prev => {
        const greet = prev.find(m => m.id === 'greet');
        return greet ? [greet, ...data] : data;
      });
    };
    load();
    const channel = supabase
      .channel(`widget-${convoId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${convoId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [convoId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    if (!body.trim() || !convoId) return;
    await supabase.functions.invoke('chat-message-send', {
      body: { token, conversation_id: convoId, body: body.trim() },
    });
    setBody('');
  };

  if (error) return <div className="h-screen flex items-center justify-center text-sm text-muted-foreground">{error}</div>;
  if (!config) return <div className="h-screen flex items-center justify-center text-sm">Loading...</div>;

  const accent = config.brand?.accent_color || '#3B82F6';
  const isWL = config.ownership_mode === 'wl';
  const title = config.brand?.launcher_label || config.display_name || 'Chat';

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="p-3 text-white" style={{ background: accent }}>
        <p className="font-semibold text-sm">{title}</p>
        {!isWL && <p className="text-xs opacity-90">Powered by 24H Virtual</p>}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                m.sender_type === 'visitor' ? 'text-white' : 'bg-muted'
              }`}
              style={m.sender_type === 'visitor' ? { background: accent } : undefined}
            >
              {m.body}
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t flex gap-2">
        <input
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="Type your message..."
          className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2"
          style={{ ['--tw-ring-color' as any]: accent }}
        />
        <button onClick={send} className="px-4 py-2 text-sm text-white rounded-md" style={{ background: accent }}>
          Send
        </button>
      </div>
    </div>
  );
}
