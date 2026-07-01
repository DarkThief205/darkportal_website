// Vercel serverless entrypoint for the Dark Portal Express app.
// Vercel rewrites /api/*, /auth/*, /bot-invite and /support-invite here.
// The __vercel_path query param preserves the original public path so the
// existing Express routes in ../server.js continue to work unchanged.

const app = require('../server');

function normalizeUrlForExpress(req) {
  try {
    const url = new URL(req.url || '/', 'https://darkportal.local');
    const originalPath = url.searchParams.get('__vercel_path');
    if (!originalPath) return;

    url.searchParams.delete('__vercel_path');
    const query = url.searchParams.toString();
    const path = originalPath.startsWith('/') ? originalPath : `/${originalPath}`;
    req.url = query ? `${path}?${query}` : path;
  } catch {
    // If URL parsing ever fails, fall through to the original Vercel URL.
  }
}

module.exports = (req, res) => {
  normalizeUrlForExpress(req);
  return app(req, res);
};

module.exports.default = module.exports;
