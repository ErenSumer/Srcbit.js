function corsMiddleware(options = {}) {
  const defaultOptions = {
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  const corsOptions = { ...defaultOptions, ...options };

  return (req, res, next) => {
    res.header("Access-Control-Allow-Origin", corsOptions.origin);
    res.header("Access-Control-Allow-Methods", corsOptions.methods);
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );

    if (req.method === "OPTIONS") {
      if (corsOptions.preflightContinue) {
        next();
      } else {
        res.status(corsOptions.optionsSuccessStatus).end();
      }
    } else {
      next();
    }
  };
}

module.exports = corsMiddleware;
