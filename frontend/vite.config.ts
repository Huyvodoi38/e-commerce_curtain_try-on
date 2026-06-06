import path from 'node:path'
import type { IncomingMessage } from 'node:http'
import type { ProxyOptions } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_TARGET = 'http://127.0.0.1:8000'

/** Route SPA — không proxy sang FastAPI (BE không có các path này). */
const SPA_AUTH_PATHS = new Set(['/auth/callback'])

function isBackendAuthPath(pathname: string): boolean {
  return pathname.startsWith('/auth/') && !SPA_AUTH_PATHS.has(pathname)
}

/** Proxy API; /auth/google/* → BE; /auth/callback → React. */
function apiProxy(): ProxyOptions {
  return {
    target: API_TARGET,
    changeOrigin: true,
    bypass(req: IncomingMessage) {
      const url = req.url ?? ''
      const pathname = url.split('?')[0] ?? url
      if (isBackendAuthPath(pathname)) {
        return undefined
      }
      if (SPA_AUTH_PATHS.has(pathname) && req.method === 'GET') {
        return '/index.html'
      }
      const accept = req.headers.accept ?? ''
      // Chỉ SPA navigation thuần HTML — không chặn API (Accept thường có cả application/json)
      if (
        req.method === 'GET' &&
        accept.includes('text/html') &&
        !accept.includes('application/json')
      ) {
        return '/index.html'
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: 'localhost',
    open: true,
    proxy: {
      '/auth': apiProxy(),
      '/products': apiProxy(),
      '/categories': apiProxy(),
      '/promotions': apiProxy(),
      '/cart': apiProxy(),
      '/orders': apiProxy(),
      '/users': apiProxy(),
      '/audit-logs': apiProxy(),
      '/admin': apiProxy(),
      '/media': apiProxy(),
      '/ai': apiProxy(),
      '/reviews': apiProxy(),
      '/payments': apiProxy(),
    },
  },
})
