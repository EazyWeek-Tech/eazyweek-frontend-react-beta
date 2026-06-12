import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 🔁 Replace this with your actual backend base URL
//const BACKEND_URL = "http://localhost:8080";  

const BACKEND_URL = "https://eazyweek-beta-api-bdega7b0gza8g8bh.uaenorth-01.azurewebsites.net";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // All /api/* requests in dev will be forwarded to the backend
      "/api": {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: true,
        // Uncomment below if you need to rewrite the path prefix:
        // rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
});