const fs = require("fs");
const path = require("path");

class Router {
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
  }

  setDebugMode(mode) {
    this.debugMode = mode;
  }

  use(pathOrMiddleware, router) {
    if (typeof pathOrMiddleware === 'function') {
      // It's a middleware function
      this.globalMiddlewares.push(pathOrMiddleware);
    } else if (router instanceof Router) {
      // It's a router instance
      const path = pathOrMiddleware;
      Object.keys(router.routes).forEach(method => {
        router.routes[method].forEach(route => {
          const fullPath = path + route.path;
          this.addRoute(method, fullPath, route.handlers);
        });
      });
    } else {
      throw new Error('Invalid middleware or router');
    }
  }
  

  addRoute(method, path, handlers) {
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

    this.routes[method].sort((a, b) => b.priority - a.priority);
  }

  get(path, ...handlers) {
    this.addRoute("GET", path, handlers);
  }

  post(path, ...handlers) {
    this.addRoute("POST", path, handlers);
  }

  put(path, ...handlers) {
    this.addRoute("PUT", path, handlers);
  }

  delete(path, ...handlers) {
    this.addRoute("DELETE", path, handlers);
  }

  patch(path, ...handlers) {
    this.addRoute("PATCH", path, handlers);
  }

  async handle(request, response) {
    try {
      // Run global middlewares
      for (const middleware of this.globalMiddlewares) {
        await new Promise((resolve, reject) => {
          middleware(request, response, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
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
      } else {
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
