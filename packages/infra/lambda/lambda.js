/**
 * Fleet OS API — Lambda handler (free tier: 1M requests/month)
 * Wraps the NestJS app for serverless deployment.
 */

// Placeholder — NestJS app will be bundled here via esbuild
exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Fleet OS API',
      path: event.path,
      method: event.httpMethod,
      timestamp: new Date().toISOString(),
    }),
  };
};
