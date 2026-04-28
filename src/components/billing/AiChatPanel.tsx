import React, { useState, useRef, useEffect } from 'react';
import { X, Maximize2, Minimize2, Send, Sparkles, ChevronRight, Plus, ShieldCheck, DollarSign, FileText, AlertTriangle, TrendingUp, Users, BarChart3, ClipboardCheck, HeartPulse, CircleAlert, Clock, ArrowLeftRight, Camera, Mic, Calendar, CheckSquare, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { demoToast } from '@/lib/demoToast';
import { cn } from '@/lib/utils';
import { AiResponseRenderer, STRUCTURED_RESPONSES, DEFAULT_STRUCTURED_RESPONSE, type StructuredResponse } from './AiResponseRenderer';

/* ------------------------------------------------------------------ */
/* Quick-prompt data                                                    */
/* ------------------------------------------------------------------ */

interface PromptItem {
  text: string;
  icon: React.ElementType;
  color: string;
}

interface PromptCategory {
  label: string;
  items: PromptItem[];
}

const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    label: 'CLAIMS',
    items: [
      { text: 'Show all blocked claims this period', icon: FileText, color: 'border-l-billing-at-risk' },
      { text: 'Which claims are at risk of denial?', icon: AlertTriangle, color: 'border-l-billing-warning' },
      { text: 'Claims with missing documentation', icon: ClipboardCheck, color: 'border-l-billing-at-risk' },
      { text: 'Show claims expiring this week', icon: Clock, color: 'border-l-billing-warning' },
    ],
  },
  {
    label: 'AUTHORIZATIONS',
    items: [
      { text: 'Which individuals have expiring auths?', icon: ShieldCheck, color: 'border-l-billing-warning' },
      { text: 'Show auth balances below 20%', icon: BarChart3, color: 'border-l-billing-at-risk' },
      { text: 'Who has no active authorization?', icon: CircleAlert, color: 'border-l-billing-at-risk' },
      { text: 'Auth renewal opportunities', icon: Calendar, color: 'border-l-billing-healthy' },
    ],
  },
  {
    label: 'COMPLIANCE',
    items: [
      { text: 'What rules are blocking the most claims?', icon: CheckSquare, color: 'border-l-primary' },
      { text: 'Show all CO4 denial patterns', icon: BarChart3, color: 'border-l-billing-at-risk' },
      { text: 'Which claims failed doc sufficiency check?', icon: FileText, color: 'border-l-billing-warning' },
      { text: 'How many claims passed all 14 rules today?', icon: ClipboardCheck, color: 'border-l-billing-healthy' },
    ],
  },
  {
    label: 'REVENUE',
    items: [
      { text: 'What is my projected revenue this period?', icon: TrendingUp, color: 'border-l-billing-healthy' },
      { text: 'Show outstanding vs paid', icon: DollarSign, color: 'border-l-billing-warning' },
      { text: 'How much is blocked by auth issues?', icon: AlertTriangle, color: 'border-l-billing-at-risk' },
      { text: 'Compare this month vs last month', icon: BarChart3, color: 'border-l-primary' },
    ],
  },
];
/* ------------------------------------------------------------------ */
/* Mock responses                                                      */
/* ------------------------------------------------------------------ */
/* Mock responses removed — now using structured responses from AiResponseRenderer */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  structured?: StructuredResponse;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
}

/* ------------------------------------------------------------------ */
/* Prompt Card                                                         */
/* ------------------------------------------------------------------ */
const PromptCard = ({ item, onClick }: { item: PromptItem; onClick: () => void }) => {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-lg bg-secondary/40 hover:bg-secondary transition-all group border-l-[3px]",
        item.color
      )}
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-[12px] font-medium text-foreground flex-1 leading-tight">{item.text}</span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 transition-colors" />
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* Category Divider                                                    */
/* ------------------------------------------------------------------ */
const CategoryDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="flex-1 h-px bg-border" />
    <span className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">{label}</span>
    <div className="flex-1 h-px bg-border" />
  </div>
);

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
interface AiChatPanelProps {
  open: boolean;
  onClose: () => void;
}

const AiChatPanel = ({ open, onClose }: AiChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [chatHistory] = useState<ChatSession[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) setIsExpanded(false);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const sendMessage = (text: string) => {
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    setTimeout(() => {
      const structured = STRUCTURED_RESPONSES[text] ?? DEFAULT_STRUCTURED_RESPONSE;
      const aiMsg: Message = { id: crypto.randomUUID(), role: 'ai', content: '', structured, timestamp: new Date() };
      setMessages((prev) => [...prev, aiMsg]);
      setIsThinking(false);
    }, 1200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    sendMessage(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setIsThinking(false);
    setInput('');
  };

  const showQuickPrompts = messages.length === 0 && !isThinking;

  // Panel width: default 520px, expanded ~720px
  const panelWidth = isExpanded ? 'w-full sm:w-[720px]' : 'w-full sm:w-[520px]';

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />}

      <div
        className={cn(
          'fixed top-0 right-0 z-50 flex flex-col bg-card shadow-2xl transition-all duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
          panelWidth,
          'h-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[hsl(330,70%,55%)] to-[hsl(265,85%,55%)] flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold">AI</span>
            </div>
            <span className="font-bold font-display text-sm text-foreground">AI Assistant</span>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setIsExpanded(f => !f)}>
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body — two-column: left sidebar + right content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar — New Chat + History */}
          <div className={cn("shrink-0 border-r border-border bg-secondary/30 flex flex-col transition-all duration-300", isExpanded ? "w-[200px]" : "w-0 overflow-hidden border-r-0")}>
            <div className="p-3">
              <button
                onClick={handleNewChat}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                New Chat
              </button>
            </div>
            <div className="px-3 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Chat History</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3">
              {chatHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No previous chats</p>
              ) : (
                chatHistory.map(session => (
                  <button
                    key={session.id}
                    onClick={() => demoToast("Open previous chat")}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-secondary text-xs text-foreground truncate"
                  >
                    {session.title}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right content — prompts or conversation */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
              {showQuickPrompts ? (
                <div>
                  {PROMPT_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <CategoryDivider label={cat.label} />
                      <div className="grid grid-cols-2 gap-1.5 pb-1">
                        {cat.items.map((item) => (
                          <PromptCard key={item.text} item={item} onClick={() => sendMessage(item.text)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {msg.role === 'ai' && (
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[hsl(330,70%,55%)] to-[hsl(265,85%,55%)] flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-white text-[10px] font-bold">AI</span>
                        </div>
                      )}
                      {msg.role === 'user' ? (
                        <div className="max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed bg-primary text-primary-foreground">
                          {msg.content}
                        </div>
                      ) : (
                        <div className="max-w-[90%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed bg-secondary/50 border border-border/50 text-foreground">
                          {msg.structured ? <AiResponseRenderer response={msg.structured} /> : <MarkdownLite content={msg.content} />}
                        </div>
                      )}
                    </div>
                  ))}

                  {isThinking && (
                    <div className="flex gap-2.5 items-center">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[hsl(330,70%,55%)] to-[hsl(265,85%,55%)] flex items-center justify-center shrink-0">
                        <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
                      </div>
                      <span className="text-xs text-muted-foreground animate-pulse">AI is thinking…</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border px-4 py-3 bg-card shrink-0">
              <form onSubmit={handleSubmit} className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about any claim, individual, or funding stream..."
                  className="w-full resize-none rounded-xl bg-secondary/50 border border-border px-4 py-3 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[48px] max-h-[120px]"
                  rows={1}
                  disabled={isThinking}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isThinking}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:bg-primary/90 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
              <div className="flex items-center justify-between mt-2.5 px-1">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => demoToast("Attach a file")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => demoToast("Capture from camera")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => demoToast("Ambient listening")}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Ambient
                  </button>
                  <button
                    type="button"
                    onClick={() => demoToast("Scribe mode")}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" /> Scribe
                  </button>
                  <button
                    type="button"
                    onClick={() => demoToast("Voice dictation")}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Tiny markdown renderer                                              */
/* ------------------------------------------------------------------ */
const MarkdownLite = ({ content }: { content: string }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let tableRows: string[][] = [];

  const renderInline = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/→/g, '→');
  };

  const flushTable = () => {
    if (tableRows.length === 0) return;
    const header = tableRows[0];
    const body = tableRows.slice(1).filter((r) => !r.every((c) => /^-+$/.test(c.trim())));
    elements.push(
      <div key={elements.length} className="overflow-x-auto my-2">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr>
              {header.map((h, i) => (
                <th key={i} className="text-left font-semibold py-1 px-1.5 border-b border-border text-muted-foreground">
                  {h.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} className="hover:bg-secondary/50">
                {row.map((cell, ci) => (
                  <td key={ci} className="py-1 px-1.5 border-b border-border/50" dangerouslySetInnerHTML={{ __html: renderInline(cell.trim()) }} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableRows = [];
  };

  lines.forEach((line, li) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.slice(1, -1).split('|');
      tableRows.push(cells);
    } else {
      flushTable();
      if (trimmed === '') {
        elements.push(<div key={li} className="h-2" />);
      } else if (trimmed.startsWith('- ')) {
        elements.push(
          <div key={li} className="flex items-start gap-1.5 ml-1">
            <span className="mt-[2px] text-muted-foreground">•</span>
            <span dangerouslySetInnerHTML={{ __html: renderInline(trimmed.slice(2)) }} />
          </div>,
        );
      } else {
        elements.push(<p key={li} dangerouslySetInnerHTML={{ __html: renderInline(trimmed) }} />);
      }
    }
  });
  flushTable();

  return <div className="space-y-0.5">{elements}</div>;
};

export default AiChatPanel;
