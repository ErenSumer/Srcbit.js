const fs = require("fs");
const path = require("path");

/**
 * Router class for handling HTTP routing.
 */
class Router {
  /**
   * Create a new Router instance.
   * @param {string} [prefix=''] - The prefix for all routes in this router.
   */
  constructor(prefix = "") {
    this.routes = {
      GET: [],
      POST: [],
      PUT: [],
      DELETE: [],
      PATCH: [],
    };
    this.globalMiddlewares = [];
    this.debugMode = false;
    this.prefix = prefix;
    this.hasDefinedRoutes = false;
  }

  /**
   * Set debug mode for the router.
   * @param {boolean} mode - Whether to enable debug mode.
   */
  setDebugMode(mode) {
    this.debugMode = mode;
  }

  /**
   * Add a middleware or sub-router to the current router.
   * @param {string|function} pathOrMiddleware - The path or middleware function.
   * @param {Router} [router] - The sub-router to add.
   */
  use(pathOrMiddleware, handlerOrRouter) {
    if (typeof pathOrMiddleware === "function") {
      // It's a middleware function
      this.globalMiddlewares.push(pathOrMiddleware);
    } else if (handlerOrRouter instanceof Router) {
      // It's a router instance
      this.mergeRouter(pathOrMiddleware, handlerOrRouter);
    } else if (typeof handlerOrRouter === "function") {
      // It's a path-specific middleware
      this.globalMiddlewares.push({
        path: pathOrMiddleware,
        handler: handlerOrRouter,
      });
    } else {
      throw new Error("Invalid middleware or router");
    }
  }

  mergeRouter(path, router) {
    Object.keys(router.routes).forEach((method) => {
      router.routes[method].forEach((route) => {
        const fullPath = path + route.path;
        this.addRoute(method, fullPath, route.handlers);
      });
    });
  }
  /**
   * 
   * @returns {undefined}
   */
  getWelcomePage() {
    return fs.readFileSync(path.join(__dirname, './templates/welcome.html'), 'utf8');
  }
  /**
   * Add a route to the router.
   * @param {string} method - The HTTP method.
   * @param {string} path - The route path.
   * @param {function[]} handlers - The route handlers.
   */
  addRoute(method, path, handlers) {
    this.hasDefinedRoutes = true;
    if (path instanceof RegExp) {
      // If path is already a RegExp, use it directly
      this.routes[method].push({
        regex: path,
        params: [],
        handlers,
        priority: 0,
        path: path.toString(),
      });
    } else {
      // Existing string path logic
      const routeParts = path.split("/").filter((part) => part !== "");
      const params = [];
      const regexParts = routeParts.map((part) => {
        if (part.startsWith(":")) {
          params.push(part.slice(1));
          return "([^/]+)";
        } else if (part === "*") {
          params.push("*");
          return "(.*)";
        }
        return part;
      });

      const regex = new RegExp(`^/${regexParts.join("/")}/?$`);
      const priority = routeParts.filter((part) => part !== "*").length;
      this.routes[method].push({ regex, params, handlers, priority, path });
    }

    this.routes[method].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Add a GET route.
   * @param {string} path - The route path.
   * @param {...function} handlers - The route handlers.
   */
  get(path, ...handlers) {
    this.addRoute("GET", path, handlers);
  }

  /**
   * Add a POST route.
   * @param {string} path - The route path.
   * @param {...function} handlers - The route handlers.
   */
  post(path, ...handlers) {
    this.addRoute("POST", path, handlers);
  }

  /**
   * Add a PUT route.
   * @param {string} path - The route path.
   * @param {...function} handlers - The route handlers.
   */
  put(path, ...handlers) {
    this.addRoute("PUT", path, handlers);
  }

  /**
   * Add a DELETE route.
   * @param {string} path - The route path.
   * @param {...function} handlers - The route handlers.
   */
  delete(path, ...handlers) {
    this.addRoute("DELETE", path, handlers);
  }

  /**
   * Add a PATCH route.
   * @param {string} path - The route path.
   * @param {...function} handlers - The route handlers.
   */
  patch(path, ...handlers) {
    this.addRoute("PATCH", path, handlers);
  }

  /**
   * Handle an incoming request.
   * @param {Request} request - The request object.
   * @param {Response} response - The response object.
   */
  async handle(request, response) {
    try {
      // Run global middlewares
      for (const middleware of this.globalMiddlewares) {
        if (typeof middleware === "function") {
          await middleware(request, response, () => {});
        } else if (request.path.startsWith(middleware.path)) {
          await middleware.handler(request, response, () => {});
        }
        if (response.raw.headersSent) return;
      }

      // Find matching route
      const method = request.method;
      const path = request.path;
      const route = this.routes[method].find((r) => r.regex.test(path));

      if (route) {
        const match = path.match(route.regex);
        route.params.forEach((param, index) => {
          if (param === "*") {
            request.params[param] = match[index + 1] || "";
          } else {
            request.params[param] = match[index + 1];
          }
        });

        // Run route-specific middlewares and handlers
        for (const handler of route.handlers) {
          await new Promise((resolve, reject) => {
            handler(request, response, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          if (response.raw.headersSent) return;
        }
      } else if (path === "/" || path === "" && !this.hasDefinedRoutes) {
        const welcomePage = this.getWelcomePage();
      response.status(200).header("Content-Type", "text/html").send(welcomePage);
      }
      else {
        response.status(404).json({ error: "Not Found" });
      }
    } catch (error) {
      if (this.debugMode) {
        const htmlTemplate = fs.readFileSync(
          path.join(__dirname, "./templates/error-page.html"),
          "utf8"
        );
        const errorHtml = htmlTemplate
          .replace("{{ERROR_MESSAGE}}", error.message)
          .replace("{{ERROR_STACK}}", error.stack)
          .replace("{{REQUEST_METHOD}}", request.method)
          .replace("{{REQUEST_URL}}", request.url)
          .replace(
            "{{REQUEST_HEADERS}}",
            JSON.stringify(request.headers, null, 2)
          )
          .replace("{{REQUEST_BODY}}", JSON.stringify(request.body, null, 2));

        response
          .status(500)
          .header("Content-Type", "text/html")
          .send(errorHtml);
      } else {
        response.status(500).json({ error: "Internal Server Error" });
      }
    }
  }
}

module.exports = Router;
