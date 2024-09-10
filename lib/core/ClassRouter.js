class BaseRouter {
  static urlPatterns = [];

  static url(path, controllerMethod, name = null) {
    const [httpMethod, routePath] = path.split(" ");
    const [cleanPath, typeValidation] = routePath.split(',');
    this.urlPatterns.push({ 
      httpMethod, 
      routePath: cleanPath.trim(), 
      controllerMethod, 
      name,
      typeValidation: this.parseTypeValidation(typeValidation)
    });
  }
  

  static parseTypeValidation(typeValidation) {
    if (!typeValidation) return {};
    const types = typeValidation.split('|').filter(Boolean);
    return types.reduce((acc, type) => {
      const [param, paramType] = type.split('=').map(s => s.trim());
      acc[param] = paramType;
      return acc;
    }, {});
  }

  static register(app) {
    const instance = new this();
    this.urlPatterns.forEach(
      ({ httpMethod, routePath, controllerMethod, name, typeValidation }) => {
        const [controllerName, methodName] = controllerMethod.split(".");
        const handler = instance[methodName].bind(instance);

        app[httpMethod.toLowerCase()](
          routePath,
          this.validateTypes(typeValidation),
          handler
        );

        if (name) {
          app.namedRoutes = app.namedRoutes || {};
          app.namedRoutes[name] = routePath;
        }
      }
    );
  }

  getOptionalQuery(req, queryName) {
    if (req.query[queryName] !== undefined) {
      return { exists: true, value: req.query[queryName] };
    }
    return { exists: false, value: null };
  }
  validateTypes(typeValidation) {
    return (req, res, next) => {
      for (const [param, paramType] of Object.entries(typeValidation)) {
        const value = req.params[param];
        if (!this.validateType(value, paramType)) {
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

  validateType(value, type) {
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

module.exports = BaseRouter;
