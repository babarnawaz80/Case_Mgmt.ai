import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Plus,
  Camera,
  Mic,
  MessageSquare,
  Copy,
  Users,
  ClipboardList,
  AlertTriangle,
  FileText,
  Calendar,
  Heart,
  Search,
  Shield,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChatHistoryItem {
  id: string;
  title: string;
  preview: string;
  time: string;
}

const chatHistory: ChatHistoryItem[] = [
  { id: "1", title: "Compliance Review — Zone A", preview: "3 individuals flagged out of compliance...", time: "Today 08:15 AM" },
  { id: "2", title: "ISP Updates Due This Week", preview: "5 ISP reviews are due before Friday...", time: "Today 07:30 AM" },
  { id: "3", title: "High-Risk Individuals", preview: "2 individuals currently flagged as high-risk...", time: "Yesterday 04:45 PM" },
  { id: "4", title: "Monthly Progress Notes", preview: "12 progress notes pending completion...", time: "Yesterday 07:00 AM" },
  { id: "5", title: "Incident Follow-ups", preview: "3 incidents require follow-up documentation...", time: "Feb 18 03:20 PM" },
  { id: "6", title: "Training Compliance Check", preview: "4 staff members overdue on training...", time: "Feb 18 08:00 AM" },
];

const quickStats = [
  { label: "People Supported", value: "48", icon: Users },
  { label: "Pending Tasks", value: "5", icon: ClipboardList },
  { label: "Unsigned Notes", value: "3", icon: FileText },
  { label: "Critical Alerts", value: "2", icon: AlertTriangle, highlight: true },
];

const suggestedPrompts = [
  { icon: AlertTriangle, text: "Show incidents in the last 24 hours" },
  { icon: Heart, text: "Individuals with overdue health assessments" },
  { icon: Shield, text: "Who is out of PCP compliance?" },
  { icon: Calendar, text: "Any overdue ISP reviews?" },
  { icon: Search, text: "Who am I seeing today?" },
  { icon: Users, text: "New admissions since my last shift" },
  { icon: FileText, text: "Pending notes awaiting signature" },
  { icon: ClipboardList, text: "Show high-risk individuals" },
];

const individuals = [
  "Select Individual",
  "John Doe",
  "Jane Smith",
  "Robert Johnson",
  "Maria Garcia",
  "David Wilson",
];

const Index = () => {
  const [message, setMessage] = useState("");
  const [historyOpen, setHistoryOpen] = useState(true);
  const [selectedIndividual, setSelectedIndividual] = useState(individuals[0]);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Collapsible Chat History Sidebar */}
      <AnimatePresence initial={false}>
        {historyOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-r border-border flex flex-col shrink-0 overflow-hidden bg-card/50"
          >
            <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
              <h3 className="font-display font-semibold text-foreground text-sm">Chat History</h3>
              <div className="flex gap-1">
                <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {chatHistory.map((item) => (
                <button
                  key={item.id}
                  className="w-full text-left px-4 py-3 hover:bg-secondary/60 transition-colors border-b border-border/30"
                >
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.preview}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{item.time}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              {historyOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold text-foreground">CaseAI Assistant</span>
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Individual Selector */}
            <div className="relative">
              <select
                value={selectedIndividual}
                onChange={(e) => setSelectedIndividual(e.target.value)}
                className="appearance-none glass rounded-lg px-4 py-2 pr-8 text-sm text-foreground bg-secondary border border-border cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {individuals.map((ind) => (
                  <option key={ind} value={ind} className="bg-card text-foreground">{ind}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Dashboard Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm transition-all border border-border"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </motion.button>

            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </header>

        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center max-w-2xl"
          >
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center animate-float">
                <Sparkles className="w-7 h-7 text-primary-foreground" />
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              Good evening, Case Manager
            </h1>
            <p className="text-muted-foreground text-lg">
              Your <span className="text-primary font-medium">AI companion</span> is ready to assist your shift
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4 mt-8"
          >
            {quickStats.map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-xl px-5 py-4 flex flex-col items-center gap-1 min-w-[120px]"
              >
                <stat.icon className={`w-5 h-5 ${stat.highlight ? "text-destructive" : "text-muted-foreground"}`} />
                <span className={`text-2xl font-display font-bold ${stat.highlight ? "text-destructive" : "text-foreground"}`}>
                  {stat.value}
                </span>
                <span className="text-[11px] text-muted-foreground text-center">{stat.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Chat Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-2xl mt-8"
          >
            <div className="glass rounded-2xl p-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about individuals, start documentation, or review cases..."
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none text-sm min-h-[44px] max-h-[120px]"
                rows={2}
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                <div className="flex gap-1">
                  <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button className="px-3 py-1.5 rounded-lg hover:bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5" />
                    Ambient
                  </button>
                  <button className="px-3 py-1.5 rounded-lg hover:bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Scribe
                  </button>
                  <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <Mic className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg gradient-primary text-primary-foreground transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Suggested Prompts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-2 mt-6 max-w-2xl"
          >
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setMessage(prompt.text)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full glass text-xs text-muted-foreground hover:text-foreground hover:glow-border transition-all duration-200"
              >
                <prompt.icon className="w-3.5 h-3.5 text-primary" />
                {prompt.text}
              </button>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Index;
