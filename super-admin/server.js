// Custom server with proxy for API requests
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { createProxyMiddleware } = require('http-proxy-middleware');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Create proxy middleware for API requests
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api', // No change needed since both have /api
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.url} to http://localhost:8000${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`Received response ${proxyRes.statusCode} from http://localhost:8000${req.url}`);
  },
});

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    
    // Handle API routes through proxy
    if (parsedUrl.pathname.startsWith('/api/')) {
      // Don't call handle() in the callback, let the proxy handle the response
      return apiProxy(req, res);
    }
    
    // Handle other routes with Next.js
    handle(req, res, parsedUrl);
  }).listen(4100, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:4100');
  });
});