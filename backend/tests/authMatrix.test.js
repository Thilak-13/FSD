const app = require('../src/app');
const { requireAuth } = require('../src/middleware/auth');

/**
 * Mechanical Route Enumeration Helper for Express 4.x (Express 4.21.2)
 *
 * In Express 4, app._router.stack contains all middleware and route layers.
 * - Route layers have layer.route defined, containing:
 *   - route.path: string or array of strings (e.g. '/api/health' or ['/login', '/api/auth/login'])
 *   - route.methods: object with boolean flags per HTTP method (e.g. { get: true })
 *   - route.stack: array of middleware/handler layers for that specific route
 * - Router layers have layer.name === 'router' and layer.handle.stack containing sub-layers.
 *   - layer.regexp contains the regex used to match the mount prefix (e.g. /^\/api\/invoices\/?(?=\/|$)/i).
 *
 * This function recursively traverses all layers and inspects every route handler stack
 * to verify whether requireAuth is registered.
 */
function getMountPrefix(regexp) {
  if (!regexp || regexp.fast_slash) return '';
  return '/' + regexp.source.replace(/^\^\\\/|\\\/\?\(\?=\\\/\|\$\)$/g, '').replace(/\\\//g, '/');
}

function enumerateRoutes(stack, prefix = '', inheritedAuth = false) {
  const routes = [];
  let routerHasAuth = inheritedAuth;

  // Check if router level stack has requireAuth middleware applied globally
  for (const layer of stack) {
    if (
      !layer.route &&
      layer.handle &&
      (layer.handle === requireAuth ||
        layer.name === 'requireAuth' ||
        (layer.handle && layer.handle.name === 'requireAuth'))
    ) {
      routerHasAuth = true;
    }
  }

  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
      const rawPaths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];

      const hasRequireAuth =
        routerHasAuth ||
        layer.route.stack.some(
          (s) =>
            s.handle === requireAuth ||
            s.name === 'requireAuth' ||
            (s.handle && s.handle.name === 'requireAuth')
        );

      const middlewareNames = layer.route.stack.map(
        (s) => s.name || (s.handle && s.handle.name) || '<anonymous>'
      );

      for (const p of rawPaths) {
        let fullPath;
        if (p.startsWith(prefix)) {
          fullPath = p;
        } else {
          fullPath = (prefix + (p === '/' ? '' : p)) || '/';
        }

        for (const method of methods) {
          routes.push({
            method,
            path: fullPath,
            rawPath: p,
            hasRequireAuth,
            middlewares: middlewareNames,
          });
        }
      }
    } else if (layer.handle && layer.handle.stack) {
      const subPrefix = getMountPrefix(layer.regexp);
      routes.push(...enumerateRoutes(layer.handle.stack, subPrefix, routerHasAuth));
    }
  }

  return routes;
}

describe('Express Authorization Matrix Regression Guard', () => {
  const allowlist = new Set([
    'GET /api/health',
    'POST /api/auth/login',
  ]);

  const allRoutes = enumerateRoutes(app._router.stack);

  it('enumerates registered Express routes and asserts total count > 0', () => {
    expect(allRoutes.length).toBeGreaterThan(0);
  });

  it('guarantees every registered route has requireAuth middleware, except explicit allowlist', () => {
    const unauthenticatedRoutes = [];

    for (const route of allRoutes) {
      const routeKey = `${route.method} ${route.path}`;
      const isAllowed =
        allowlist.has(routeKey) ||
        (route.method === 'POST' && (route.path.endsWith('/login') || route.rawPath.endsWith('/login')));

      if (!isAllowed && !route.hasRequireAuth) {
        unauthenticatedRoutes.push(
          `${routeKey} (raw: ${route.rawPath}, middlewares: [${route.middlewares.join(', ')}])`
        );
      }
    }

    if (unauthenticatedRoutes.length > 0) {
      throw new Error(
        `[Security Regression] The following route(s) are missing requireAuth middleware:\n` +
          unauthenticatedRoutes.map((r) => `  - ${r}`).join('\n')
      );
    }

    expect(unauthenticatedRoutes).toEqual([]);
  });

  it('verifies explicit allowlist routes are indeed unprotected (login, health)', () => {
    const healthRoute = allRoutes.find(
      (r) => r.method === 'GET' && r.path === '/api/health'
    );
    expect(healthRoute).toBeDefined();
    expect(healthRoute.hasRequireAuth).toBe(false);

    const loginRoute = allRoutes.find(
      (r) => r.method === 'POST' && (r.path === '/api/auth/login' || r.rawPath === '/login')
    );
    expect(loginRoute).toBeDefined();
    expect(loginRoute.hasRequireAuth).toBe(false);
  });
});
