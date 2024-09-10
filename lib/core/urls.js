class UrlPattern {
  constructor(path, controller, name = null) {
    const [routePath, typeValidation] = path.split(",");
    this.path = routePath.trim();
    this.controller = controller;
    this.name = name;
    this.typeValidation = this.parseTypeValidation(typeValidation);
  }

  parseTypeValidation(typeValidation) {
    if (!typeValidation) return {};
    const types = typeValidation.split("|").filter(Boolean);
    return types.reduce((acc, type) => {
      const [param, paramType] = type.split("=").map((s) => s.trim());
      acc[param] = paramType;
      return acc;
    }, {});
  }
}

class UrlSet {
  constructor() {
    this.patterns = [];
  }

  add(path, controller, name = null) {
    this.patterns.push(new UrlPattern(path, controller, name));
  }
}

module.exports = { UrlSet, UrlPattern };
