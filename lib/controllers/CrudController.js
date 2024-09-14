const BaseController = require("./BaseController");
const { UrlSet } = require("../core/urls");

class CRUDController extends BaseController {
  constructor(app, modelName, schema) {
    super(app);
    this.modelName = modelName;
    this.schema = schema;
    this.urlSet = new UrlSet();
    this.generateRoutes();
  }

  generateRoutes() {
    this.urlSet.add(
      `GET /${this.modelName}`,
      `${this.modelName}Controller.list`,
      `${this.modelName}-list`
    );
    this.urlSet.add(
      `POST /${this.modelName}`,
      `${this.modelName}Controller.create`,
      `${this.modelName}-create`
    );
    this.urlSet.add(
      `GET /${this.modelName}/:id`,
      `${this.modelName}Controller.retrieve`,
      `${this.modelName}-detail`
    );
    this.urlSet.add(
      `PUT /${this.modelName}/:id`,
      `${this.modelName}Controller.update`,
      `${this.modelName}-update`
    );
    this.urlSet.add(
      `DELETE /${this.modelName}/:id`,
      `${this.modelName}Controller.delete`,
      `${this.modelName}-delete`
    );

    // Add the generated routes to the application
    this.app.addRoutes(this.urlSet);
  }

  async list(req, res) {
    const items = this.schema.find
      ? await this.schema.find()
      : Object.values(this.schema);
    res.json(items);
  }

  async create(req, res) {
    const newItem = this.schema.create
      ? await this.schema.create(req.body)
      : { id: Date.now(), ...req.body };
    if (!this.schema.create) this.schema[newItem.id] = newItem;
    res.status(201).json(newItem);
  }

  async retrieve(req, res) {
    const item = this.schema.findById
      ? await this.schema.findById(req.params.id)
      : this.schema[req.params.id];
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ error: "Item not found" });
    }
  }

  async update(req, res) {
    if (this.schema.findByIdAndUpdate) {
      const updatedItem = await this.schema.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (updatedItem) {
        res.json(updatedItem);
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    } else {
      if (this.schema[req.params.id]) {
        this.schema[req.params.id] = {
          ...this.schema[req.params.id],
          ...req.body,
        };
        res.json(this.schema[req.params.id]);
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    }
  }

  async delete(req, res) {
    if (this.schema.findByIdAndDelete) {
      const deletedItem = await this.schema.findByIdAndDelete(req.params.id);
      if (deletedItem) {
        res.json({ message: "Item deleted successfully" });
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    } else {
      if (this.schema[req.params.id]) {
        delete this.schema[req.params.id];
        res.json({ message: "Item deleted successfully" });
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    }
  }
}

module.exports = CRUDController;
