export default defineEventHandler((event) => {
  // Only handle requests to API routes
  if (!event.path.startsWith('/api/')) {
    return;
  }

  // Set CORS headers
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Id, Authorization',
    'Access-Control-Max-Age': '86400',
  });

  // Handle preflight requests
  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204);
    return '';
  }
});
