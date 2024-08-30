class ViewSet {
  constructor(model, serializer = null) {
    this.model = model;
    this.serializer = serializer;
    this.baseUrl = "";
  }

  setBaseUrl(url) {
    this.baseUrl = url;
  }

  async list(req, res) {
    try {
      const items = await this.model.findAll();
      const serializedItems = this.serializer
        ? items.map((item) => this.serializer.serialize(item))
        : items;
      res.json(serializedItems);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async create(req, res) {
    try {
      const newItem = await this.model.create(req.body);
      const serializedItem = this.serializer
        ? this.serializer.serialize(newItem)
        : newItem;
      res.status(201).json(serializedItem);
    } catch (error) {
      res.status(400).json({ error: "Bad request" });
    }
  }

  async retrieve(req, res) {
    try {
      const item = await this.model.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Not found" });
      }
      const serializedItem = this.serializer
        ? this.serializer.serialize(item)
        : item;
      res.json(serializedItem);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async update(req, res) {
    try {
      const updatedItem = await this.model.update(req.params.id, req.body);
      if (!updatedItem) {
        return res.status(404).json({ error: "Not found" });
      }
      const serializedItem = this.serializer
        ? this.serializer.serialize(updatedItem)
        : updatedItem;
      res.json(serializedItem);
    } catch (error) {
      res.status(400).json({ error: "Bad request" });
    }
  }

  async partialUpdate(req, res) {
    try {
      const updatedItem = await this.model.partialUpdate(
        req.params.id,
        req.body
      );
      if (!updatedItem) {
        return res.status(404).json({ error: "Not found" });
      }
      const serializedItem = this.serializer
        ? this.serializer.serialize(updatedItem)
        : updatedItem;
      res.json(serializedItem);
    } catch (error) {
      res.status(400).json({ error: "Bad request" });
    }
  }

  async destroy(req, res) {
    try {
      const result = await this.model.delete(req.params.id);
      if (!result) {
        return res.status(404).json({ error: "Not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  registerRoutes(app) {
    app.get(this.baseUrl, this.list.bind(this));
    app.post(this.baseUrl, this.create.bind(this));
    app.get(`${this.baseUrl}/:id`, this.retrieve.bind(this));
    app.put(`${this.baseUrl}/:id`, this.update.bind(this));
    app.patch(`${this.baseUrl}/:id`, this.partialUpdate.bind(this));
    app.delete(`${this.baseUrl}/:id`, this.destroy.bind(this));

    // Register route for API information
    app.get(`${this.baseUrl}/api-info`, this.apiInfo.bind(this));
  }

  apiInfo(req, res) {
    const info = {
      model: this.model.name,
      baseUrl: this.baseUrl,
      endpoints: [
        { method: "GET", path: this.baseUrl, description: "List all items" },
        {
          method: "POST",
          path: this.baseUrl,
          description: "Create a new item",
        },
        {
          method: "GET",
          path: `${this.baseUrl}/:id`,
          description: "Retrieve a specific item",
        },
        {
          method: "PUT",
          path: `${this.baseUrl}/:id`,
          description: "Update a specific item",
        },
        {
          method: "PATCH",
          path: `${this.baseUrl}/:id`,
          description: "Partially update a specific item",
        },
        {
          method: "DELETE",
          path: `${this.baseUrl}/:id`,
          description: "Delete a specific item",
        },
      ],
      modelFields: Object.keys(this.model.fields || {}),
    };

    res.json(info);
  }
}

module.exports = ViewSet;
