import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    open: true
  },
  optimizeDeps: {
    include: ['@moonwell-fi/moonwell-sdk', '@metamask/delegation-toolkit']
  }
})
