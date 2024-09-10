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
        const controller = new Controller();

        const [httpMethod, routePath] = pattern.path.split(" ");

        if (typeof app[httpMethod.toLowerCase()] === "function") {
          app[httpMethod.toLowerCase()](
            routePath,
            validateTypes(pattern.typeValidation),
            controller[methodName].bind(controller)
          );
        } else {
          console.warn(`Invalid HTTP method: ${httpMethod}`);
        }

        if (pattern.name) {
          app.namedRoutes = app.namedRoutes || {};
          app.namedRoutes[pattern.name] = routePath;
        }
      } else {
        console.warn(`Controller file not found: ${controllerPath}`);
      }
    });
  } else {
    console.warn("urls.js not found in config directory");
  }
  function validateTypes(typeValidation) {
    return (req, res, next) => {
      for (const [param, paramType] of Object.entries(typeValidation)) {
        const value = req.params[param];
        if (!validateType(value, paramType)) {
          return res
            .status(400)
            .json({
              error: `Invalid type for parameter ${param}. Expected ${paramType}.`,
            });
        }
      }
      next();
    };
  }

  function validateType(value, type) {
    switch (type) {
      case "int":
        return Number.isInteger(Number(value));
      case "float":
        return !isNaN(parseFloat(value));
      case "string":
        return typeof value === "string";
      case "boolean":
        return value === "true" || value === "false";
      default:
        return true;
    }
  }
}

module.exports = scanUrls;
