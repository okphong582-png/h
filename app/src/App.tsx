import { useState, useEffect, useRef } from 'react';
import './App.css';
import {
  Sparkles, Send, Square, Copy, Check, RotateCcw, Volume2, VolumeX,
  Settings, Plus, Trash2, ChevronDown, Zap, RefreshCw, Columns, X,
  MessageSquare, AlertCircle, CheckCircle2, Sliders
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  isGenerating?: boolean;
  isError?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

interface LLMModel {
  id: string;
  name: string;
  provider: 'openrouter' | 'groq' | 'ollama' | 'openai';
  status: 'connected' | 'disconnected' | 'connecting';
  description: string;
  isCloud?: boolean;
}

const SERVER_URL = window.location.origin;
const INITIAL_TOKENS = 1_000_000;
const TOKENS_PER_MESSAGE = 1_000;

// ─── Token Details Modal ──────────────────────────────────────────────────────
const TokenModal = ({
  isOpen,
  onClose,
  tokensLeft,
  onRefill
}: {
  isOpen: boolean;
  onClose: () => void;
  tokensLeft: number;
  onRefill: () => void;
}) => {
  if (!isOpen) return null;
  const used = INITIAL_TOKENS - tokensLeft;
  const pct = Math.max(0, Math.min(100, (tokensLeft / INITIAL_TOKENS) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-chat-in">
      <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl max-w-md w-full p-6 relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
            <Zap size={20} className="fill-emerald-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">Quản Lý Token Máy</h3>
            <p className="text-xs text-gray-500">Hạn mức máy: 1,000,000 tokens (1M)</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Còn lại</span>
            <span className="text-2xl font-extrabold text-emerald-600">
              {tokensLeft.toLocaleString()} <span className="text-xs font-medium text-gray-400">/ 1,000,000</span>
            </span>
          </div>

          <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-200/60 text-gray-600">
            <div>
              <span className="text-gray-400">Đã dùng: </span>
              <span className="font-semibold text-gray-800">{used.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-400">Tiêu thụ: </span>
              <span className="font-semibold text-gray-800">1,000 / tin</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              onRefill();
              onClose();
            }}
            className="w-full py-3 bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <RefreshCw size={16} />
            <span>Nạp Lại 1,000,000 Tokens (Miễn Phí)</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Settings Modal ───────────────────────────────────────────────────────────
const SettingsModal = ({
  isOpen,
  onClose,
  activeModel,
  onModelChange,
  models
}: {
  isOpen: boolean;
  onClose: () => void;
  activeModel: string;
  onModelChange: (m: string) => void;
  models: LLMModel[];
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-chat-in">
      <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl max-w-lg w-full p-6 relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center">
            <Sliders size={20} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">Cài Đặt Hệ Thống</h3>
            <p className="text-xs text-gray-500">Tùy chỉnh mô hình AI & phong cách phản hồi</p>
          </div>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-2">
              Mô Hình AI Đang Dùng
            </label>
            <div className="space-y-2">
              {models.map(m => (
                <div
                  key={m.id}
                  onClick={() => onModelChange(m.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    activeModel === m.id
                      ? 'border-black bg-gray-50/80 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                      {m.isCloud && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-medium border border-blue-100">
                          Cloud
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                  </div>
                  {activeModel === m.id && <CheckCircle2 size={18} className="text-black ml-3 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ChatGPT Top Navigation Bar ────────────────────────────────────────────────
const ChatGPTHeader = ({
  activeModel,
  onModelChange,
  models,
  tokensLeft,
  onOpenTokenModal,
  onNewChat,
  onToggleSidebar,
  sidebarOpen,
  onOpenSettings
}: {
  activeModel: string;
  onModelChange: (m: string) => void;
  models: LLMModel[];
  tokensLeft: number;
  onOpenTokenModal: () => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onOpenSettings: () => void;
}) => {
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const currentModel = models.find(m => m.id === activeModel) || { name: 'WormGPT 4o (Llama 3.3)' };

  return (
    <header className="sticky top-0 left-0 right-0 z-30 flex items-center justify-between px-3 md:px-5 h-14 bg-white/95 backdrop-blur border-b border-gray-200/80 transition-colors">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Ẩn thanh bên' : 'Hiện thanh bên'}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
        >
          <Columns size={18} />
        </button>

        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setModelMenuOpen(!modelMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-gray-100 text-gray-900 text-sm font-semibold transition-colors cursor-pointer"
          >
            <span>{currentModel.name.replace(/\(.*\)/, '').trim() || 'WormGPT 4o'}</span>
            <span className="text-xs text-gray-400 font-normal">v2</span>
            <ChevronDown size={14} className="text-gray-500 mt-0.5" />
          </button>

          {modelMenuOpen && (
            <div
              className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 z-50 animate-chat-in"
              onMouseLeave={() => setModelMenuOpen(false)}
            >
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Mô hình AI
              </div>
              <div className="space-y-1">
                {models.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onModelChange(m.id);
                      setModelMenuOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-colors flex items-center justify-between ${
                      activeModel === m.id ? 'bg-gray-100 text-gray-900 font-medium' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold">{m.name}</p>
                      <p className="text-[10px] text-gray-400 line-clamp-1">{m.description}</p>
                    </div>
                    {activeModel === m.id && <Check size={14} className="text-black ml-2 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Token Badge */}
        <button
          onClick={onOpenTokenModal}
          title="Xem chi tiết hoặc nạp lại token"
          className="token-badge flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-800 cursor-pointer"
        >
          <Zap size={14} className="text-emerald-600 fill-emerald-500" />
          <span>{tokensLeft.toLocaleString()}</span>
          <span className="text-[10px] text-emerald-600/80 font-normal hidden sm:inline">Tokens</span>
        </button>

        <button
          onClick={onNewChat}
          title="Đoạn chat mới (Ctrl+N)"
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
        >
          <Plus size={18} />
        </button>

        <button
          onClick={onOpenSettings}
          title="Cài đặt"
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};

// ─── ChatGPT Left Sidebar ──────────────────────────────────────────────────────
const ChatGPTSidebar = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  tokensLeft,
  onOpenTokenModal,
  onOpenSettings
}: {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  tokensLeft: number;
  onOpenTokenModal: () => void;
  onOpenSettings: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <aside className="w-[260px] flex-shrink-0 h-screen bg-[#f9f9f9] border-r border-gray-200/80 flex flex-col justify-between p-3 select-none z-30 transition-all">
      {/* Top Section */}
      <div className="flex flex-col gap-2 overflow-hidden flex-1">
        {/* Header */}
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-black flex items-center justify-center text-white shadow-sm">
              <Sparkles size={14} />
            </div>
            <span className="font-bold text-sm tracking-tight text-gray-900">WormGPT</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"
            title="Đóng sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200/80 hover:bg-gray-50 text-gray-800 text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Plus size={15} />
            Cuộc trò chuyện mới
          </span>
          <span className="text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">Ctrl+N</span>
        </button>

        {/* Sessions list */}
        <div className="mt-3 overflow-y-auto no-scrollbar space-y-1 flex-1">
          <p className="px-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Gần đây
          </p>
          {sessions.length === 0 ? (
            <p className="px-2 py-3 text-xs text-gray-400 italic">Chưa có lịch sử trò chuyện</p>
          ) : (
            sessions.map(s => (
              <div
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                  activeSessionId === s.id
                    ? 'bg-gray-200/80 text-gray-900 font-semibold shadow-xs'
                    : 'hover:bg-gray-200/50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare size={13} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{s.title || 'Đoạn chat mới'}</span>
                </div>
                <button
                  onClick={(e) => onDeleteSession(s.id, e)}
                  title="Xóa đoạn chat"
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity p-0.5 ml-1 flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Section: Token Card & Settings */}
      <div className="border-t border-gray-200/80 pt-3 space-y-2">
        {/* Token Card */}
        <div
          onClick={onOpenTokenModal}
          className="p-3 bg-white border border-gray-200/80 rounded-2xl cursor-pointer hover:border-emerald-300 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
              <Zap size={12} className="text-emerald-500 fill-emerald-500" />
              Token Thiết Bị
            </span>
            <span className="text-xs font-bold text-emerald-600">
              {tokensLeft.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
              style={{ width: `${Math.max(0, Math.min(100, (tokensLeft / INITIAL_TOKENS) * 100))}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 group-hover:text-emerald-600 transition-colors">
            1,000 tokens / tin nhắn • Bấm để nạp lại
          </p>
        </div>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-200/70 text-gray-700 text-xs font-medium transition-colors"
        >
          <Settings size={15} className="text-gray-500" />
          <span>Cài đặt & Mô hình</span>
        </button>

        <div className="flex items-center justify-between px-3 py-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-700">
              U
            </div>
            <span className="text-xs text-gray-700 font-medium">Người dùng</span>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
            1M Quota
          </span>
        </div>
      </div>
    </aside>
  );
};

// ─── ChatGPT Hero (Empty State) ───────────────────────────────────────────────
const ChatGPTHero = ({ onPromptSelect }: { onPromptSelect: (p: string) => void }) => {
  const cards = [
    {
      title: 'Lập trình & Viết code',
      desc: 'Tạo ứng dụng to-do list hiện đại với HTML, CSS và JavaScript',
      prompt: 'Hãy tạo một ứng dụng to-do list hoàn chỉnh bằng HTML, CSS đẹp mắt và JavaScript thuần có tính năng lưu vào LocalStorage.',
      icon: '💻'
    },
    {
      title: 'Tìm lỗi & Tối ưu hóa',
      desc: 'Phân tích và tối ưu hóa hiệu năng, bảo mật cho đoạn code',
      prompt: 'Làm thế nào để tối ưu hóa hiệu năng một ứng dụng web React và giảm thời gian tải trang dưới 1 giây?',
      icon: '🔍'
    },
    {
      title: 'Kiến trúc & Hệ thống',
      desc: 'Thiết kế kiến trúc hệ thống fullstack và cơ sở dữ liệu',
      prompt: 'Hãy thiết kế kiến trúc hệ thống cho một ứng dụng chat thời gian thực hỗ trợ 100,000 người dùng trực tuyến.',
      icon: '💡'
    },
    {
      title: 'Giải thích & Phân tích',
      desc: 'Giải thích khái niệm kỹ thuật phức tạp theo cách dễ hiểu nhất',
      prompt: 'Hãy giải thích cơ chế hoạt động của Transformers và Attention Mechanism trong mô hình ngôn ngữ lớn (LLM) một cách trực quan.',
      icon: '✍️'
    }
  ];

  return (
    <div className="max-w-2xl mx-auto text-center px-4 py-8 md:py-12 animate-chat-in">
      <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-2xl bg-black text-white shadow-md">
        <Sparkles size={24} />
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
        Hôm nay tôi có thể giúp gì cho bạn?
      </h1>
      <p className="text-xs md:text-sm text-gray-500 mb-8">
        WormGPT không giới hạn • Trợ lý lập trình siêu tốc độ
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        {cards.map((c, i) => (
          <div
            key={i}
            onClick={() => onPromptSelect(c.prompt)}
            className="chatgpt-card group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">{c.icon}</span>
              <h3 className="text-xs font-semibold text-gray-800 group-hover:text-black">
                {c.title}
              </h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
              {c.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── ChatGPT User Message ─────────────────────────────────────────────────────
const ChatGPTUserMessage = ({ message }: { message: Message }) => (
  <div className="flex justify-end px-4 py-2 animate-chat-in">
    <div className="chatgpt-user-bubble">
      {message.content}
    </div>
  </div>
);

// ─── ChatGPT AI Message ───────────────────────────────────────────────────────
const ChatGPTAIMessage = ({
  message,
  onRegenerate,
  isGenerating
}: {
  message: Message;
  onRegenerate?: () => void;
  isGenerating: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const clean = message.content.replace(/```[\s\S]*?```/g, '[mã nguồn]');
    const utt = new SpeechSynthesisUtterance(clean);
    utt.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
    setIsSpeaking(true);
  };

  // Render markdown chunks and macOS-style code blocks
  const renderFormattedContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
        const lang = match?.[1] || 'code';
        const code = (match?.[2] || '').trim();

        return (
          <div key={index} className="my-3 rounded-2xl overflow-hidden border border-gray-800 bg-[#1e1e1e] text-xs shadow-md">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#2a2a2a] text-gray-400 font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                <span className="ml-2 uppercase text-[10px] font-semibold text-gray-400">{lang}</span>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded bg-white/5 hover:bg-white/10"
              >
                <Copy size={12} />
                <span>Sao chép</span>
              </button>
            </div>
            <pre className="p-4 text-gray-100 font-mono overflow-x-auto leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      return (
        <div key={index} className="whitespace-pre-wrap leading-relaxed text-gray-900">
          {part}
        </div>
      );
    });
  };

  return (
    <div className="flex gap-3 px-4 py-3 max-w-3xl mx-auto w-full animate-chat-in">
      <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
        <Sparkles size={14} />
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="text-[15px] leading-relaxed chatgpt-ai-message">
          {renderFormattedContent(message.content)}
          {isGenerating && <span className="typing-dot" />}
        </div>

        {!isGenerating && message.content && (
          <div className="flex items-center gap-1.5 mt-3 pt-2 text-gray-400">
            <button
              onClick={handleCopy}
              title="Sao chép nội dung"
              className="p-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
            <button
              onClick={handleSpeak}
              title={isSpeaking ? 'Dừng đọc' : 'Đọc to'}
              className="p-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                title="Tạo lại câu trả lời"
                className="p-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── ChatGPT Floating Input Dock ──────────────────────────────────────────────
const ChatGPTInputDock = ({
  onSendMessage,
  isGenerating,
  onStopGeneration,
  tokensLeft,
  onOpenTokenModal
}: {
  onSendMessage: (msg: string) => void;
  isGenerating: boolean;
  onStopGeneration: () => void;
  tokensLeft: number;
  onOpenTokenModal: () => void;
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (text.trim() && !isGenerating) {
      onSendMessage(text);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      <div className="chatgpt-input-dock p-2 relative flex flex-col">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isGenerating ? 'WormGPT đang suy nghĩ...' : 'Hỏi WormGPT bất cứ điều gì... (Enter để gửi)'}
          disabled={isGenerating}
          rows={1}
          className="w-full bg-transparent px-3 py-1.5 text-[15px] text-gray-900 placeholder-gray-400 outline-none resize-none min-h-[44px] max-h-[160px] leading-relaxed"
          onInput={e => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = 'auto';
            t.style.height = Math.min(t.scrollHeight, 160) + 'px';
          }}
        />

        <div className="flex items-center justify-between px-2 pt-1">
          <button
            type="button"
            onClick={onOpenTokenModal}
            className="text-[11px] font-medium text-gray-400 hover:text-emerald-600 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Zap size={12} className="text-emerald-500 fill-emerald-500" />
            <span>-1,000 tokens / tin ({tokensLeft.toLocaleString()} còn lại)</span>
          </button>

          <div className="flex items-center gap-1">
            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                title="Dừng tạo"
                className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <Square size={12} fill="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!text.trim()}
                title="Gửi tin nhắn"
                className="w-8 h-8 rounded-full bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white flex items-center justify-center hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <Send size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-gray-400 mt-2 select-none">
        WormGPT có thể mắc lỗi. Hãy kiểm tra lại các thông tin quan trọng.
      </p>
    </div>
  );
};

// ─── Main Application ─────────────────────────────────────────────────────────
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tokensLeft, setTokensLeft] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wormgpt_device_tokens');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val)) return val;
      }
    } catch {}
    return INITIAL_TOKENS;
  });

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('wormgpt_chat_sessions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [{ id: 'default', title: 'Đoạn chat mới', messages: [], updatedAt: Date.now() }];
  });
  const [activeSessionId, setActiveSessionId] = useState<string>('default');

  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || {
    id: 'default', title: 'Đoạn chat mới', messages: [], updatedAt: Date.now()
  };
  const messages = currentSession.messages;

  const [isGenerating, setIsGenerating] = useState(false);
  const [models, setModels] = useState<LLMModel[]>([
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'WormGPT 4o (Llama 3.3 70B)', provider: 'openrouter', status: 'connected', description: 'Mô hình lập trình mạnh mẽ nhất, nhanh & chuẩn xác', isCloud: true },
    { id: 'gryphe/mythomax-l2-13b', name: 'MythoMax 13B (Uncensored)', provider: 'openrouter', status: 'connected', description: 'Không kiểm duyệt, tự do tối đa mọi chủ đề', isCloud: true },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (Coding Beast)', provider: 'openrouter', status: 'connected', description: 'Chuyên sâu thuật toán và code phức tạp', isCloud: true },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Cloud)', provider: 'openrouter', status: 'connected', description: 'Nhanh nhẹn, tối ưu', isCloud: true }
  ]);
  const [activeModel, setActiveModel] = useState('meta-llama/llama-3.3-70b-instruct');

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync tokens to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('wormgpt_device_tokens', tokensLeft.toString());
    } catch {}
  }, [tokensLeft]);

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('wormgpt_chat_sessions', JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  // Load models from server/serverless
  useEffect(() => {
    fetch(`${SERVER_URL}/api/providers`)
      .then(r => r.json())
      .then(data => {
        if (data.models && data.models.length > 0) {
          setModels(data.models);
        }
      })
      .catch(() => {});
  }, []);

  const scrollToBottom = () => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch {}
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Hotkey Ctrl+N for new chat
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleRefillTokens = () => {
    setTokensLeft(INITIAL_TOKENS);
  };

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Đoạn chat mới',
      messages: [],
      updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      setSessions([{ id: Date.now().toString(), title: 'Đoạn chat mới', messages: [], updatedAt: Date.now() }]);
      return;
    }
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      if (remaining.length > 0) setActiveSessionId(remaining[0].id);
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const updateCurrentSessionMessages = (updater: (prev: Message[]) => Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const updated = updater(s.messages);
        const firstUser = updated.find(m => m.type === 'user');
        const title = firstUser ? (firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? '...' : '')) : s.title;
        return { ...s, messages: updated, title, updatedAt: Date.now() };
      }
      return s;
    }));
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isGenerating) return;

    // Check token balance
    if (tokensLeft < TOKENS_PER_MESSAGE) {
      setShowTokenModal(true);
      return;
    }

    // Deduct 1,000 tokens
    setTokensLeft(prev => Math.max(0, prev - TOKENS_PER_MESSAGE));

    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    updateCurrentSessionMessages(prev => [...prev, userMsg]);

    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = {
      id: aiMsgId,
      type: 'ai',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isGenerating: true
    };

    updateCurrentSessionMessages(prev => [...prev, aiMsg]);
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    // Prepare conversation history (up to last 10 messages for rich context)
    const conversationHistory = [
      ...messages.slice(-10).map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.content
      })),
      { role: 'user', content: content.trim() }
    ];

    try {
      const resp = await fetch(`${SERVER_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          model: activeModel,
          temperature: 0.7,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || `Lỗi phản hồi (${resp.status})`);
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          if (trimmed === 'data: [DONE]') {
            streamDone = true;
            break;
          }

          try {
            const json = JSON.parse(trimmed.slice(5).trim());
            const delta = json.message?.content || json.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullContent += delta;
              updateCurrentSessionMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: fullContent } : m));
            }
            if (json.done) {
              streamDone = true;
              break;
            }
          } catch {}
        }
      }

      try {
        reader.cancel();
      } catch {}

      updateCurrentSessionMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isGenerating: false } : m));
    } catch (err: any) {
      if (err.name === 'AbortError') {
        updateCurrentSessionMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isGenerating: false } : m));
      } else {
        updateCurrentSessionMessages(prev => prev.map(m => m.id === aiMsgId ? {
          ...m,
          content: m.content ? m.content : `⚠️ Lỗi kết nối: ${err.message || 'Không thể phản hồi. Vui lòng thử lại.'}`,
          isGenerating: false,
          isError: true
        } : m));
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-gray-900 transition-colors">
      {/* Left Sidebar (ChatGPT Style) */}
      <ChatGPTSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        tokensLeft={tokensLeft}
        onOpenTokenModal={() => setShowTokenModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        {/* Top Header */}
        <ChatGPTHeader
          activeModel={activeModel}
          onModelChange={setActiveModel}
          models={models}
          tokensLeft={tokensLeft}
          onOpenTokenModal={() => setShowTokenModal(true)}
          onNewChat={handleNewChat}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          onOpenSettings={() => setShowSettingsModal(true)}
        />

        {/* Message Viewport */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {messages.length === 0 ? (
            <div className="my-auto">
              <ChatGPTHero onPromptSelect={handleSendMessage} />
            </div>
          ) : (
            <div className="py-4 space-y-2 flex-1 max-w-3xl mx-auto w-full">
              {messages.map(msg => (
                msg.type === 'user' ? (
                  <ChatGPTUserMessage
                    key={msg.id}
                    message={msg}
                  />
                ) : (
                  <ChatGPTAIMessage
                    key={msg.id}
                    message={msg}
                    onRegenerate={() => {
                      const userMsgs = messages.filter(m => m.type === 'user');
                      if (userMsgs.length > 0) handleSendMessage(userMsgs[userMsgs.length - 1].content);
                    }}
                    isGenerating={msg.isGenerating || false}
                  />
                )
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Bottom Floating Input Dock */}
        <footer className="w-full bg-white/95 backdrop-blur pt-1">
          <ChatGPTInputDock
            onSendMessage={handleSendMessage}
            isGenerating={isGenerating}
            onStopGeneration={handleStopGeneration}
            tokensLeft={tokensLeft}
            onOpenTokenModal={() => setShowTokenModal(true)}
          />
        </footer>
      </div>

      {/* Token Management Modal */}
      <TokenModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        tokensLeft={tokensLeft}
        onRefill={handleRefillTokens}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        activeModel={activeModel}
        onModelChange={setActiveModel}
        models={models}
      />
    </div>
  );
}

export default App;
