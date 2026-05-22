import { ChevronDown, User, Settings, Clock, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";
import employeePhoto from "@/assets/employee-kathy.jpg";

export function UserMenu() {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const [clockedIn, setClockedIn] = useState<string | null>(() => localStorage.getItem("icm.clockedInAt"));

  useEffect(() => {
    if (clockedIn) localStorage.setItem("icm.clockedInAt", clockedIn);
    else localStorage.removeItem("icm.clockedInAt");
  }, [clockedIn]);

  const handleClockIn = () => {
    if (clockedIn) return;
    const now = new Date().toISOString();
    setClockedIn(now);
    toast.success("Clocked in", { description: `Shift started at ${new Date(now).toLocaleTimeString()}` });
  };

  const handleClockOut = () => {
    if (!clockedIn) return;
    const mins = Math.round((Date.now() - new Date(clockedIn).getTime()) / 60000);
    setClockedIn(null);
    toast.success("Clocked out", { description: `Shift logged: ${Math.floor(mins / 60)}h ${mins % 60}m` });
  };

  const handleSignOut = () => {
    toast("Signed out", { description: "Returning to login." });
    setTimeout(() => navigate("/login"), 400);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 pl-1 pr-1 sm:pr-2 py-1 rounded-xl hover:bg-icm-bg transition-colors">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-icm-accent/20 bg-icm-accent-soft">
            <img
              src={employeePhoto}
              alt="Kathy Adams"
              width={32}
              height={32}
              loading="lazy"
              className="w-full h-full object-cover"
            />
            {clockedIn && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-icm-green ring-2 ring-icm-panel" />
            )}
          </div>
          <ChevronDown className="w-3 h-3 text-icm-text-faint hidden sm:inline" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-icm-accent/20">
            <img src={employeePhoto} alt="Kathy Adams" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-tight">Kathy Adams</p>
            <p className="text-[11px] text-muted-foreground truncate">kathy@icaremanager.com</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings/users/u-002")} className="gap-2 text-[12.5px]">
          <User className="w-4 h-4 text-muted-foreground" /> My profile
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2 text-[12.5px]">
            <Settings className="w-4 h-4 text-muted-foreground" /> Settings
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleClockIn}
          disabled={!!clockedIn}
          className={cn(
            "gap-2 text-[12.5px]",
            !clockedIn && "bg-icm-accent-soft text-icm-accent focus:bg-icm-accent-soft focus:text-icm-accent font-medium"
          )}
        >
          <Clock className={cn("w-4 h-4", !clockedIn ? "text-icm-accent" : "text-muted-foreground")} />
          <span className="flex-1">Clock in</span>
          {clockedIn && (
            <span className="text-[10.5px] text-muted-foreground font-mono">
              {new Date(clockedIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleClockOut}
          disabled={!clockedIn}
          className={cn(
            "gap-2 text-[12.5px]",
            clockedIn && "bg-icm-green/10 text-icm-green focus:bg-icm-green/10 focus:text-icm-green font-medium"
          )}
        >
          <Clock className={cn("w-4 h-4", clockedIn ? "text-icm-green" : "text-muted-foreground")} />
          <span className="flex-1">Clock out</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-[12.5px] text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
