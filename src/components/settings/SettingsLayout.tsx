import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { useRole } from "@/contexts/RoleContext";
import { AdminOnly } from "@/components/platform/AdminOnly";
import { ChevronLeft, Settings as SettingsIcon } from "lucide-react";

interface SettingsLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function SettingsLayout({ title, subtitle, children, actions }: SettingsLayoutProps) {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  if (!isAdmin) return <AdminOnly />;

  return (
    <ICMShell title={title} showAIPanel={false}>
      <div className="space-y-5 max-w-[1200px]">
        <div className="text-[11.5px] font-geist text-icm-text-dim flex items-center gap-1.5">
          <SettingsIcon className="w-3.5 h-3.5" />
          <button
            onClick={() => navigate("/settings")}
            className="hover:text-icm-text transition-colors"
          >
            Admin Settings
          </button>
          <span>›</span>
          <span className="text-icm-text font-medium">{title}</span>
        </div>

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <button
              onClick={() => navigate("/settings")}
              className="text-[11.5px] font-geist text-icm-text-dim hover:text-icm-text transition-colors inline-flex items-center gap-1 mb-2"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Settings
            </button>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[13px] text-icm-text-dim mt-1 font-geist max-w-[700px]">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>

        {children}
      </div>
    </ICMShell>
  );
}
