const mongoose = require("mongoose");
const generateLayout = require("./viewCollectionsLayout");

class ViewCollections {
  constructor(model) {
    this.model = model;
  }

  async list() {
    return await this.model.find();
  }

  async create(newItem) {
    const item = new this.model(newItem);
    return await item.save();
  }

  async retrieve(id) {
    return await this.model.findById(new mongoose.Types.ObjectId(id));
  }
  

  async update(id, updatedItem) {
    return await this.model.findByIdAndUpdate(id, updatedItem, { new: true });
  }

  async delete(id) {
    return await this.model.findByIdAndDelete(new mongoose.Types.ObjectId(id));
  }
  

  renderLayout(collectionName, data) {
    return generateLayout(collectionName, data);
  }
}

module.exports = ViewCollections;
