import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { db, auth } from "./lib/firebase.ts";

// Expose Firebase instances for browser-console dev scripts (non-production only)
if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_CONSOLE_TOOLS === 'true') {
  (window as any).__db = db;
  (window as any).__auth = auth;
  (window as any).__firebase_compat = true;
}

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
