import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Search, CheckSquare, Sparkles, LayoutGrid, List,
  Bot, TrendingUp, Users, FileCheck, LayoutDashboard, User,
  ArrowLeft, Shield, Layers,
} from "lucide-react";
import { LifePlanAgentCard } from "@/components/lifeplan/LifePlanAgentCard";
import { mockAgents } from "@/types/agent";
import { cn } from "@/lib/utils";

export default function LifePlanBoard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [layerFilter, setLayerFilter] = useState<"all" | "layer1" | "layer2">("all");
  const navigate = useNavigate();

  const filteredAgents = mockAgents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.planType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLayer = layerFilter === "all" || agent.layer === layerFilter;
    return matchesSearch && matchesLayer;
  });

  const layer1Count = mockAgents.filter((a) => a.layer === "layer1").length;
  const layer2Count = mockAgents.filter((a) => a.layer === "layer2").length;

  const overviewStats = [
    { label: "Total Agents", value: mockAgents.length.toString(), icon: Bot, trend: `${layer1Count} admin · ${layer2Count} CM` },
    { label: "Rule Packs", value: "12", icon: FileCheck, trend: "Published & active" },
    { label: "Active Users", value: "12", icon: Users, trend: "4 online now" },
    { label: "Compliance Rate", value: "94%", icon: TrendingUp, trend: "Denial prevention" },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-display font-semibold text-foreground text-lg">Life Plan</h2>
        </div>
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/")} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground font-medium text-sm transition-all">
            <Sparkles className="w-4 h-4" /> AI Companion
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/dashboard")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm transition-all border border-border">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </motion.button>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative mb-8 p-6 rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 border border-primary/10 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-lg">
                  <Layers className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Compliance Agent Platform</h1>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Two-phase architecture: Phase 1 (Train Agent) → Phase 2 (Execute Compliance)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/lifeplan/agent/new/layer1")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[hsl(var(--destructive))] to-[hsl(30,70%,55%)] text-destructive-foreground font-medium text-sm shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <Shield className="h-4 w-4" />
                  Train New Agent
                </button>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {overviewStats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{stat.label}</p>
                    <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10"><stat.icon className="h-5 w-5 text-primary" /></div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Layer filter + Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center rounded-xl border border-border p-1 bg-card">
              {([["all", "All Agents"], ["layer1", "Phase 1 (Training)"], ["layer2", "Phase 2 (Runtime)"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", layerFilter === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}
                  onClick={() => setLayerFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input placeholder="Search agents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex items-center rounded-lg border border-border p-1">
              <button className={cn("p-2 rounded-md transition-colors", viewMode === "grid" ? "bg-secondary" : "hover:bg-secondary/50")} onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></button>
              <button className={cn("p-2 rounded-md transition-colors", viewMode === "list" ? "bg-secondary" : "hover:bg-secondary/50")} onClick={() => setViewMode("list")}><List className="h-4 w-4" /></button>
            </div>
          </div>

          {/* Agent Cards */}
          {filteredAgents.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4"><Search className="h-8 w-8 text-muted-foreground" /></div>
              <p className="text-lg font-medium mb-1">No agents found</p>
              <p className="text-muted-foreground">Try adjusting your search or layer filter</p>
            </div>
          ) : (
            <div className={cn(viewMode === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-5" : "flex flex-col gap-4")}>
              {filteredAgents.map((agent, i) => (
                <motion.div key={agent.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                  <LifePlanAgentCard
                    agent={agent}
                    colorIndex={i}
                    onClick={() => {
                      if (agent.layer === "layer1") {
                        navigate("/lifeplan/agent/new/layer1");
                      } else {
                        navigate("/lifeplan/agent/new/layer2");
                      }
                    }}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
