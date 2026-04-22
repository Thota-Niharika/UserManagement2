import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import http from 'http'

// Disable keep-alive to fix: "Parse Error: Expected LF after chunk data"
const noKeepAliveAgent = new http.Agent({ keepAlive: false })

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://192.168.1.22:8090',
        changeOrigin: true,
        secure: false,
        agent: noKeepAliveAgent,
        bypass: (req, res, proxyOptions) => {
          // If the request is for a file that exists in the public directory, bypass proxy
          const decodedUrl = decodeURIComponent(req.url);
          const publicFilePath = path.join(process.cwd(), 'public', decodedUrl.replace(/^\//, ''));

          if (fs.existsSync(publicFilePath) && fs.lstatSync(publicFilePath).isFile()) {
            console.log(`[Proxy Bypass] Serving from public: ${decodedUrl}`);
            return req.url;
          }
        },
        onProxyReq: (proxyReq, req, res) => {
          let ct = req.headers['content-type'] || '';
          if (Array.isArray(ct)) ct = ct[0];

          if (typeof ct === 'string' && ct.toLowerCase().includes('multipart/form-data')) {
            // 🔥 FIX: Keep boundary but remove charset which causes Spring Boot to fail
            const cleanCT = ct.split(';').filter(part => !part.trim().toLowerCase().startsWith('charset')).join(';');
            if (ct !== cleanCT) {
              proxyReq.setHeader('content-type', cleanCT);
              console.log(`[Proxy] Multipart CT Cleaned: ${ct} → ${cleanCT}`);
            }
          }

          // Force Identity encoding so backend calculates Content-Length 
          // instead of using 'Transfer-Encoding: chunked' which it is corrupting
          proxyReq.setHeader('accept-encoding', 'identity')
          console.log(`[PROXY REQ] ${req.method} ${req.url} → http://192.168.1.22:8090`);
        },
        onProxyRes: (proxyRes, req, res) => {
          console.log(`[PROXY RES] ${req.url} → ${proxyRes.statusCode}`);
        },
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('[Proxy Error]', err.message)
          })
        }
      },
      // Keep /uploads/** proxy in case any image src uses /uploads/
      '^/uploads': {
        target: 'http://192.168.1.22:8090',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => {
          // Fully decode multi-encoded URLs (e.g. %2525252F → /) then re-encode once
          let decoded = p.replace(/^\/uploads/, '');
          let prev;
          do { prev = decoded; try { decoded = decodeURIComponent(decoded); } catch(e) { break; } } while (decoded !== prev);
          const segments = decoded.replace(/^\/+/, '').split('/');
          const reEncoded = segments.map(s => encodeURIComponent(s)).join('/');
          
          // Re-adding /uploads since backend serves at /uploads/ directly as per your previous instruction
          return `/uploads/${reEncoded}`;
        },
        onProxyReq: (proxyReq, req, res) => {
          console.log(`[PROXY UPLOADS REQ] ${req.method} ${req.url}`);
        },
        onProxyRes: (proxyRes, req, res) => {
          console.log(`[PROXY UPLOADS RES] ${req.url} → ${proxyRes.statusCode}`);
        }
      }
    }
  }
})