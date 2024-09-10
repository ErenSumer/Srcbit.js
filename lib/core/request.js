const url = require("url");
const querystring = require("querystring");

/**
 * Request class for handling HTTP requests.
 */
class Request {
  /**
   * Create a new Request instance.
   * @param {http.IncomingMessage} req - The raw server request object.
   */
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

  /**
   * Get cookies from the request.
   * @returns {Object} Parsed cookies.
   */
  get cookies() {
    if (!this._cookies) {
      this._cookies = this.parseCookies();
    }
    return this._cookies;
  }

  /**
   * Get the client's IP address.
   * @returns {string} The IP address.
   */
  get ip() {
    return this.headers["x-forwarded-for"] || this.raw.connection.remoteAddress;
  }

  /**
   * Get the request protocol.
   * @returns {string} The protocol (http or https).
   */
  get protocol() {
    return this.raw.connection.encrypted ? "https" : "http";
  }

  /**
   * Check if the request is secure (HTTPS).
   * @returns {boolean} True if the request is secure.
   */
  get secure() {
    return this.protocol === "https";
  }

  /**
   * Get the request hostname.
   * @returns {string} The hostname.
   */
  get hostname() {
    return this.headers["host"].split(":")[0];
  }

  /**
   * Check if the request is an XMLHttpRequest.
   * @returns {boolean} True if the request is an XHR.
   */
  isXHR() {
    return this.headers["x-requested-with"] === "XMLHttpRequest";
  }

  /**
   * Check if the request accepts a specific content type.
   * @param {string} type - The content type to check.
   * @returns {boolean} True if the request accepts the content type.
   */
  accepts(type) {
    const accept = this.headers["accept"] || "";
    return accept.includes(type);
  }

  /**
   * Check if the request has a specific content type.
   * @param {string} type - The content type to check.
   * @returns {boolean} True if the request has the content type.
   */
  is(type) {
    const contentType = this.headers["content-type"] || "";
    return contentType.includes(type);
  }

  /**
   * Get a specific header value.
   * @param {string} header - The header name.
   * @returns {string|undefined} The header value.
   */
  get(header) {
    return this.headers[header.toLowerCase()];
  }

  /**
   * Parse cookies from the request.
   * @returns {Object} Parsed cookies.
   */
  parseCookies() {
    const cookies = {};
    const cookieHeader = this.headers.cookie;
    if (cookieHeader) {
      cookieHeader.split(";").forEach((cookie) => {
        const [name, value] = cookie.split("=").map((c) => c.trim());
        cookies[name] = value;
      });
    }
    return cookies;
  }

  /**
   * Get pagination parameters from the query string.
   * @returns {Object} Pagination parameters.
   */
  getPaginationParams() {
    const page = parseInt(this.query.page) || 1;
    const perPage = parseInt(this.query.per_page) || 10;
    return { page, perPage };
  }

  /**
   * Parse the request body.
   * @returns {Promise<Object>} The parsed body.
   */
  async parseBody() {
    if (["POST", "PUT", "PATCH"].includes(this.method)) {
      return new Promise((resolve, reject) => {
        let body = "";
        this.raw.on("data", (chunk) => (body += chunk.toString()));
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

  /**
   * Get a parameter from route params, query string, or body.
   * @param {string} name - The parameter name.
   * @returns {string|undefined} The parameter value.
   */
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
