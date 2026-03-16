import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Trash2, Sparkles, User, 
  MessageSquare, PanelLeftClose,
  Plus, Zap, Moon, Sun, Square, Menu, X
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// --- Interfaces ---
interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  time: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  date: number;
}

// --- API Logic ---
const getAIResponse = async (userText: string, chatHistory: Message[], signal: AbortSignal) => {
  const key = import.meta.env.VITE_GEMINI_KEY;
  // Updated to Stable v1 URL
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`;

  if (!key) {
    return "❌ API Key missing! Ensure VITE_GEMINI_KEY is set in your .env file.";
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        contents: chatHistory
          .filter(m => m.id !== "start")
          .map(m => ({
            role: m.sender === "user" ? "user" : "model",
            parts: [{ text: m.text }]
          }))
          .concat([{ role: "user", parts: [{ text: userText }] }]),
      }),
    });
    
    const data = await response.json();
    if (data.error) return `⚠️ API Error: ${data.error.message}`;
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
  } catch (error: any) {
    if (error.name === 'AbortError') return "Transmission Interrupted.";
    return "❌ Connection Error.";
  }
};

export default function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(false); // Default closed for mobile
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize Responsive Sidebar State
  useEffect(() => {
    if (window.innerWidth >= 1024) setSidebarOpen(true);
  }, []);

  useEffect(() => {
    const savedSessions = localStorage.getItem("chat_history");
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) setCurrentSessionId(parsed[0].id);
    } else {
      createNewChat();
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("chat_history", JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [sessions, isTyping, isGenerating]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  const createNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: "New Transmission",
      messages: [{
        id: "start",
        text: "Neural Link Established. How can I assist you today? 🚀",
        sender: "ai",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }],
      date: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newId);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (currentSessionId === id) setCurrentSessionId(filtered[0]?.id || null);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setIsTyping(false);
    }
  };

  const typeText = async (text: string, msgId: string, sessionId: string) => {
    let current = "";
    const chars = text.split("");
    for (let char of chars) {
      if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) break;
      current += char;
      setSessions(prev => prev.map(s => s.id === sessionId ? {
        ...s,
        messages: s.messages.map(m => m.id === msgId ? { ...m, text: current } : m)
      } : s));
      await new Promise(r => setTimeout(r, 5));
    }
    setIsGenerating(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating || !currentSessionId) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userText = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setSessions(prev => prev.map(s => s.id === currentSessionId ? {
      ...s,
      title: s.title === "New Transmission" ? userText.substring(0, 20) + "..." : s.title,
      messages: [...s.messages, userMsg]
    } : s));

    setInput("");
    setIsGenerating(true);
    setIsTyping(true);

    const aiResponse = await getAIResponse(userText, currentSession.messages, controller.signal);
    setIsTyping(false);
    if (controller.signal.aborted) return;

    const aiId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiId, text: "", sender: "ai", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };

    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, aiMsg] } : s));
    await typeText(aiResponse, aiId, currentSessionId);
  };

  return (
    <div className={`fixed inset-0 flex font-sans transition-colors duration-500 overflow-hidden ${isDarkMode ? "bg-[#050505] text-zinc-300" : "bg-zinc-50 text-zinc-900"}`}>
      
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 280 : 0,
          x: isSidebarOpen ? 0 : -280
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed lg:relative z-[60] bg-[#0a0a0a] lg:bg-black/20 backdrop-blur-3xl border-r border-white/5 flex flex-col h-full shadow-2xl lg:shadow-none"
      >
        <div className="p-4 w-[280px] flex flex-col h-full">
          <div className="flex items-center justify-between mb-6 lg:mb-4">
             <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">Memory Bank</span>
             <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-zinc-400"><X size={20}/></button>
          </div>
          
          <button onClick={createNewChat} className="flex items-center gap-2 w-full p-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg text-sm font-bold mb-6 hover:scale-[1.02] transition-transform active:scale-95">
            <Plus size={18} /> New Chat
          </button>
          
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
            {sessions.map(s => (
              <div 
                key={s.id} 
                onClick={() => {
                  setCurrentSessionId(s.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }} 
                className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${currentSessionId === s.id ? "bg-white/10 border-white/10 text-white" : "hover:bg-white/5 text-zinc-500 border-transparent"}`}
              >
                <MessageSquare size={14} />
                <span className="flex-1 truncate text-xs">{s.title}</span>
                <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity" onClick={(e) => deleteSession(s.id, e)} />
              </div>
            ))}
          </div>
          
          <div className="pt-4 border-t border-white/5 space-y-2">
             <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full p-3 flex items-center gap-3 rounded-xl hover:bg-white/5 text-xs text-zinc-400 transition-colors">
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />} {isDarkMode ? "Light Mode" : "Dark Mode"}
             </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col relative z-10 w-full min-w-0 h-full">
        <header className="h-14 lg:h-16 border-b border-white/5 flex items-center justify-between px-4 lg:px-6 bg-white/5 backdrop-blur-md shrink-0">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors">
            {isSidebarOpen ? <PanelLeftClose size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
            <Zap size={12} className="text-purple-400 fill-purple-400" />
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Neural v1.5</span>
          </div>
        </header>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 md:px-[15%] lg:px-[20%] space-y-6 scrollbar-hide">
          <AnimatePresence>
            {currentSession?.messages.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 lg:gap-4 ${m.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-lg ${m.sender === "user" ? "bg-indigo-600" : "bg-zinc-800"}`}>
                  {m.sender === "user" ? <User size={14} className="text-white" /> : <Sparkles size={14} className="text-purple-400" />}
                </div>
                <div className={`max-w-[85%] lg:max-w-[80%] px-4 py-3 rounded-2xl text-sm shadow-sm ${m.sender === "user" ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white/5 backdrop-blur-xl border border-white/10 rounded-tl-none"}`}>
                  <ReactMarkdown components={{
                    code({ inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <div className="relative my-4 overflow-x-auto rounded-lg">
                          <SyntaxHighlighter style={atomDark} language={match[1]} PreTag="div" className="text-[11px] !m-0 !bg-zinc-900/50" {...props}>
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      ) : ( <code className="bg-white/10 px-1.5 py-0.5 rounded text-[13px]" {...props}>{children}</code> );
                    }
                  }}>{m.text}</ReactMarkdown>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isTyping && <div className="text-[10px] text-purple-500 animate-pulse font-bold ml-12 uppercase tracking-tighter">Syncing Neurons...</div>}
        </div>

        {/* Footer Area */}
        <footer className="p-4 lg:p-6 lg:px-[20%] bg-gradient-to-t from-[#050505] via-[#050505] to-transparent shrink-0">
          <div className="relative flex items-center bg-zinc-900 lg:bg-white/5 border border-white/10 rounded-2xl px-2 py-1.5 focus-within:border-purple-500/50 transition-all shadow-2xl">
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} 
              placeholder="Message..." 
              className="flex-1 bg-transparent outline-none text-sm py-2.5 px-3 w-full" 
              disabled={isGenerating}
            />
            <div className="flex gap-1 pr-1">
              {isGenerating ? (
                <button 
                  onClick={handleStop} 
                  className="p-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-xl transition-colors active:scale-90"
                >
                  <Square size={18} fill="currentColor" />
                </button>
              ) : (
                <button 
                  onClick={handleSend} 
                  disabled={!input.trim()} 
                  className="p-2.5 bg-purple-600 rounded-xl disabled:opacity-30 hover:bg-purple-500 transition-all active:scale-90"
                >
                  <Send size={18} className="text-white" />
                </button>
              )}
            </div>
          </div>
          <p className="text-[9px] text-center text-zinc-600 mt-3 font-bold uppercase tracking-[0.2em]">Powered by Gemini 1.5 Flash</p>
        </footer>
      </main>
    </div>
  );
}