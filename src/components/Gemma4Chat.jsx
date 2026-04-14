import React, { useState, useEffect, useRef } from 'react';
import { chatWithGemma, checkOllamaConnection } from '../api/ollama';
import Gemma4Settings from './Gemma4Settings';

const Gemma4Chat = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '무엇을 도와드릴까요, 큰형님? 젬마 4가 대기 중입니다! 🫡' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    temperature: 0.7,
    top_k: 40,
    num_predict: 2048
  });

  const scrollRef = useRef(null);

  useEffect(() => {
    const checkConnection = async () => {
      const connected = await checkOllamaConnection();
      setIsConnected(connected);
    };
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      let assistantContent = '';
      const assistantMessage = { role: 'assistant', content: '' };
      setMessages([...newMessages, assistantMessage]);

      await chatWithGemma(newMessages, settings, (chunk, done) => {
        assistantContent += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
          return updated;
        });
        if (done) setIsLoading(false);
      });
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '⚠️ 로컬 Ollama 서버에 연결할 수 없습니다. 서버가 켜져 있는지 확인해 주십시오!' }
      ]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col glass relative overflow-hidden h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-glass-border flex justify-between items-center bg-bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent-cyan shadow-[0_0_8px_#06b6d4]' : 'bg-red-500'} animate-pulse`} />
          <h1 className="text-lg font-bold gradient-text">Gemma 4 Direct</h1>
          <span className="text-xs text-text-dim px-2 py-0.5 rounded-full bg-bg-secondary border border-glass-border">
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-text-dim hover:text-text-main"
        >
          ⚙️
        </button>
      </div>

      {/* Chat History */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed
              ${msg.role === 'user' 
                ? 'bg-bg-secondary border border-glass-border text-white rounded-tr-none shadow-sm' 
                : 'glass border-l-2 border-l-accent-purple text-text-main rounded-tl-none animate-in fade-in slide-in-from-left-2 duration-300'
              }
            `}>
              {msg.content || (
                <div className="flex gap-1 py-1">
                  <div className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-accent-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input Tray */}
      <div className="p-6 bg-bg-secondary/20 border-t border-glass-border">
        <div className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="젬마에게 명령을 내리십시오..."
            className="w-full bg-bg-secondary/50 border border-glass-border rounded-xl px-4 py-3 pr-16 
                       text-sm focus:outline-none focus:border-accent-purple transition-all resize-none
                       min-h-[50px] max-h-[150px]"
            rows="1"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-3 bottom-3 p-2 bg-accent-purple hover:bg-accent-purple/80 
                       disabled:opacity-50 disabled:hover:bg-accent-purple rounded-lg transition-all
                       text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z"/>
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-text-dim mt-3 text-center">
          Ctrl + Enter로 전송 | Local Gemma 4 Engine Protected by An-Bon
        </p>
      </div>

      {/* Settings Modal */}
      <Gemma4Settings 
        settings={settings}
        setSettings={setSettings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default Gemma4Chat;
