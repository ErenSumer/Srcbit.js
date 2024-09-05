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
const Database = require("./db/Database");
const fs = require("fs");
const path = require("path");

class SourceBit {
  constructor(config = {}) {
    this.config = {
      port: 3000,
      staticDir: null,
      cors: false,
      rateLimit: false,
      cacheTTL: 60000,
      mongoCluster: null,
      mongoDbName: null,
      templateEngine: null,
      ...config,
    };
    this.requestLogs = {};
    this.router = new Router();
    this.server = null;
    this.wsManager = null;

    this.cache = new Cache(this.config.cacheTTL);
    this.serializer = new Serializer();
    this.viewCollections = {};
    this.use(xss());
    this.database = null;
    this.setupServerStatusRoute();
    this.recentRequests = [];
    this.rateLimiter = new RateLimiter();

    if (this.config.staticDir) {
      this.use(staticFileMiddleware(this.config.staticDir));
    }
    if (this.config.cors) {
      this.use(corsMiddleware(this.config.cors));
    }
    if (this.config.rateLimit) {
      this.use(new RateLimiter(this.config.rateLimit).middleware());
    }
    if (this.config.mongoCluster && this.config.mongoDbName) {
      this.connectToDatabase(this.config.mongoCluster, this.config.mongoDbName);
    }
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
  createViewCollection(name, jsonObject, schema) {
    this.viewCollections[name] = new ViewCollections(jsonObject, schema);

    this.get(`/${name}`, (req, res) => {
      const isJsonRequest =
        req.headers.accept && req.headers.accept.includes("application/json");
      const isBrowserRequest =
        req.headers["user-agent"] &&
        req.headers["user-agent"].includes("Mozilla");

      if (isJsonRequest || !isBrowserRequest) {
        res.json(this.viewCollections[name].list());
      } else {
        res.header("Content-Type", "text/html");
        res.send(this.viewCollections[name].renderLayout(name));
      }
    });

    this.put(`/${name}/:id`, (req, res) => {
      const updated = this.viewCollections[name].update(
        req.params.id,
        req.body
      );
      if (updated) {
        res.json(this.viewCollections[name].read(req.params.id));
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    });
    // POST route for creating new items
    this.post(`/${name}`, (req, res) => {
      const result = this.viewCollections[name].create(req.body);
      if (result.success) {
        res.status(201).json({ id: result.id, ...req.body });
      } else {
        res.status(400).json({ errors: result.errors });
      }
    });

    // GET route for reading a specific item
    this.get(`/${name}/:id`, (req, res) => {
      const item = this.viewCollections[name].read(req.params.id);
      if (item) {
        res.json(item);
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    });

    // PUT route for updating an item
    this.put(`/${name}/:id`, (req, res) => {
      const result = this.viewCollections[name].update(req.params.id, req.body);
      if (result.success) {
        res.json(this.viewCollections[name].read(req.params.id));
      } else {
        res.status(400).json({ errors: result.errors });
      }
    });

    // DELETE route for deleting an item
    this.delete(`/${name}/:id`, (req, res) => {
      const deleted = this.viewCollections[name].delete(req.params.id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    });

    return this.viewCollections[name];
  }
  async connectToDatabase() {
    this.database = new Database(this.config.mongoUrl, this.config.mongoDbName);
    await this.database.connect();
  }
  async stop() {
    if (this.database) {
      await this.database.close();
    }
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
    return new Router(prefix);
  }

  use(path, router) {
    if (typeof path === "function") {
      this.router.use(path);
    } else {
      this.router.use(path, router);
    }
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
  group(prefix, callback) {
    const subRouter = new Router(prefix);
    callback(subRouter);
    this.router.use(prefix, subRouter);
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
