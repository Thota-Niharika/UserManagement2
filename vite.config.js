// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     host: true,
//     proxy: {

//       '/api': {
//         target: 'http://192.168.1.70:8080',
//         changeOrigin: true,
//         secure: false,
//         onProxyReq: (proxyReq, req) => {
//           let ct = proxyReq.getHeader('content-type') || req.headers['content-type'] || '';
//           if (Array.isArray(ct)) ct = ct[0];

//           if (typeof ct === 'string' && ct.toLowerCase().includes('multipart/form-data')) {
//             // Remove charset=UTF-8 if present
//             const cleaned = ct.replace(/;\s*charset=utf-8/gi, '');

//             if (ct !== cleaned) {
//               proxyReq.setHeader('content-type', cleaned);
//               console.log(`[Proxy] Multipart Charset Stripped: ${ct} -> ${cleaned}`);
//             }
//           }
//         }
//       }
//     }
//   }
// })


// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     host: true,
//     proxy: {
//       // This RegExp matches /api + optional / + anything after (covers /api/onboarding/, /api/files/, etc.)
//       '^/api(/.*)?$': {
//         target: 'http://192.168.1.70:8080',
//         changeOrigin: true,
//         secure: false,
//         // Keep your multipart/form-data fix (only impacts file uploads)
//         onProxyReq: (proxyReq, req) => {
//           let ct = proxyReq.getHeader('content-type') || req.headers['content-type'] || '';
//           if (Array.isArray(ct)) ct = ct[0];

//           if (typeof ct === 'string' && ct.toLowerCase().includes('multipart/form-data')) {
//             // Remove charset=UTF-8 if present
//             const cleaned = ct.replace(/;\s*charset=utf-8/gi, '');

//             if (ct !== cleaned) {
//               proxyReq.setHeader('content-type', cleaned);
//               console.log(`[Proxy] Multipart Charset Stripped: ${ct} -> ${cleaned}`);
//             }
//           }
//         },
//         // Add these for debugging — very helpful right now
//         configure: (proxy, _options) => {
//           proxy.on('proxyReq', (proxyReq, req) => {
//             console.log(`[Proxy REQ] ${req.method} ${req.url} → ${proxyReq.path}`);
//           });
//           proxy.on('proxyRes', (proxyRes, req) => {
//             console.log(`[Proxy RES] ${req.url} → status ${proxyRes.statusCode}`);
//           });
//           proxy.on('error', (err, req) => {
//             console.error(`[Proxy ERROR] ${req.url}: ${err.message}`);
//           });
//         }
//       }
//     }
//   }
// })
// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react()],

//   server: {
//     host: true,

//     proxy: {
//       '^/api': {
//         target: 'http://192.168.1.70:8080',
//         changeOrigin: true,
//         secure: false,

//         onProxyReq: (proxyReq, req) => {
//           let ct = proxyReq.getHeader('content-type') || req.headers['content-type'] || ''
//           if (Array.isArray(ct)) ct = ct[0]

//           if (typeof ct === 'string' && ct.toLowerCase().includes('multipart/form-data')) {
//             const cleaned = ct.replace(/;\s*charset=utf-8/gi, '')
//             if (ct !== cleaned) {
//               proxyReq.setHeader('content-type', cleaned)
//               console.log(`[Proxy] Multipart stripped: ${ct} → ${cleaned}`)
//             }
//           }
//         },

//         configure: (proxy) => {
//           proxy.on('proxyReq', (proxyReq, req) => {
//             console.log(`[PROXY REQ] ${req.method} ${req.url}`)
//           })
//           proxy.on('proxyRes', (proxyRes, req) => {
//             console.log(`[PROXY RES] ${req.url} → ${proxyRes.statusCode}`)
//           })
//           proxy.on('error', (err, req) => {
//             console.error(`[PROXY ERROR] ${req.url} → ${err.message}`)
//           })
//         }
//       },
//       '^/uploads': {
//         target: 'http://192.168.1.70:8080',
//         changeOrigin: true,
//         secure: false,
//         configure: (proxy) => {
//           proxy.on('proxyReq', (proxyReq, req) => {
//             console.log(`[PROXY UPLOADS REQ] ${req.method} ${req.url}`)
//           })
//           proxy.on('proxyRes', (proxyRes, req) => {
//             console.log(`[PROXY UPLOADS RES] ${req.url} → ${proxyRes.statusCode}`)
//           })
//         }
//       }
//     }
//   }
// })

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/UserManagement/',

  server: {
    host: true,

    proxy: {
      // This RegExp catches /api + EVERYTHING after it (including /api/onboarding/files/, /api/files/, etc.)
      '^/api(/.*)?$': {
        target: 'http://192.168.1.70:8080',
        changeOrigin: true,
        secure: false,

        onProxyReq: (proxyReq, req) => {
          let ct = proxyReq.getHeader('content-type') || req.headers['content-type'] || ''
          if (Array.isArray(ct)) ct = ct[0]

          if (typeof ct === 'string' && ct.toLowerCase().includes('multipart/form-data')) {
            const cleaned = ct.replace(/;\s*charset=utf-8/gi, '')
            if (ct !== cleaned) {
              proxyReq.setHeader('content-type', cleaned)
              console.log(`[Proxy] Multipart stripped: ${ct} → ${cleaned}`)
            }
          }
        },

        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log(`[PROXY REQ] ${req.method} ${req.url}`)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log(`[PROXY RES] ${req.url} → ${proxyRes.statusCode}`)
          })
          proxy.on('error', (err, req) => {
            console.error(`[PROXY ERROR] ${req.url} → ${err.message}`)
          })
        }
      },

      // Keep /uploads/** proxy in case any image src uses /uploads/ (optional but harmless)
      '^/uploads': {
        target: 'http://192.168.1.70:8080',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log(`[PROXY UPLOADS REQ] ${req.method} ${req.url}`)
          })
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log(`[PROXY UPLOADS RES] ${req.url} → ${proxyRes.statusCode}`)
          })
        }
      }
    }
  }
})