import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Settings,
  Send,
  User,
  FileText,
  MessageSquarePlus,
  LayoutDashboard,
  Mic,
  Plus,
} from "lucide-react";
import { mockAgents } from "@/types/agent";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function LifePlanAgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const agent = mockAgents.find((a) => a.id === id);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hello! I'm the **${agent?.name || "Agent"}**. I'm ready to help you create a care plan. Select an individual and tell me what you need.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");

  if (!agent) {
    return (
      <div className="flex flex-col min-h-screen w-full bg-background">
        <header className="h-16 flex items-center px-6 border-b border-border glass shrink-0">
          <button onClick={() => navigate("/lifeplan")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Life Plan
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Agent not found.</p>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: input.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Mock assistant response
    setTimeout(() => {
      const reply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Got it! I've noted those details. Would you like me to generate the plan now, or do you have more information to add?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
    }, 1000);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/lifeplan")}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-foreground text-sm">{agent.name}</h2>
              <p className="text-xs text-muted-foreground">{agent.planType}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
            <FileText className="w-3.5 h-3.5" /> Create Plan
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs transition-all border border-border"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </motion.button>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      {/* Agent Hero */}
      <div className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-[1200px] mx-auto py-5 px-6 relative">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-lg">
              <Sparkles className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">{agent.name}</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">{agent.description}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  agent.status === "active"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-warning/10 text-warning border border-warning/20"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${agent.status === "active" ? "bg-primary" : "bg-warning"}`} />
                  {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                </span>
                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">{agent.planType}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col max-w-[900px] mx-auto w-full px-6">
        <div className="flex-1 overflow-y-auto py-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                msg.role === "assistant" ? "bg-primary/10" : "bg-muted"
              }`}>
                {msg.role === "assistant" ? (
                  <Sparkles className="h-4 w-4 text-primary" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                msg.role === "assistant" ? "bg-muted/50 text-foreground" : "bg-primary text-primary-foreground"
              }`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <span className="text-[10px] opacity-60 mt-1 block">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="py-4 border-t border-border">
          <div className="glass rounded-2xl p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Describe the plan details, goals, or provide assessments..."
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none text-sm min-h-[40px] max-h-[100px]"
              rows={2}
            />
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
              <div className="flex gap-1">
                <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSend}
                  className="p-2 rounded-lg gradient-primary text-primary-foreground transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
