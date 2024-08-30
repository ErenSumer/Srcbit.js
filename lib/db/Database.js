const { MongoClient, ObjectId } = require("mongodb");

class Database {
  constructor(url, dbName) {
    this.url = url;
    this.dbName = dbName;
    this.client = null;
    this.db = null;
    this.poolSize = 10;
  }

  async connect() {
    if (!this.client) {
      this.client = await MongoClient.connect(this.url, {
        maxPoolSize: this.poolSize,
      });
      this.db = this.client.db(this.dbName);
    }
    return this.db;
  }

  setPoolSize(size) {
    this.poolSize = size;
  }

  async get(collection, id) {
    return await this.db
      .collection(collection)
      .findOne({ _id: new ObjectId(id) });
  }

  async create(collection, data) {
    const result = await this.db.collection(collection).insertOne(data);
    return result.insertedId;
  }

  async all(collection, query = {}) {
    return await this.db.collection(collection).find(query).toArray();
  }

  async update(collection, id, data) {
    return await this.db
      .collection(collection)
      .updateOne({ _id: new ObjectId(id) }, { $set: data });
  }

  async partialUpdate(collection, id, data) {
    return await this.db
      .collection(collection)
      .updateOne({ _id: ObjectId(id) }, { $set: data });
  }

  async delete(collection, id) {
    return await this.db
      .collection(collection)
      .deleteOne({ _id: new ObjectId(id) });
  }

  async retrieve(collection, query) {
    return await this.db.collection(collection).find(query).toArray();
  }

  async runCommand(command) {
    return await this.db.command(command);
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }
}

module.exports = Database;
