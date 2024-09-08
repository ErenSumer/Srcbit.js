function corsMiddleware(options = {}) {
  const defaultOptions = {
    origin: "http://localhost:3001", // Default to your React app's origin
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  };

  const corsOptions = { ...defaultOptions, ...options };

  return (req, res, next) => {
    const origin =
      typeof corsOptions.origin === "function"
        ? corsOptions.origin(req)
        : corsOptions.origin;

    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", corsOptions.methods);
    res.header(
      "Access-Control-Allow-Headers",
      corsOptions.allowedHeaders.join(",")
    );
    res.header(
      "Access-Control-Allow-Credentials",
      corsOptions.credentials.toString()
    );

    if (req.method === "OPTIONS") {
      // Respond to preflight requests
      res.status(204).send("");
    } else {
      next();
    }
  };
}

module.exports = corsMiddleware;
