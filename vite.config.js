import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Phase 29B: bản phát hành tĩnh chạy được ở mọi thư mục / đường dẫn con
// (Netlify, Vercel, GitHub Pages: https://<user>.github.io/<repo>/) nhờ base
// tương đối. Thư viện lớn tách thành file riêng để trình duyệt cache lâu.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true },
  build: {
    chunkSizeWarningLimit: 2600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          // three.js dùng ở cả màn chính (systems/constants) → một file riêng.
          // Rapier / R3F / drei để Rollup tự tách theo import động (MatchCanvas,
          // TrophyCanvas), nên chỉ tải khi cần.
          if (id.includes('/three/')) return 'three'
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          return undefined
        },
      },
    },
  },
})
