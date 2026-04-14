const vscode = require('vscode');

function activate(context) {
    console.log('Gemma 4 Direct Connector is now active!');

    const provider = new Gemma4ChatProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(Gemma4ChatProvider.viewType, provider)
    );
}

class Gemma4ChatProvider {
    static viewType = 'gemma4-chat-view';

    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }

    resolveWebviewView(webviewView, context, token) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Communication bridge
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'showError':
                    vscode.window.showErrorMessage(data.value);
                    break;
                case 'info':
                    vscode.window.showInformationMessage(data.value);
                    break;
            }
        });
    }

    _getHtmlForWebview(webview) {
        // Here we embed the integrated React UI
        // In a production setup, we'd load the bundled JS/CSS
        // For now, we'll use a slightly modified version of our standalone HTML
        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gemma 4 Direct</title>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: sans-serif; background-color: var(--vscode-sideBar-background); color: var(--vscode-foreground); margin: 0; padding: 0; overflow: hidden; height: 100vh; }
        .glass { background: rgba(2, 66, 169, 0.4); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .gradient-text { background: linear-gradient(135deg, #e0b6ff, #00daf3); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .bg-void { background-color: var(--vscode-sideBar-background); }
        @keyframes pulse-cyan { 0%, 100% { opacity: 1; box-shadow: 0 0 5px #00daf3; } 50% { opacity: 0.5; box-shadow: 0 0 2px #00daf3; } }
        .animate-pulse-cyan { animation: pulse-cyan 2s infinite; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState, useEffect, useRef } = React;
        const OLLAMA_BASE_URL = 'http://localhost:11434';
        const vscode = acquireVsCodeApi();

        const App = () => {
            const [messages, setMessages] = useState([{ role: 'assistant', content: '무엇을 도와드릴까요, 큰형님? 사이드바에서 대기 중입니닷! 🫡' }]);
            const [input, setInput] = useState('');
            const [isLoading, setIsLoading] = useState(false);
            const [isConnected, setIsConnected] = useState(false);
            const [isSettingsOpen, setIsSettingsOpen] = useState(false);
            const [settings, setSettings] = useState({
                temperature: 0.8,
                num_predict: 2048,
                top_k: 40,
                top_p: 0.9,
                repeat_penalty: 1.1
            });

            const scrollRef = useRef(null);

            const checkConnection = async () => {
                try {
                    const response = await fetch(\`\${OLLAMA_BASE_URL}/api/tags\`);
                    setIsConnected(response.ok);
                } catch {
                    setIsConnected(false);
                }
            };

            const chatWithGemma = async (chatMessages) => {
                try {
                    const response = await fetch(\`\${OLLAMA_BASE_URL}/api/chat\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: 'gemma4:e2b',
                            messages: chatMessages,
                            options: settings,
                            stream: true,
                        }),
                    });

                    if (!response.ok) throw new Error('Ollama 통신 실패');

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let fullContent = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\\n');
                        for (const line of lines) {
                            if (!line.trim()) continue;
                            try {
                                const json = JSON.parse(line);
                                if (json.message) {
                                    fullContent += json.message.content;
                                    setMessages(prev => {
                                        const updated = [...prev];
                                        updated[updated.length - 1] = { role: 'assistant', content: fullContent };
                                        return updated;
                                    });
                                }
                            } catch (e) {}
                        }
                    }
                    setIsLoading(false);
                } catch (error) {
                    setMessages(prev => {
                        const updated = [...prev];
                        updated[updated.length - 1] = { role: 'assistant', content: '⚠️ Ollama 서버를 확인해 주십시오!' };
                        return updated;
                    });
                    setIsLoading(false);
                    vscode.postMessage({ type: 'showError', value: 'Ollama 서버 연결 실패!' });
                }
            };

            useEffect(() => {
                checkConnection();
                const interval = setInterval(checkConnection, 5000);
                return () => clearInterval(interval);
            }, []);

            useEffect(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, [messages]);

            const handleSend = () => {
                if (!input.trim() || isLoading) return;
                const userMsg = { role: 'user', content: input };
                const nextMessages = [...messages, userMsg];
                setMessages([...nextMessages, { role: 'assistant', content: '' }]);
                setInput('');
                setIsLoading(true);
                chatWithGemma(nextMessages);
            };

            return (
                <div className="flex flex-col h-screen w-full bg-void text-slate-200 overflow-hidden relative">
                    <div className="px-4 py-2 border-b border-white/10 flex justify-between items-center bg-black/20">
                        <div className="flex items-center gap-2">
                            <div className={\`w-1.5 h-1.5 rounded-full \${isConnected ? 'bg-[#00daf3] animate-pulse-cyan' : 'bg-red-500'}\`} />
                            <span className="text-xs font-bold gradient-text uppercase">Gemma 4 Native</span>
                        </div>
                        <button onClick={() => setIsSettingsOpen(true)} className="text-slate-400 hover:text-white transition-colors">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </button>
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={\`flex \${msg.role === 'user' ? 'justify-end' : 'justify-start'}\`}>
                                <div className={\`max-w-[95%] px-3 py-2 rounded-xl text-xs leading-relaxed \${
                                    msg.role === 'user' ? 'bg-slate-700 text-white shadow-md' : 'glass border-l-2 border-[#e0b6ff] text-slate-100 shadow-sm'
                                }\`}>
                                    {msg.content || <div className="flex gap-1 py-1"><div className="w-1 h-1 bg-white/50 rounded-full animate-bounce"></div><div className="w-1 h-1 bg-white/50 rounded-full animate-bounce delay-75"></div><div className="w-1 h-1 bg-white/50 rounded-full animate-bounce delay-150"></div></div>}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 bg-black/20 border-t border-white/5">
                        <div className="relative flex items-center gap-2">
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                placeholder="젬마에게 명령..."
                                className="flex-1 bg-black/10 border border-white/5 rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:border-[#e0b6ff]/50 resize-none min-h-[36px]"
                                rows="1"
                            />
                            <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-2 bg-[#9a4ad9] hover:bg-[#8b5cf6] rounded-lg transition-all shadow-lg">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </div>
                    </div>

                    {/* Settings Modal - Glass Deep Blue */}
                    {isSettingsOpen && (
                        <div className="absolute inset-0 z-50 flex justify-end">
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsSettingsOpen(false)} />
                            <div className="relative w-full h-full bg-[#0242a9]/90 border-l border-white/10 p-4 shadow-2xl overflow-y-auto animate-in slide-in-from-right">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-sm font-bold text-white tracking-wider uppercase font-outfit">Model Options</h2>
                                    <button onClick={() => setIsSettingsOpen(false)} className="text-white/60 hover:text-white">✕</button>
                                </div>
                                <div className="space-y-5">
                                    <div>
                                        <label className="text-[10px] text-white/50 block mb-2 font-bold uppercase">Temperature ({settings.temperature})</label>
                                        <input type="range" min="0" max="1" step="0.1" value={settings.temperature} onChange={e => setSettings({...settings, temperature: parseFloat(e.target.value)})} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#e0b6ff]" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/50 block mb-2 font-bold uppercase">Max Tokens</label>
                                        <input type="number" value={settings.num_predict} onChange={e => setSettings({...settings, num_predict: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-white/50 block mb-1 font-bold">TOP K</label>
                                            <input type="number" value={settings.top_k} onChange={e => setSettings({...settings, top_k: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-white/50 block mb-1 font-bold">TOP P</label>
                                            <input type="number" step="0.1" value={settings.top_p} onChange={e => setSettings({...settings, top_p: parseFloat(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/50 block mb-2 font-bold uppercase">Repeat Penalty</label>
                                        <input type="number" step="0.1" value={settings.repeat_penalty} onChange={e => setSettings({...settings, repeat_penalty: parseFloat(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white" />
                                    </div>
                                </div>
                                <button onClick={() => setIsSettingsOpen(false)} className="mt-8 w-full py-2 bg-white text-[#0242a9] rounded-lg text-xs font-bold hover:bg-slate-100 transition-all shadow-lg font-outfit">APPLY CHANGES</button>
                                <p className="text-[9px] text-white/30 mt-4 text-center leading-tight">Advanced parameters for Ollama API protected by An-Bon</p>
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>`;
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
