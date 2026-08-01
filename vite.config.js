import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// GitHub Pages project sites are served from https://<user>.github.io/<repo>/,
// so every asset URL needs that /<repo>/ prefix. Set it via an env var so
// `npm run dev` and `npm run build` locally still use "/", while the GitHub
// Actions workflow (.github/workflows/deploy.yml) passes the real repo name.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES_BASE || '/',
  build: {
    chunkSizeWarningLimit: 800,
  },
})
