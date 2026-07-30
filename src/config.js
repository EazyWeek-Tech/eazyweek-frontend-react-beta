// src/config.js
const url = import.meta.env.VITE_API_BASE_URL;

if (!url) {
  throw new Error(
    "VITE_API_BASE_URL was not set at build time. " +
    "Set it in the deploy workflow's build step, or in .env.local for local dev."
  );
}

export const API_BASE_URL = url.replace(/\/+$/, "");
