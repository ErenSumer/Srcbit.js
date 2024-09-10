const http = require("http");
const Router = require("./core/router");
const Request = require("./core/request");
const Response = require("./core/response");
const staticFileMiddleware = require("./middleware/staticServing");
const corsMiddleware = require("./core/cors");
const Validator = require("./core/validator");
const ViewSet = require("./core/viewsets");
const Cache = require("./utils/cache");
const Serializer = require("./utils/serializer");
const Paginator = require("./utils/paginator");
const RateLimiter = require("./utils/rateLimiter");
const xss = require("xss-clean");
const ViewCollections = require("./core/viewsCollections");
const fs = require("fs");
const path = require("path");
const scanUrls = require("./core/urlScanner");

class SourceBit {
  constructor(config = {}) {
    this.config = {
      port: 3000,
      staticDir: null,
      cors: {
        origin: "*",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
      },
      useClassBasedRouting: false,
      rateLimit: false,
      cacheTTL: 60000,
      templateEngine: null,
      ...config,
    };
    this.requestLogs = {};
    this.router = new Router();
    this.server = null;
    this.cache = new Cache(this.config.cacheTTL);
    this.serializer = new Serializer();
    this.viewCollections = {};
    this.namedRoutes = {};
    this.use(xss());
    this.setupServerStatusRoute();

    this.recentRequests = [];
    this.rateLimiter = new RateLimiter({
      defaultRate: config.rateLimit?.defaultRate || "100/m",
      scopeBasedLimiter: config.rateLimit?.scopeBasedLimiter || false,
    });

    if (config.rateLimit) {
      this.use(this.rateLimiter.middleware());
    }
    if (this.config.useClassBasedRouting) {
      this.scanUrls();
    }
    if (this.config.staticDir) {
      this.use(staticFileMiddleware(this.config.staticDir));
    }
    if (this.config.cors) {
      this.use(corsMiddleware(this.config.cors));
    }
  }

  scanUrls() {
    scanUrls(this);
    this.buildNamedRoutes();
  }
  buildNamedRoutes() {
    const urlsPath = path.join(process.cwd(), "config", "urls.js");
    if (fs.existsSync(urlsPath)) {
      const urlPatterns = require(urlsPath);
      urlPatterns.patterns.forEach(pattern => {
        if (pattern.name) {
          this.namedRoutes[pattern.name] = pattern.path;
        }
      });
    }
  }

  redirect_to(name, params = {}) {
    const path = this.namedRoutes[name];
    if (!path) {
      throw new Error(`Named route '${name}' not found`);
    }

    let url = path;
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, value);
    }

    return (req, res) => {
      res.redirect(url);
    };
  }

  registerClassRouter(RouterClass) {
    RouterClass.app = this;
    RouterClass.register(this);
  }

  setupServerStatusRoute() {
    const statusHtml = fs.readFileSync(
      path.join(__dirname, "core", "templates", "logs.html"),
      "utf8"
    );

    this.get("/logs", (req, res) => {
      const htmlWithData = statusHtml.replace(
        "{{LOG_DATA}}",
        JSON.stringify(this.requestLogs)
      );
      res.header("Content-Type", "text/html").send(htmlWithData);
    });

    this.get("/log-data", (req, res) => {
      res.header("Content-Type", "application/json");
      if (this.requestLogs) {
        res.json(this.requestLogs);
      }
    });
  }
  createViewCollection(name, model) {
    this.viewCollections[name] = new ViewCollections(model);

    this.get(`/${name}`, this.handleList(name));
    this.post(`/${name}`, this.handleCreate(name));
    this.get(`/${name}/:id`, this.handleRetrieve(name));
    this.put(`/${name}/:id`, this.handleUpdate(name));
    this.delete(`/${name}/:id`, this.handleDelete(name));
  }

  isBrowserRequest(req) {
    return req.headers.accept && req.headers.accept.includes("text/html");
  }

  handleList(name) {
    return async (req, res) => {
      const items = await this.viewCollections[name].list();

      if (this.isBrowserRequest(req)) {
        const html = this.viewCollections[name].renderLayout(name, items);
        res.header("Content-Type", "text/html").send(html);
      } else {
        res.header("Content-Type", "application/json").json(items);
      }
    };
  }
  handleCreate(name) {
    return async (req, res) => {
      const newItem = await this.viewCollections[name].create(req.body);
      res.status(201).json(newItem);
    };
  }

  handleRetrieve(name) {
    return async (req, res) => {
      const item = await this.viewCollections[name].retrieve(req.params.id);
      if (item) {
        if (this.isBrowserRequest(req)) {
          const html = this.viewCollections[name].renderLayout(name, [item]);
          res.header("Content-Type", "text/html").send(html);
        } else {
          res.header("Content-Type", "application/json").json(item);
        }
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    };
  }

  // Reverse URL lookup method
  url(name, params = {}) {
    const path = this.namedRoutes[name];
    if (!path) throw new Error(`Route '${name}' not found`);

    let url = path;
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, value);
    }

    return url;
  }

  handleUpdate(name) {
    return async (req, res) => {
      const updatedItem = await this.viewCollections[name].update(
        req.params.id,
        req.body
      );
      if (updatedItem) {
        res.json(updatedItem);
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    };
  }

  handleDelete(name) {
    return async (req, res) => {
      const deletedItem = await this.viewCollections[name].delete(
        req.params.id
      );
      if (deletedItem) {
        res
          .status(200)
          .json({ success: true, message: "Item deleted successfully" });
      } else {
        res.status(404).json({ success: false, error: "Item not found" });
      }
    };
  }

  getViewCollection(name) {
    return this.viewCollections[name];
  }
  // Cache methods
  cacheSet(key, value, ttl) {
    this.cache.set(key, value, ttl);
  }

  cacheGet(key) {
    return this.cache.get(key);
  }

  cacheDelete(key) {
    this.cache.delete(key);
  }

  cacheClear() {
    this.cache.clear();
  }
  async getCachedData(collection, query, fetchFunction) {
    const cacheKey = this.cache.generateKey(collection, query);
    let data = this.cache.get(cacheKey);

    if (!data) {
      data = await fetchFunction();
      this.cache.set(cacheKey, data);
    }

    return data;
  }

  setDebugMode(mode) {
    this.router.setDebugMode(mode);
  }

  distributor(prefix = "") {
    const subRouter = new Router();

    const handler = {
      get: (target, prop) => {
        if (
          typeof target[prop] === "function" &&
          ["get", "post", "put", "delete", "patch"].includes(prop)
        ) {
          return (path, ...handlers) => {
            const fullPath = prefix + path;
            target[prop](fullPath, ...handlers);
            return handler;
          };
        }
        return target[prop];
      },
    };

    return new Proxy(subRouter, handler);
  }

  useExpressMiddleware(middleware) {
    return (req, res, next) => {
      const expressReq = Object.assign(req, {
        app: this,
        baseUrl: "",
        originalUrl: req.url,
        path: req.path,
        query: req.query,
      });

      const expressRes = Object.assign(res, {
        app: this,
        headersSent: false,
        locals: {},
        sendStatus: (statusCode) => {
          res.status(statusCode).send();
        },
      });

      middleware(expressReq, expressRes, next);
    };
  }

  use(path, handler) {
    if (typeof path === "function") {
      handler = path;
      path = "/";
    }
    this.router.use(path, this.useExpressMiddleware(handler));
  }
  get(path, ...handlers) {
    this.router.get(path, ...handlers);
  }

  post(path, ...handlers) {
    this.router.post(path, ...handlers);
  }

  put(path, ...handlers) {
    this.router.put(path, ...handlers);
  }

  delete(path, ...handlers) {
    this.router.delete(path, ...handlers);
  }
  patch(path, ...handlers) {
    this.router.patch(path, ...handlers);
  }
  useGlobal(middleware) {
    this.router.use(middleware);
  }
  any(path, ...handlers) {
    this.router.any(path, ...handlers);
  }

  /**
   * Add a route with optional parameters.
   * @param {string} method - The HTTP method.
   * @param {string} path - The route path.
   * @param {...function} handlers - The route handlers.
   */
  optional(method, path, ...handlers) {
    this.router.addOptionalRoute(method, path, ...handlers);
  }

  /**
   * Add a fallback route that matches if no other routes match.
   * @param {...function} handlers - The route handlers.
   */
  fallback(...handlers) {
    this.router.fallback(...handlers);
  }

  /**
   * Create a new router group with shared middleware.
   * @param {Object} options - Group options (prefix, middleware).
   * @param {Function} callback - Function to define routes within the group.
   */
  group(options, callback) {
    const groupRouter = new Router(options.prefix || "");
    if (options.middleware) {
      options.middleware.forEach((mw) => groupRouter.use(mw));
    }
    callback(groupRouter);
    this.use(options.prefix || "/", groupRouter);
  }
  all(path, ...handlers) {
    ["get", "post", "put", "delete", "patch"].forEach((method) => {
      this.router[method](path, ...handlers);
    });
  }

  validate(schema) {
    return (req, res, next) => {
      const errors = Validator.validate(req.body, schema);
      if (errors) {
        res.status(400).json({ errors });
      } else {
        next();
      }
    };
  }
  registerViewSet(baseUrl, model, serializer = null) {
    const viewSet = new ViewSet(model, serializer);
    viewSet.setBaseUrl(baseUrl);
    console.log(`Registering ViewSet routes for ${baseUrl}`);
    viewSet.registerRoutes(this);
    console.log(`ViewSet routes registered for ${baseUrl}`);
  }
  paginate(data, page, perPage) {
    return Paginator.paginate(data, page, perPage);
  }
  addValidationRule(name, validationFunction) {
    Validator.addRule(name, validationFunction);
  }
  async handleRequest(req, res) {
    const request = new Request(req);
    const response = new Response(res, this.config.templateEngine);
    if (!req.url.startsWith("/logs")) {
      const baseRoute = req.url.split("/")[1] || "root";
      const logEntry = {
        time: new Date().toISOString(),
        method: req.method,
        path: req.url,
        query: req.query,
        headers: req.headers,
        responseStatus: res.statusCode,
      };

      if (!this.requestLogs[baseRoute]) {
        this.requestLogs[baseRoute] = [];
      }
      this.requestLogs[baseRoute].unshift(logEntry);

      this.requestLogs[baseRoute] = this.requestLogs[baseRoute].slice(0, 20);
    }
    await request.parseBody();

    // Handle the request using the router
    await this.router.handle(request, response);
    if (typeof res.resolve === "function") {
      res.resolve();
    }
  }

  start() {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(this.config.port, () => {
      console.log(`SourceBit server is running on port: ${this.config.port}`);
    });
  }
}

module.exports = SourceBit;
