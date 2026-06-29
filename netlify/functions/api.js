const http = require('http');
const app = require('../../server');

let serverPromise;

function startServer() {
  if (serverPromise) return serverPromise;

  serverPromise = new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });

  return serverPromise;
}

function normalizePath(event) {
  let pathname = event.path || event.rawPath || '/';

  try {
    if (event.rawUrl) pathname = new URL(event.rawUrl).pathname;
  } catch (_) {}

  const functionPrefix = '/.netlify/functions/api';
  if (pathname.startsWith(functionPrefix)) {
    pathname = pathname.slice(functionPrefix.length) || '/';
  }

  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  return pathname;
}

function buildQueryString(event) {
  if (typeof event.rawQuery === 'string' && event.rawQuery) return event.rawQuery;

  const multi = event.multiValueQueryStringParameters || {};
  const single = event.queryStringParameters || {};
  const params = new URLSearchParams();

  for (const [key, values] of Object.entries(multi)) {
    if (Array.isArray(values)) {
      values.forEach((value) => params.append(key, value));
    }
  }

  for (const [key, value] of Object.entries(single)) {
    if (!params.has(key) && value != null) params.append(key, value);
  }

  return params.toString();
}

function buildHeaders(event) {
  const headers = { ...(event.headers || {}) };
  const originalHost = headers.host || headers.Host || headers['x-forwarded-host'] || headers['X-Forwarded-Host'];

  delete headers.connection;
  delete headers.Connection;
  delete headers['content-length'];
  delete headers['Content-Length'];
  delete headers['accept-encoding'];
  delete headers['Accept-Encoding'];

  if (originalHost) headers.host = originalHost;
  headers['x-forwarded-proto'] = headers['x-forwarded-proto'] || headers['X-Forwarded-Proto'] || 'https';

  return headers;
}

function isTextResponse(headers) {
  const contentType = String(headers.get('content-type') || '').toLowerCase();
  return (
    contentType.startsWith('text/') ||
    contentType.includes('json') ||
    contentType.includes('javascript') ||
    contentType.includes('xml') ||
    contentType.includes('svg') ||
    contentType.includes('x-www-form-urlencoded')
  );
}

exports.handler = async function handler(event) {
  const { port } = await startServer();
  const pathname = normalizePath(event);
  const query = buildQueryString(event);
  const url = `http://127.0.0.1:${port}${pathname}${query ? `?${query}` : ''}`;
  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  const hasBody = !['GET', 'HEAD'].includes(method.toUpperCase()) && event.body != null;

  const response = await fetch(url, {
    method,
    headers: buildHeaders(event),
    body: hasBody ? (event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : event.body) : undefined,
    redirect: 'manual',
  });

  const responseHeaders = {};
  response.headers.forEach((value, key) => {
    if (!['content-length', 'transfer-encoding'].includes(key.toLowerCase())) responseHeaders[key] = value;
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const textResponse = isTextResponse(response.headers);

  return {
    statusCode: response.status,
    headers: responseHeaders,
    body: textResponse ? buffer.toString('utf8') : buffer.toString('base64'),
    isBase64Encoded: !textResponse,
  };
};
