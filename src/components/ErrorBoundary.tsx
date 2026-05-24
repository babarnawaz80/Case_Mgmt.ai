import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary — catches any React render error and shows a
 * recoverable UI instead of a blank white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production this could be sent to a monitoring service
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-icm-bg flex items-center justify-center p-6">
          <div className="rounded-2xl border border-icm-border bg-icm-panel p-10 max-w-md w-full text-center shadow-elevated">
            <div className="w-14 h-14 rounded-2xl bg-icm-red/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-icm-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h1 className="font-manrope font-extrabold text-[20px] text-icm-text mb-2">
              Something went wrong
            </h1>
            <p className="text-[13px] font-geist text-icm-text-dim mb-1 leading-relaxed">
              An unexpected error occurred in this section.
            </p>
            {this.state.error && (
              <p className="text-[11px] font-mono text-icm-text-faint bg-icm-bg rounded-lg px-3 py-2 mt-2 text-left break-words">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-2 justify-center mt-6">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="h-9 px-4 rounded-xl border border-icm-border text-[12.5px] font-geist font-medium text-icm-text hover:bg-icm-bg"
              >
                Try again
              </button>
              <button
                onClick={() => { window.location.href = "/dashboard"; }}
                className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12.5px] font-geist font-medium hover:opacity-90"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
