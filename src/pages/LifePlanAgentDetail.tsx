import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Send,
  User,
  FileText,
  LayoutDashboard,
  Mic,
  Plus,
  CheckCircle2,
  AlertTriangle,
  OctagonAlert,
  Gauge,
  FileWarning,
  ArrowRight,
  Shield,
} from "lucide-react";
import { mockAgents } from "@/types/agent";
import { cn } from "@/lib/utils";

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
      content: `Hello! I'm the **${agent?.name || "Agent"}**. I'm ready to help you create a compliant care plan. I will enforce all applicable state regulations and cite specific rule categories when blocking actions. Select an individual and tell me what you need.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");

  if (!agent) {
    return (
      <div className="flex flex-col min-h-screen w-full bg-background">
        <header className="h-16 flex items-center px-6 border-b border-border glass shrink-0">
          <button onClick={() => navigate("/lifeplan")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Compliance Agent
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

    setTimeout(() => {
      const reply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I've analyzed the request against the active rule pack. **Compliance check complete.** Here's what I found:\n\n✅ Eligibility criteria met\n⚠️ PCP missing employment interest language — *Warning: State guideline §3.2.1 requires employment preference documentation*\n❌ Combined service cap exceeded — *Hard Stop: §4.3.2 prohibits billing beyond authorized cap*\n\nI've auto-generated a PCP addendum and created a task for the authorization coordinator. Would you like me to proceed with the items that passed, or resolve the hard stop first?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
    }, 1200);
  };

  // Mock compliance data
  const complianceStatus = "needs_attention" as "compliant" | "needs_attention" | "cannot_submit";
  const capUsage = 90;
  const conflicts = 2;
  const missingDocs = 3;

  const statusConfig = {
    compliant: { label: "Compliant", icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
    needs_attention: { label: "Needs Attention", icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
    cannot_submit: { label: "Cannot Submit", icon: OctagonAlert, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
  };

  const status = statusConfig[complianceStatus];
  const StatusIcon = status.icon;

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/lifeplan")} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
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
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/dashboard")} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-xs transition-all border border-border">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </motion.button>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Agent Hero - compact */}
          <div className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-accent/5">
            <div className="max-w-[900px] mx-auto py-4 px-6 relative">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-lg shrink-0">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-display font-bold text-foreground">{agent.name}</h1>
                  <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium", agent.status === "active" ? "bg-primary/10 text-primary border border-primary/20" : "bg-warning/10 text-warning border border-warning/20")}>
                    <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", agent.status === "active" ? "bg-primary" : "bg-warning")} />
                    {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">{agent.planType}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col max-w-[900px] mx-auto w-full px-6">
            <div className="flex-1 overflow-y-auto py-6 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === "assistant" ? "bg-primary/10" : "bg-muted"}`}>
                    {msg.role === "assistant" ? <Sparkles className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${msg.role === "assistant" ? "bg-muted/50 text-foreground" : "bg-primary text-primary-foreground"}`}>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                    <span className="text-[10px] opacity-60 mt-1 block">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

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
                    <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Plus className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Mic className="w-4 h-4" /></button>
                    <button onClick={handleSend} className="p-2 rounded-lg gradient-primary text-primary-foreground transition-colors"><Send className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar - Compliance Panel */}
        <div className="w-[300px] border-l border-border bg-card/50 overflow-y-auto shrink-0 hidden lg:block">
          <div className="p-4 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Compliance Status</h3>

            {/* Status badge */}
            <div className={cn("p-3 rounded-xl border", status.bg, status.border)}>
              <div className="flex items-center gap-2">
                <StatusIcon className={cn("h-5 w-5", status.color)} />
                <span className={cn("text-sm font-semibold", status.color)}>{status.label}</span>
              </div>
            </div>

            {/* Cap usage meter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5 text-muted-foreground" /> Cap Usage
                </p>
                <span className={cn("text-xs font-bold", capUsage > 85 ? "text-warning" : "text-primary")}>{capUsage}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", capUsage > 85 ? "bg-warning" : "bg-primary")} style={{ width: `${capUsage}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">36 of 40 weekly hours used</p>
            </div>

            {/* Conflict alerts */}
            <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                  <OctagonAlert className="h-3.5 w-3.5" /> Conflicts
                </p>
                <span className="text-xs font-bold text-destructive">{conflicts}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">PCS/Day Hab overlap, School enrollment restriction</p>
              <button className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-xs font-medium text-destructive transition-all">
                Fix Now <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Missing docs */}
            <div className="p-3 rounded-xl border border-warning/20 bg-warning/5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-warning flex items-center gap-1.5">
                  <FileWarning className="h-3.5 w-3.5" /> Missing Docs
                </p>
                <span className="text-xs font-bold text-warning">{missingDocs}</span>
              </div>
              <ul className="space-y-1 mt-1.5">
                <li className="text-[10px] text-muted-foreground flex items-start gap-1">
                  <AlertTriangle className="h-2.5 w-2.5 text-warning mt-0.5 shrink-0" /> PCP Service Justification
                </li>
                <li className="text-[10px] text-muted-foreground flex items-start gap-1">
                  <AlertTriangle className="h-2.5 w-2.5 text-warning mt-0.5 shrink-0" /> Functional Assessment (expired)
                </li>
                <li className="text-[10px] text-muted-foreground flex items-start gap-1">
                  <AlertTriangle className="h-2.5 w-2.5 text-warning mt-0.5 shrink-0" /> Employment Interest Doc
                </li>
              </ul>
              <button className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 hover:bg-warning/20 text-xs font-medium text-warning transition-all">
                Fix Now <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Agent personality */}
            <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Shield className="h-3 w-3" /> Agent Personality
              </p>
              <div className="flex flex-wrap gap-1">
                {["Professional", "Compliance-focused", "Clear", "No guessing", "Cites rules"].map((trait) => (
                  <span key={trait} className="px-2 py-0.5 rounded bg-muted/50 text-[9px] font-medium text-muted-foreground">{trait}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
