const fs = require("fs").promises;
const path = require("path");
const mime = require("mime-types");

class Response {
  constructor(res) {
    this.raw = res;
    this.statusCode = 200;
    this.headers = {};
    this.cookies = [];
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  header(name, value) {
    this.headers[name] = value;
    return this;
  }

  cookie(name, value, options = {}) {
    const cookieString = `${name}=${value}`;
    const optionsString = Object.entries(options)
      .map(([key, val]) => `${key}=${val}`)
      .join("; ");
    this.cookies.push(
      `${cookieString}${optionsString ? `; ${optionsString}` : ""}`
    );
    return this;
  }

  clearCookie(name) {
    return this.cookie(name, "", { expires: new Date(0) });
  }

  redirect(url, status = 302) {
    this.status(status).header("Location", url);
    this.raw.writeHead(this.statusCode, this.headers);
    this.raw.end();
  }

  sendFile(filePath) {
    return new Promise((resolve, reject) => {
      const fullPath = path.resolve(filePath);
      fs.stat(fullPath)
        .then((stats) => {
          if (!stats.isFile()) {
            throw new Error("Not a file");
          }
          return fs.readFile(fullPath);
        })
        .then((data) => {
          const contentType =
            mime.lookup(fullPath) || "application/octet-stream";
          this.header("Content-Type", contentType);
          this.header("Content-Length", data.length);
          this.raw.writeHead(this.statusCode, this.headers);
          this.raw.end(data);
          resolve();
        })
        .catch((err) => {
          this.status(404).json({ error: "File not found" });
          reject(err);
        });
    });
  }

  download(filePath, filename) {
    return new Promise((resolve, reject) => {
      const fullPath = path.resolve(filePath);
      fs.stat(fullPath)
        .then((stats) => {
          if (!stats.isFile()) {
            throw new Error("Not a file");
          }
          return fs.readFile(fullPath);
        })
        .then((data) => {
          this.header(
            "Content-Disposition",
            `attachment; filename="${filename}"`
          );
          this.header("Content-Type", "application/octet-stream");
          this.header("Content-Length", data.length);
          this.raw.writeHead(this.statusCode, this.headers);
          this.raw.end(data);
          resolve();
        })
        .catch((err) => {
          this.status(404).json({ error: "File not found" });
          reject(err);
        });
    });
  }
  html(content) {
    this.header('Content-Type', 'text/html');
    this.send(content);
  }
  json(data) {
    this.header("Content-Type", "application/json");
    this.send(JSON.stringify(data));
  }

  send(content) {
    if (!this.headers["Content-Type"]) {
      this.header("Content-Type", "application/json");
    }

    if (this.cookies.length > 0) {
      this.header("Set-Cookie", this.cookies);
    }

    this.raw.writeHead(this.statusCode, this.headers);
    this.raw.end(content);
  }
}

module.exports = Response;
