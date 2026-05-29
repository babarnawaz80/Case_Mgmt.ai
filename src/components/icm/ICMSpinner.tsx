// ICMSpinner — CaseManagement.AI logo icon with smooth spin animation.
// Uses the actual cm-favicon.png brand icon (3D pentagon blob).
// Use ICMSpinner for full-page/large loading states.
// Use ICMLoadingOverlay for centered page-level loading.
import { cn } from "@/lib/utils";
import cmFavicon from "/cm-favicon.png";

interface ICMSpinnerProps {
  size?: number;
  className?: string;
  /** Duration of one full rotation in ms. Default: 1400ms (smooth, not frantic) */
  durationMs?: number;
}

export function ICMSpinner({ size = 32, className, durationMs = 1400 }: ICMSpinnerProps) {
  return (
    <>
      <style>{`
        @keyframes icm-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
      <span
        className={cn("inline-flex items-center justify-center", className)}
        role="status"
        aria-label="Loading…"
        style={{
          animation: `icm-spin ${durationMs}ms linear infinite`,
          display: "inline-flex",
        }}
      >
        <img
          src={cmFavicon}
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: "contain", display: "block" }}
        />
      </span>
    </>
  );
}

// Full-page centered loading overlay
export function ICMLoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <ICMSpinner size={48} />
      {message && (
        <p className="text-[12px] text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
