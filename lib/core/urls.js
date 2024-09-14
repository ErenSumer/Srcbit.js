class UrlPattern {
  constructor(path, controller, name = null) {
    const [httpMethod, routePath] = path.split(" ");
    this.path = routePath.trim();
    this.httpMethod = httpMethod;
    this.controller = controller;
    this.name = name;
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
