import { toast } from "sonner";

/**
 * Used for controls that are UI-complete but don't have a backend
 * action wired yet. Shows a neutral informational toast.
 */
export function demoToast(label?: string) {
  toast(label ?? "Action noted", {
    description: "This feature will be fully active in an upcoming update.",
  });
}

export function demoSuccess(label: string, description?: string) {
  toast.success(label, description ? { description } : undefined);
}

export function demoInfo(label: string, description?: string) {
  toast(label, description ? { description } : undefined);
}
