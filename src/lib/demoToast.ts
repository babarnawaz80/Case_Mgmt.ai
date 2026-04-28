import { toast } from "sonner";

/**
 * Used for demo-mode buttons that don't yet have real behavior wired.
 * Keeps the UI feeling alive without surfacing console errors.
 */
export function demoToast(label?: string) {
  toast(label ?? "Available in next demo build", {
    description: "This control is part of the roadmap and will be enabled soon.",
  });
}

export function demoSuccess(label: string, description?: string) {
  toast.success(label, description ? { description } : undefined);
}

export function demoInfo(label: string, description?: string) {
  toast(label, description ? { description } : undefined);
}
