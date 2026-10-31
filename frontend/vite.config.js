import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During development, the React app (port 5173) forwards any /api request to
// the Django backend (port 8000). This avoids CORS problems while developing.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
