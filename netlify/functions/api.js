const serverless = require('serverless-http');
const app = require('../../server');

const handler = serverless(app, {
  request: (request, event) => {
    const headers = event.headers || {};
    const proto = headers['x-forwarded-proto'] || headers['X-Forwarded-Proto'] || 'https';
    const host = headers.host || headers.Host || 'localhost';
    let pathname = event.path || request.url || '/';
    pathname = pathname.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, '') || '/';
    request.url = pathname + (event.rawQuery ? `?${event.rawQuery}` : '');
    request.headers['x-forwarded-proto'] = proto;
    request.headers.host = host;
  }
});

function queryString(event) {
  if (event.rawQuery) return event.rawQuery;
  const params = event.queryStringParameters || {};
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

exports.handler = async (event, context) => {
  const headers = event.headers || {};
  const proto = headers['x-forwarded-proto'] || headers['X-Forwarded-Proto'] || 'https';
  const host = headers.host || headers.Host || 'localhost';
  let pathname = event.path || '/';

  pathname = pathname.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, '') || '/';
  event.path = pathname;
  const qs = queryString(event);
  event.rawUrl = `${proto}://${host}${pathname}${qs ? `?${qs}` : ''}`;

  return handler(event, context);
};
