import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Security headers that are safe to send even during local development
// (i.e. they don't touch script-src, so they never conflict with Vite's
// Fast Refresh preamble or HMR websocket). The strict Content-Security-Policy
// used in production lives in public/_headers and vercel.json instead, since
// it must be a real HTTP header from the hosting platform, not the dev
// server, and it intentionally forbids the inline script that dev-only HMR
// relies on.
const devSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'geolocation=(self), camera=(), microphone=()',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: devSecurityHeaders,
  },
  preview: {
    headers: devSecurityHeaders,
  },
})
