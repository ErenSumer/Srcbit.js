const fs = require("fs");
const path = require("path");

function scanUrls(app) {
  const urlsPath = path.join(process.cwd(), "config", "urls.js");

  if (fs.existsSync(urlsPath)) {
    const urlPatterns = require(urlsPath);

    urlPatterns.patterns.forEach((pattern) => {
      const [controllerName, methodName] = pattern.controller.split(".");
      const controllerPath = path.join(
        process.cwd(),
        "controllers",
        `${controllerName}.js`
      );

      if (fs.existsSync(controllerPath)) {
        const Controller = require(controllerPath);
        const controller = new Controller(app);

        app[pattern.httpMethod.toLowerCase()](
          pattern.path,
          controller[methodName].bind(controller)
        );

        if (pattern.name) {
          app.namedRoutes[pattern.name] = pattern.path;
        }
      }
    });
  }
}

module.exports = scanUrls;
