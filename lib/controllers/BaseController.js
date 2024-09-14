class BaseController {
  constructor(app) {
    this.app = app;
  }

  redirect(name, args = {}) {
    return this.app.redirect_to(name, args);
  }

  reverse(name, args = {}) {
    return this.app.url(name, args);
  }

  reverseLazy(name, args = {}) {
    return () => this.app.url(name, args);
  }

  handle_404(req, res) {
    res.status(404).json({ error: "Not Found" });
  }

  handle_500(req, res, error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
}

module.exports = BaseController;
