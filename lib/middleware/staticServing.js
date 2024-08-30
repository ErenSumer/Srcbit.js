const fs = require("fs").promises;
const path = require("path");
const mime = require("mime-types");

function staticFileMiddleware(rootDir) {
  return async (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }

    const filePath = path.join(rootDir, req.path);
    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        return next();
      }

      const content = await fs.readFile(filePath);
      const contentType = mime.lookup(filePath) || "application/octet-stream";

      res
        .status(200)
        .header("Content-Type", contentType)
        .header("Content-Length", stats.size)
        .send(content);
    } catch (error) {
      if (error.code === "ENOENT") {
        return next();
      }
      next(error);
    }
  };
}

module.exports = staticFileMiddleware;

