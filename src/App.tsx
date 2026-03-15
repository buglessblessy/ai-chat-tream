import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Trash2, Cpu, Sparkles, User, 
  MessageSquare, LogIn, LogOut, PanelLeftClose, PanelLeft,
  Plus, History, Settings, Zap, Moon, Sun
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// --- Configuration ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_KEY || "AIzaSyAlABTAl1U0Zt8QkF2jwwH8QZDi4d3DXLE";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

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

export default function App() {
  // State for UI and Authentication
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [user, setUser] = useState({ name: "Blessy", email: "blessy@dev.com" });

  // State for Chat Logic
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Load History from LocalStorage on mount
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

  // 2. Save History to LocalStorage whenever sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem("chat_history", JSON.stringify(sessions));
    }
  }, [sessions]);

  // 3. Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [sessions, currentSessionId, isTyping]);

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
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (currentSessionId === id) {
      setCurrentSessionId(filtered[0]?.id || null);
    }
  };

  const typeText = async (text: string, msgId: string, sessionId: string) => {
    let current = "";
    for (let char of text) {
      current += char;
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: s.messages.map(m => m.id === msgId ? { ...m, text: current } : m)
          };
        }
        return s;
      }));
      await new Promise((r) => setTimeout(r, 5));
    }
  };

  const getAIResponse = async (userText: string, chatHistory: Message[]) => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: chatHistory.map(m => ({
            role: m.sender === "user" ? "user" : "model",
            parts: [{ text: m.text }]
          })).concat([{ role: "user", parts: [{ text: userText }] }]),
        }),
      });
      const data = await response.json();
      if (data.error) return "⚠️ API Error: " + data.error.message;
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
    } catch (error) {
      return "❌ Connection Error.";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping || !currentSessionId) return;

    const userText = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: "user",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const isFirstMsg = s.title === "New Transmission";
        return {
          ...s,
          title: isFirstMsg ? (userText.length > 25 ? userText.substring(0, 25) + "..." : userText) : s.title,
          messages: [...s.messages, userMsg]
        };
      }
      return s;
    }));

    setInput("");
    setIsTyping(true);

    const aiResponse = await getAIResponse(userText, currentSession.messages);
    const aiId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiId, text: "", sender: "ai", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };

    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...s.messages, aiMsg] } : s));
    setIsTyping(false);
    await typeText(aiResponse, aiId, currentSessionId);
  };

  return (
    <div className={`fixed inset-0 flex font-sans transition-colors duration-500 ${isDarkMode ? "bg-[#050505] text-zinc-300" : "bg-zinc-50 text-zinc-900"}`}>
      
      {/* AURORA BACKGROUND EFFECTS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* SIDEBAR */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0 }}
        className="relative z-20 bg-black/20 backdrop-blur-3xl border-r border-white/5 flex flex-col overflow-hidden h-full"
      >
        <div className="p-4 flex flex-col h-full w-[280px]">
          <button 
            onClick={createNewChat}
            className="flex items-center gap-2 w-full p-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all text-sm font-bold mb-6"
          >
            <Plus size={18} /> New Chat
          </button>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2 mb-2">Recent Archives</p>
            {sessions.map(s => (
              <div 
                key={s.id} 
                onClick={() => setCurrentSessionId(s.id)}
                className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${currentSessionId === s.id ? "bg-white/10 border-white/10 text-white" : "hover:bg-white/5 text-zinc-500 border-transparent"}`}
              >
                <MessageSquare size={14} className={currentSessionId === s.id ? "text-purple-400" : ""} />
                <span className="flex-1 truncate text-xs font-medium">{s.title}</span>
                <Trash2 
                  size={14} 
                  className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all" 
                  onClick={(e) => deleteSession(s.id, e)}
                />
              </div>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-white/5 space-y-2">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full p-3 flex items-center gap-3 rounded-xl hover:bg-white/5 transition-all text-xs font-medium text-zinc-400">
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              {isDarkMode ? "Switch to Light" : "Switch to Dark"}
            </button>
            
            {!isLoggedIn ? (
              <button 
                onClick={() => setIsLoggedIn(true)}
                className="flex items-center justify-center gap-2 w-full p-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all"
              >
                <LogIn size={18} /> Sign In
              </button>
            ) : (
              <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  {user.name[0]}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-tighter font-black">Pro Member</p>
                </div>
                <button onClick={() => setIsLoggedIn(false)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-red-400">
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative z-10">
        
        {/* Navigation */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors">
              {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
            </button>
            <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center gap-2">
              <Zap size={12} className="text-purple-400 fill-purple-400" />
              <span className="text-[10px] font-black tracking-widest text-purple-400 uppercase">Neural Engine 3.0</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
             <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Online</span>
          </div>
        </header>

        {/* Chat Stream */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-10 md:px-[15%] lg:px-[20%] space-y-10 scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {currentSession?.messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, scale: 0.98, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`flex gap-5 ${m.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${m.sender === "user" ? "bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-500/20" : "bg-zinc-900 border-white/10"}`}>
                  {m.sender === "user" ? <User size={16} className="text-white" /> : <Sparkles size={16} className="text-purple-400" />}
                </div>

                <div className={`flex flex-col space-y-2 max-w-[85%] ${m.sender === "user" ? "items-end" : "items-start"}`}>
                  <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-2xl ${m.sender === "user" ? "bg-indigo-600 text-white rounded-tr-none" : "bg-[#111111]/80 backdrop-blur-xl text-zinc-200 border border-white/5 rounded-tl-none"}`}>
                    <ReactMarkdown
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter style={atomDark} language={match[1]} PreTag="div" className="rounded-xl my-4 text-xs !bg-black/40 border border-white/5" {...props}>
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-[13px]" {...props}>{children}</code>
                          );
                        }
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  </div>
                  <span className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em]">{m.time}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isTyping && (
            <div className="flex items-center gap-2 px-14">
              <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest animate-pulse">Processing</span>
              <div className="flex gap-1"><span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce"></span><span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]"></span><span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]"></span></div>
            </div>
          )}
        </div>

        {/* Footer Input */}
        <footer className="p-6 md:px-[15%] lg:px-[20%] bg-gradient-to-t from-black/50 to-transparent">
          <div className="relative group bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 focus-within:border-purple-500/40 transition-all duration-500 shadow-2xl">
            <div className="flex items-center gap-3 px-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Synchronize with Gemini..."
                className="flex-1 bg-transparent py-4 text-sm text-white outline-none placeholder:text-zinc-600"
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button
                onClick={handleSend}
                disabled={isTyping || !input.trim()}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 p-3.5 rounded-xl transition-all shadow-lg shadow-purple-600/20 active:scale-90"
              >
                <Send size={18} className="text-white" />
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center mt-4 px-2">
            <p className="text-[8px] text-zinc-700 tracking-[0.4em] font-black uppercase">Encrypted Connection</p>
            <p className="text-[8px] text-zinc-700 tracking-[0.4em] font-black uppercase">March 2026 Build</p>
          </div>
        </footer>
      </main>
    </div>
  );
}