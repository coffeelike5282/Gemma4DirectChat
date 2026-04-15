const vscode = require('vscode');

function activate(context) {
    console.log('Gemma 4 Direct Connector is active!');
    const provider = new Gemma4ChatProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(Gemma4ChatProvider.viewType, provider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
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
        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'showError':
                    vscode.window.showErrorMessage(data.value);
                    break;
                case 'info':
                    vscode.window.showInformationMessage(data.value);
                    break;
                case 'listFiles':
                    try {
                        const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 100);
                        const list = files.map(f => vscode.workspace.asRelativePath(f));
                        webviewView.webview.postMessage({ type: 'toolResponse', callId: data.callId, value: list.join('\n') });
                    } catch (err) {
                        webviewView.webview.postMessage({ type: 'toolResponse', callId: data.callId, error: err.message });
                    }
                    break;
                case 'readFile':
                    try {
                        const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.path);
                        const content = await vscode.workspace.fs.readFile(uri);
                        const text = Buffer.from(content).toString('utf8');
                        // Apply An-Bon's safety rule: Sample large files
                        const sampling = text.length > 5000 ? text.substring(0, 5000) + '\n... (이하 박 사장님 안전 수칙에 따라 생략됨)' : text;
                        webviewView.webview.postMessage({ type: 'toolResponse', callId: data.callId, value: sampling });
                    } catch (err) {
                        webviewView.webview.postMessage({ type: 'toolResponse', callId: data.callId, error: err.message });
                    }
                    break;
                case 'writeFile':
                    try {
                        const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.path);
                        const dir = vscode.Uri.joinPath(uri, '..');
                        await vscode.workspace.fs.createDirectory(dir);
                        await vscode.workspace.fs.writeFile(uri, Buffer.from(data.content, 'utf8'));
                        webviewView.webview.postMessage({ type: 'toolResponse', callId: data.callId, value: '성공적으로 저장되었습니다: ' + data.path });
                    } catch (err) {
                        webviewView.webview.postMessage({ type: 'toolResponse', callId: data.callId, error: err.message });
                    }
                    break;
                case 'copyFile':
                    try {
                        const source = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.source);
                        const target = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.target);
                        await vscode.workspace.fs.copy(source, target, { overwrite: true });
                        webviewView.webview.postMessage({ type: 'toolResponse', callId: data.callId, value: '복사 완료: ' + data.source + ' -> ' + data.target });
                    } catch (err) {
                        webviewView.webview.postMessage({ type: 'toolResponse', callId: data.callId, error: err.message });
                    }
                    break;
                case 'moveFile':
                    try {
                        const source = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.source);
                        const target = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.target);
                        await vscode.workspace.fs.rename(source, target, { overwrite: true });
                        webviewView.webview.postMessage({ type: 'toolResponse', callId: data.callId, value: '이름 변경/이동 완료: ' + data.source + ' -> ' + data.target });
                    } catch (err) {
                        webviewView.webview.postMessage({ type: 'toolResponse', callId: data.callId, error: err.message });
                    }
                    break;
                case 'createDirectory':
                    try {
                        const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, data.path);
                        await vscode.workspace.fs.createDirectory(uri);
                        webviewView.webview.postMessage({ type: 'toolResponse', callId: data.callId, value: '폴더 생성 완료: ' + data.path });
                    } catch (err) {
                        webviewView.webview.postMessage({ type: 'toolResponse', callId: data.callId, error: err.message });
                    }
                    break;
                case 'resetChat':
                    const result = await vscode.window.showInformationMessage('큰형님, 대화 내용을 초기화하고 쌔삥하게 시작할까요?', '당연하지!', '아니, 참아');
                    if (result === '당연하지!') {
                        webviewView.webview.postMessage({ type: 'clearChat' });
                    }
                    break;
            }
        });
    }

    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gemma 4 Direct</title>
    <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data:; style-src * 'unsafe-inline';">
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --accent-purple: #8b5cf6;
            --accent-cyan: #06b6d4;
            --text-main: #f1f5f9;
            --text-dim: #94a3b8;
            --glass-bg: rgba(30, 41, 59, 0.7);
            --glass-border: rgba(255, 255, 255, 0.1);
        }
        body { 
            font-family: 'Inter', -apple-system, sans-serif; 
            background-color: var(--vscode-sideBar-background); 
            color: var(--vscode-foreground); 
            margin: 0; padding: 0; overflow: hidden; height: 100vh; 
        }
        .font-outfit { font-family: 'Outfit', sans-serif; }
        .glass { 
            background: var(--glass-bg);
            backdrop-filter: blur(12px); 
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid var(--glass-border);
        }
        .gradient-text { 
            background: linear-gradient(135deg, var(--accent-purple), var(--accent-cyan)); 
            -webkit-background-clip: text; 
            -webkit-text-fill-color: transparent; 
        }
        .message-in { animation: slideIn 0.3s ease-out forwards; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.3); border-radius: 10px; }
        .bg-void { background-color: var(--vscode-sideBar-background); }
        
        /* Layout Utilities matching src/index.css */
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes pulse-cyan { 0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--accent-cyan); } 50% { opacity: 0.5; box-shadow: 0 0 2px var(--accent-cyan); } }
        .animate-bounce { animation: bounce 0.6s infinite; }
        .animate-pulse-cyan { animation: pulse-cyan 2s infinite; }
    </style>
</head>
<body>
    <div id="root">
        <div class="flex items-center justify-center h-screen bg-void text-slate-400 text-sm">
            <div class="flex flex-col items-center gap-3">
                <div class="w-8 h-8 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin"></div>
                <span class="animate-pulse">Gemma Engine Warming Up...</span>
            </div>
        </div>
    </div>
    <script type="text/babel">
        try {
            const { useState, useEffect, useRef } = React;
            const OLLAMA_BASE_URL = 'http://localhost:11434';
            const vscode = acquireVsCodeApi();
            const INITIAL_MESSAGES = [
                { role: 'assistant', content: '무엇을 도와드릴까요, 큰형님? 안티그래비티 젬마 4가 대기 중입니다! 🫡' }
            ];

            const App = () => {
                const savedState = vscode.getState() || {};
                const [messages, setMessages] = useState(savedState.messages || INITIAL_MESSAGES);
                const [input, setInput] = useState(savedState.input || '');
                const [isLoading, setIsLoading] = useState(false);
                const [isConnected, setIsConnected] = useState(false);
                const [isSettingsOpen, setIsSettingsOpen] = useState(false);
                const [settings, setSettings] = useState(savedState.settings || {
                    temperature: 0.7,
                    num_predict: 2048,
                    top_k: 40,
                    top_p: 0.9,
                    repeat_penalty: 1.1
                });

                useEffect(() => {
                    vscode.setState({ messages, input, settings });
                }, [messages, input, settings]);

                const abortControllerRef = useRef(null);
                const scrollRef = useRef(null);

                useEffect(() => {
                    if (scrollRef.current) {
                        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    }
                }, [messages]);

                const handleNewChat = () => {
                    vscode.postMessage({ type: 'resetChat' });
                };

                useEffect(() => {
                    const handleMessage = (event) => {
                        const message = event.data;
                        if (message.type === 'clearChat') {
                            setMessages(INITIAL_MESSAGES);
                            setInput('');
                            vscode.setState({ messages: INITIAL_MESSAGES, input: '', settings });
                        }
                    };
                    window.addEventListener('message', handleMessage);
                    return () => window.removeEventListener('message', handleMessage);
                }, [settings]);

                const checkConnection = async () => {
                    try {
                        const response = await fetch(\`\${OLLAMA_BASE_URL}/api/tags\`);
                        setIsConnected(response.ok);
                    } catch {
                        setIsConnected(false);
                    }
                };

                const chatWithGemma = async (chatMessages) => {
                    let currentFullContent = '';
                    setIsLoading(true);
                    abortControllerRef.current = new AbortController();

                    try {
                        const response = await fetch(\`\${OLLAMA_BASE_URL}/api/chat\`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            signal: abortControllerRef.current.signal,
                            body: JSON.stringify({
                                model: 'gemma4:e2b',
                                messages: chatMessages,
                                options: settings,
                                tools: [
                                    { type: 'function', function: { name: 'list_files', description: '워크스페이스 파일 목록 조회' } },
                                    { type: 'function', function: { name: 'read_file', description: '파일 내용 읽기 (텍스트)', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
                                    { type: 'function', function: { name: 'write_file', description: '파일 쓰기/생성', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } } },
                                    { type: 'function', function: { name: 'copy_file', description: '파일 복사', parameters: { type: 'object', properties: { source: { type: 'string' }, target: { type: 'string' } }, required: ['source', 'target'] } } },
                                    { type: 'function', function: { name: 'move_file', description: '파일 이동/이름 변경', parameters: { type: 'object', properties: { source: { type: 'string' }, target: { type: 'string' } }, required: ['source', 'target'] } } },
                                    { type: 'function', function: { name: 'create_directory', description: '폴더 생성', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } }
                                ],
                                stream: true,
                            }),
                        });

                        if (!response.ok) throw new Error('Ollama connection failed');

                        const reader = response.body.getReader();
                        const decoder = new TextDecoder();

                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            const chunk = decoder.decode(value, { stream: true });
                            const lines = chunk.split('\\n');
                            
                            for (const line of lines) {
                                if (!line.trim()) continue;
                                const data = JSON.parse(line);
                                
                                if (data.message) {
                                    if (data.message.content) {
                                        currentFullContent += data.message.content;
                                        setMessages(prev => {
                                            const updated = [...prev];
                                            updated[updated.length - 1] = { role: 'assistant', content: currentFullContent };
                                            return updated;
                                        });
                                    }
                                    
                                    if (data.message.tool_calls) {
                                        for (const call of data.message.tool_calls) {
                                            const toolName = call.function.name;
                                            const args = call.function.arguments;
                                            const callId = Math.random().toString(36).substring(7);
                                            
                                            // Bridge to VS Code
                                            let actionType = toolName.replace('_', '');
                                            if (actionType === 'listfiles') actionType = 'listFiles';
                                            if (actionType === 'readfile') actionType = 'readFile';
                                            if (actionType === 'writefile') actionType = 'writeFile';
                                            if (actionType === 'copyfile') actionType = 'copyFile';
                                            if (actionType === 'movefile') actionType = 'moveFile';
                                            if (actionType === 'createdirectory') actionType = 'createDirectory';

                                            vscode.postMessage({ type: actionType, callId, ...args });

                                            // Wait for response (simplified for visual feedback)
                                            currentFullContent += \`\\n> 도구 실행 중: \${toolName}...\\n\`;
                                            setMessages(prev => {
                                                const updated = [...prev];
                                                updated[updated.length - 1] = { role: 'assistant', content: currentFullContent };
                                                return updated;
                                            });
                                        }
                                    }
                                }
                            }
                        }
                        setIsLoading(false);
                    } catch (error) {
                        if (error.name === 'AbortError') return;
                        setMessages(prev => [...prev.slice(0,-1), { role: 'assistant', content: '⚠️ 오류 발생: ' + error.message }]);
                        setIsLoading(false);
                    }
                };

                useEffect(() => {
                    checkConnection();
                    const interval = setInterval(checkConnection, 5000);
                    return () => clearInterval(interval);
                }, []);

                const handleSend = () => {
                    if (!input.trim() || isLoading) return;
                    const nextMessages = [...messages, { role: 'user', content: input }];
                    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
                    setInput('');
                    chatWithGemma(nextMessages);
                };

                return (
                    <div className="flex flex-col h-screen w-full bg-void text-slate-200 overflow-hidden relative font-outfit">
                        {/* Header - Slimmed */}
                        <div className="px-4 py-2 border-b border-white/10 flex justify-between items-center glass">
                            <div className="flex items-center gap-2">
                                <div className={\`w-1.5 h-1.5 rounded-full \${isConnected ? 'bg-cyan-400 animate-pulse-cyan' : 'bg-red-500 shadow-[0_0_8px_red]'}\`} />
                                <h1 className="text-sm font-bold gradient-text tracking-tight">Gemma 4</h1>
                                <span className="text-[7px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-slate-400 uppercase tracking-widest font-black opacity-60">
                                    {isConnected ? 'LIVE' : 'OFFLINE'}
                                </span>
                            </div>
                            <div className="flex gap-1.5">
                                <button onClick={handleNewChat} title="대화 초기화" className="p-1.25 bg-white/5 border border-white/10 rounded-md hover:bg-white/10 transition-all active:scale-95">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"></path></svg>
                                </button>
                                <button onClick={() => setIsSettingsOpen(true)} className="p-1.25 bg-white/5 border border-white/10 rounded-md hover:bg-white/10 transition-all active:scale-95 text-[10px]">⚙️</button>
                            </div>
                        </div>

                        {/* Chat Messages - Slimmed spacing */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-4 font-sans">
                            {messages.map((msg, i) => (
                                <div key={i} className={\`flex \${msg.role === 'user' ? 'justify-end' : 'justify-start'} message-in\`}>
                                    <div className={\`max-w-[92%] px-3 py-2 rounded-xl text-[11px] leading-relaxed shadow-lg \${
                                        msg.role === 'user' 
                                            ? 'bg-slate-800 border border-white/10 text-white rounded-tr-none' 
                                            : 'glass border-l-2 border-[#8b5cf6] text-slate-200 rounded-tl-none'
                                    }\`}>
                                        <div className="font-black opacity-30 text-[7px] mb-1 uppercase tracking-widest flex items-center gap-1">
                                            {msg.role === 'user' ? '👤 Brother' : '🤖 Gemma 4'}
                                        </div>
                                        <div className="whitespace-pre-wrap">
                                            {msg.content || (isLoading && i === messages.length - 1 ? (
                                                <div className="flex gap-1 py-1">
                                                    <div className="w-1 h-1 bg-accent-purple rounded-full animate-bounce"></div>
                                                    <div className="w-1 h-1 bg-accent-purple rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></div>
                                                    <div className="w-1 h-1 bg-accent-purple rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div>
                                                </div>
                                            ) : '')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area - 3 lines fixed */}
                        <div className="p-3 bg-black/40 border-t border-white/5 backdrop-blur-2xl">
                            <div className="relative flex items-end gap-2">
                                <textarea
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="무엇을 도와드릴까요, 큰형님?"
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:border-accent-purple/40 transition-all resize-none h-[68px] placeholder-slate-600 text-white leading-normal"
                                    onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                />
                                <button onClick={handleSend} disabled={isLoading || !input.trim()} className="w-9 h-9 flex items-center justify-center bg-gradient-to-tr from-[#8b5cf6] to-[#06b6d4] hover:brightness-110 rounded-xl transition-all active:scale-95 shadow-lg disabled:opacity-20 shrink-0">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                </button>
                            </div>
                            <p className="text-[8px] text-slate-500 mt-2 text-center uppercase tracking-[0.2em] opacity-30 font-bold">Local Engine • Protected by An-Bon</p>
                        </div>

                        {/* Settings Panel - Narrowed */}
                        {isSettingsOpen && (
                            <div className="absolute inset-0 z-50 flex justify-end">
                                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
                                <div className="relative w-56 h-full glass p-5 shadow-2xl animate-in slide-in-from-right duration-300">
                                    <h2 className="text-sm font-bold gradient-text mb-6">Config</h2>
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between mb-1.5">
                                                <label className="text-[9px] text-slate-400 font-bold uppercase">Temp</label>
                                                <span className="text-[9px] text-accent-cyan font-mono">{settings.temperature}</span>
                                            </div>
                                            <input type="range" min="0" max="1" step="0.1" value={settings.temperature} onChange={e => setSettings({...settings, temperature: parseFloat(e.target.value)})} className="w-full accent-accent-purple h-1.5 rounded-lg appearance-none bg-white/10" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-slate-400 font-bold uppercase mb-1.5 block">Max Tokens</label>
                                            <input type="number" value={settings.num_predict} onChange={e => setSettings({...settings, num_predict: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-accent-cyan" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1.5">
                                                <label className="text-[9px] text-slate-400 font-bold uppercase">Penalty</label>
                                                <span className="text-[9px] text-accent-cyan font-mono">{settings.repeat_penalty}</span>
                                            </div>
                                            <input type="range" min="1" max="2" step="0.1" value={settings.repeat_penalty} onChange={e => setSettings({...settings, repeat_penalty: parseFloat(e.target.value)})} className="w-full accent-accent-purple h-1.5 rounded-lg appearance-none bg-white/10" />
                                        </div>
                                    </div>
                                    <button onClick={() => setIsSettingsOpen(false)} className="mt-10 w-full py-2 bg-accent-purple/20 border border-accent-purple/30 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-accent-purple/40 transition-all text-white">Apply</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            };

            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(<App />);
        } catch (err) {
            console.error('Boot error:', err);
            document.getElementById('root').innerHTML = '<div class="p-10 text-red-500">System Error: Rendering Failed</div>';
        }
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
