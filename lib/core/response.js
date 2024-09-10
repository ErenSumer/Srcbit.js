const fs = require("fs").promises;
const path = require("path");
const mime = require("mime-types");

/**
 * Response class for handling HTTP responses.
 */
class Response {
  /**
   * Create a new Response instance.
   * @param {http.ServerResponse} res - The raw server response object.
   * @param {string} [templateEngine='ejs'] - The template engine to use.
   */
  constructor(res, templateEngine = null) {
    this.raw = res;
    this.statusCode = 200;
    this.headers = new Map();
    this.cookies = [];
    this.body = null;
    this.templateEngine = templateEngine;
  }

  /**
   * Set the response status code.
   * @param {number} code - The HTTP status code.
   * @returns {Response} The response instance for chaining.
   */
  status(code) {
    this.statusCode = code;
    return this;
  }

  /**
   * Set a response header.
   * @param {string} name - The header name.
   * @param {string} value - The header value.
   * @returns {Response} The response instance for chaining.
   */
  header(name, value) {
    this.headers.set(name, value);
    return this;
  }

  /**
   * Set a cookie.
   * @param {string} name - The cookie name.
   * @param {string} value - The cookie value.
   * @param {Object} [options={}] - Cookie options.
   * @returns {Response} The response instance for chaining.
   */
  cookie(name, value, options = {}) {
    const cookieString = `${name}=${value}${Object.entries(options)
      .map(([key, val]) => `; ${key}=${val}`)
      .join("")}`;
    this.cookies.push(cookieString);
    return this;
  }

  /**
   * Clear a cookie.
   * @param {string} name - The cookie name to clear.
   * @returns {Response} The response instance for chaining.
   */
  clearCookie(name) {
    return this.cookie(name, "", { expires: new Date(0) });
  }

  /**
   * Redirect to a URL.
   * @param {string} url - The URL to redirect to.
   * @param {number} [status=302] - The redirect status code.
   */
  redirect(url, status = 302) {
    this.status(status).header("Location", url);
    this.raw.writeHead(this.statusCode, Object.fromEntries(this.headers));
    this.raw.end();
  }

  /**
   * Send a file as the response.
   * @param {string} filePath - The path to the file.
   * @returns {Promise<void>}
   */
  async sendFile(filePath) {
    try {
      const fullPath = path.resolve(filePath);
      const stats = await fs.stat(fullPath);
      if (!stats.isFile()) {
        throw new Error("Not a file");
      }
      const data = await fs.readFile(fullPath);
      const contentType = mime.lookup(fullPath) || "application/octet-stream";
      this.header("Content-Type", contentType)
        .header("Content-Length", data.length)
        .raw.writeHead(this.statusCode, Object.fromEntries(this.headers));
      this.raw.end(data);
    } catch (err) {
      this.status(404).json({ error: err });
    }
  }

  /**
   * Render a template.
   * @param {string} template - The template name.
   * @param {Object} [data={}] - The data to pass to the template.
   */
  async render(template, data = {}) {
    try {
      if (this.templateEngine) {
        const templatePath = path.resolve(
          process.cwd(),
          "views",
          `${template}.${this.templateEngine}`
        );
        const content = await this.renderTemplate(templatePath, data);
        this.header("Content-Type", "text/html").send(content);
      } else {
        this.status(500).json({ error: "Template engine not configured" });
      }
    } catch (err) {
      console.error("Error rendering template:", err);
      this.status(500).send("Internal Server Error");
    }
  }

  /**
   * Render a template file.
   * @param {string} templatePath - The path to the template file.
   * @param {Object} data - The data to pass to the template.
   * @returns {Promise<string>} The rendered template.
   */
  async renderTemplate(templatePath, data) {
    const engineModule = require(this.templateEngine);
    const content = await fs.readFile(templatePath, "utf8");
    return engineModule.render(content, data);
  }

  /**
   * Send an HTML response.
   * @param {string} content - The HTML content.
   */
  html(content) {
    this.header("Content-Type", "text/html");
    this.send(content);
  }

  /**
   * Send a JSON response.
   * @param {Object} data - The data to send as JSON.
   */
  json(data) {
    this.header("Content-Type", "application/json");
    this.send(JSON.stringify(data));
  }

  /**
   * Send the response.
   * @param {string|Buffer} content - The content to send.
   */
  send(content) {
    if (this.raw.headersSent) {
      console.warn(
        "Headers have already been sent. Ignoring this send operation."
      );
      return;
    }

    if (!this.headers.has("Content-Type")) {
      this.header("Content-Type", "text/plain");
    }

    if (this.cookies.length > 0) {
      this.header("Set-Cookie", this.cookies);
    }

    this.raw.writeHead(this.statusCode, Object.fromEntries(this.headers));
    this.raw.end(content);
  }
}

module.exports = Response;
