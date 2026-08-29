/**
 * Production server.
 *
 * The app was built for Vercel, where `api/*.js` are serverless functions and
 * `dist/` is served by the platform. Railway gives you one process instead, so
 * this mounts the same handlers and serves the built SPA, keeping the two
 * deployment targets behaviourally identical.
 *
 * Usage: node server.mjs   (PORT defaults to 3000)
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

/** Vercel-style handlers, loaded once at boot. */
const routes = new Map([
  ['/api/db', (await import('./api/db.js')).default],
  ['/api/withdraw', (await import('./api/withdraw.js')).default],
]);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        // Handlers only ever expect JSON; surface a parse failure as an empty
        // body so they can reject it with their own 400.
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

/** Gives the handler the small slice of the Vercel response API it uses. */
function wrapResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
    return res;
  };
  res.send = (payload) => {
    res.end(payload);
    return res;
  };
  return res;
}

async function serveStatic(req, res, pathname) {
  // Reject traversal before it reaches the filesystem.
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(DIST, safe);
  if (!filePath.startsWith(DIST)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  try {
    const info = await stat(filePath);
    if (info.isFile()) {
      const ext = extname(filePath).toLowerCase();
      res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
      // Hashed build assets are immutable; everything else must revalidate.
      res.setHeader(
        'Cache-Control',
        safe.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
      );
      return res.end(await readFile(filePath));
    }
  } catch {
    // fall through to the SPA entry point
  }

  // Client-side routing: unknown paths render the app.
  res.setHeader('Content-Type', MIME['.html']);
  res.setHeader('Cache-Control', 'no-cache');
  res.end(await readFile(join(DIST, 'index.html')));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/healthz') {
    res.statusCode = 200;
    return res.end('ok');
  }

  const handler = routes.get(url.pathname);
  if (handler) {
    try {
      req.body = req.method === 'POST' ? await readBody(req) : {};
      req.query = Object.fromEntries(url.searchParams);
      return await handler(req, wrapResponse(res));
    } catch (err) {
      console.error(`[server] ${url.pathname} failed:`, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      return res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  if (url.pathname.startsWith('/api/')) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'Not found' }));
  }

  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Private-Pay listening on :${PORT}`);
});
