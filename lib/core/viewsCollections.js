const generateLayout = require("./viewCollectionsLayout");
const Validator = require("../core/validator");
class ViewCollections {
  constructor(jsonObject, schema) {
    this.data = jsonObject;
    this.schema = schema;
    this.lastId = this.getMaxId();
    this.generateMethods();
  }
  getMaxId() {
    const ids = Object.keys(this.data).map((id) => parseInt(id, 10));
    return ids.length > 0 ? Math.max(...ids) : 0;
  }
  generateMethods() {
    // Create
    this.create = (newItem) => {
      const errors = Validator.validate(newItem, this.schema);
    if (errors) {
      return { success: false, errors };
    }
    this.lastId++;
    this.data[this.lastId] = newItem;
    return { success: true, id: this.lastId };
    };

    // Read
    this.read = (id) => this.data[id];

    // Update
    this.update = (id, updatedItem) => {
      const errors = Validator.validate(updatedItem, this.schema);
      if (errors) {
        return { success: false, errors };
      }
      if (this.data[id]) {
        this.data[id] = updatedItem;
        return { success: true };
      }
      return { success: false, errors: { id: ["Item not found"] } };
    };

    // Partial Update
    this.partialUpdate = (id, updates) => {
      if (this.data[id]) {
        this.data[id] = { ...this.data[id], ...updates };
        return true;
      }
      return false;
    };

    // Delete
    this.delete = (id) => {
      if (this.data[id]) {
        delete this.data[id];
        return true;
      }
      return false;
    };

    // Select
    this.select = (criteria) => {
      return Object.entries(this.data)
        .filter(([, item]) =>
          Object.entries(criteria).every(([key, value]) => item[key] === value)
        )
        .map(([id, item]) => ({ id, ...item }));
    };

    // List All
    this.list = () =>
      Object.entries(this.data).map(([id, item]) => ({ id, ...item }));
  }
  renderLayout(collectionName) {
    return generateLayout(collectionName, this.data);
  }
}

module.exports = ViewCollections;
