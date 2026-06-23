const http = require('http');
const { Duplex } = require('stream');
const { app, dbReady } = require('../../server');

class FakeSocket extends Duplex {
  _read() {}
  _write(chunk, encoding, callback) { callback(); }
}

function normalizeHeaders(headers = {}) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) {
    if (typeof value !== 'undefined' && value !== null) out[key.toLowerCase()] = String(value);
  }
  return out;
}

function buildUrl(event) {
  const host = event.headers?.host || event.headers?.Host || 'localhost';
  const raw = event.rawUrl || event.raw_url || `https://${host}${event.path || '/'}`;
  let url;
  try { url = new URL(raw); }
  catch { url = new URL(`https://${host}${event.path || '/'}`); }

  let pathname = url.pathname || '/';
  pathname = pathname.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, '') || '/';

  // Netlify redirects preserve the query string in rawUrl. If the fallback path was built
  // from event.path, append queryStringParameters manually.
  if (!url.search && event.queryStringParameters && Object.keys(event.queryStringParameters).length) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(event.queryStringParameters)) {
      if (Array.isArray(value)) value.forEach(v => qs.append(key, v));
      else if (value !== undefined && value !== null) qs.append(key, value);
    }
    return `${pathname}?${qs.toString()}`;
  }
  return `${pathname}${url.search || ''}`;
}

function createRequest(event) {
  const bodyBuffer = event.body
    ? Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
    : Buffer.alloc(0);

  const req = new http.IncomingMessage(new FakeSocket());
  req.url = buildUrl(event);
  req.method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  req.headers = normalizeHeaders(event.headers);
  req.rawHeaders = Object.entries(req.headers).flatMap(([k, v]) => [k, v]);
  req.connection = req.socket;

  if (bodyBuffer.length && !req.headers['content-length']) req.headers['content-length'] = String(bodyBuffer.length);

  process.nextTick(() => {
    if (bodyBuffer.length) req.push(bodyBuffer);
    req.push(null);
  });

  return req;
}

function runExpress(event) {
  return new Promise((resolve) => {
    const req = createRequest(event);
    const res = new http.ServerResponse(req);
    const chunks = [];
    const socket = new FakeSocket();

    socket.writable = true;
    res.assignSocket(socket);

    res.write = function write(chunk, encoding, callback) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      if (typeof encoding === 'function') encoding();
      if (typeof callback === 'function') callback();
      return true;
    };

    res.end = function end(chunk, encoding, callback) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      const headers = res.getHeaders();
      const body = Buffer.concat(chunks);
      res.finished = true;
      res.writableEnded = true;
      if (typeof encoding === 'function') encoding();
      if (typeof callback === 'function') callback();
      resolve({
        statusCode: res.statusCode || 200,
        headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v)])),
        body: body.toString('utf8'),
        isBase64Encoded: false
      });
      return res;
    };

    app(req, res, (err) => {
      if (err) {
        console.error(err);
        return resolve({ statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }), headers: { 'content-type': 'application/json' } });
      }
      return resolve({ statusCode: 404, body: JSON.stringify({ error: 'Not found' }), headers: { 'content-type': 'application/json' } });
    });
  });
}

exports.handler = async (event) => {
  try {
    await dbReady;
    return await runExpress(event);
  } catch (err) {
    console.error('Netlify function failed:', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Function failed to start' })
    };
  }
};
