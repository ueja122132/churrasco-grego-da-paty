import { createClient } from "@supabase/supabase-js";
import { io, Socket } from "socket.io-client";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Socket initialization with better error handling
export const socket: Socket = io({
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  timeout: 10000,
});

// Suppress benign environment errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = event.reason?.toString() || '';
    const messageStr = event.reason?.message || '';
    if (
      reasonStr.includes('WebSocket') ||
      messageStr.includes('WebSocket') ||
      reasonStr.includes('closed without opened') ||
      messageStr.includes('closed without opened')
    ) {
      event.preventDefault();
      console.warn('Benign WebSocket error suppressed:', event.reason);
    }
  });
}

socket.on("connect_error", (err) => {
  console.warn("Socket connection error (normal in some proxy environments):", err.message);
});
