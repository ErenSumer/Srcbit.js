const url = require("url");
const querystring = require("querystring");

class Request {
  constructor(req) {
    this.raw = req;
    this.method = req.method;
    this.url = req.url;
    this.headers = req.headers;
    this.parsedUrl = url.parse(this.url, true);
    this.path = this.parsedUrl.pathname;
    this.query = this.parsedUrl.query;
    this.params = {};
    this.body = null;
  }

  // Lazy-loaded properties
  get cookies() {
    if (!this._cookies) {
      this._cookies = this.parseCookies();
    }
    return this._cookies;
  }

  get ip() {
    return this.headers["x-forwarded-for"] || this.raw.connection.remoteAddress;
  }

  get protocol() {
    return this.raw.connection.encrypted ? "https" : "http";
  }

  get secure() {
    return this.protocol === "https";
  }

  get hostname() {
    return this.headers["host"].split(":")[0];
  }

  // Utility methods
  isXHR() {
    return this.headers["x-requested-with"] === "XMLHttpRequest";
  }

  accepts(type) {
    const accept = this.headers["accept"] || "";
    return accept.includes(type);
  }

  is(type) {
    const contentType = this.headers["content-type"] || "";
    return contentType.includes(type);
  }

  get(header) {
    return this.headers[header.toLowerCase()];
  }

  // Parse cookies
  parseCookies() {
    const cookies = {};
    const cookieHeader = this.headers.cookie;
    if (cookieHeader) {
      cookieHeader.split(";").forEach((cookie) => {
        const parts = cookie.split("=");
        cookies[parts[0].trim()] = (parts[1] || "").trim();
      });
    }
    return cookies;
  }

  getPaginationParams() {
    const page = parseInt(this.query.page) || 1;
    const perPage = parseInt(this.query.per_page) || 10;
    return { page, perPage };
  }

  // Parse body
  async parseBody() {
    if (["POST", "PUT", "PATCH"].includes(this.method)) {
      return new Promise((resolve, reject) => {
        let body = "";
        this.raw.on("data", (chunk) => {
          body += chunk.toString();
        });
        this.raw.on("end", () => {
          try {
            this.body = this.is("application/json")
              ? JSON.parse(body)
              : querystring.parse(body);
            resolve(this.body);
          } catch (error) {
            reject(error);
          }
        });
      });
    }
  }

  // Utility method to get a parameter from either the route params, query string, or body
  param(name) {
    if (name === "*" && this.params["*"]) {
      return this.params["*"];
    }
    return (
      this.params[name] || this.query[name] || (this.body && this.body[name])
    );
  }
}

module.exports = Request;
