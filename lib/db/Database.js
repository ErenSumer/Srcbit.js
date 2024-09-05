const { MongoClient } = require("mongodb");

class Database {
  constructor(url, dbName) {
    this.url = url;
    this.dbName = dbName;
    this.client = null;
    this.db = null;
  }

  async connect() {
    if (!this.client) {
      this.client = await MongoClient.connect(this.url, {
        useUnifiedTopology: true,
      });
      this.db = this.client.db(this.dbName);
      console.log("Connected to MongoDB");
    }
    return this.db;
  }

  async getCollection(name) {
    if (!this.db) {
      await this.connect();
    }
    return this.db.collection(name);
  }

  async insertOne(collectionName, document) {
    const collection = await this.getCollection(collectionName);
    const now = new Date();
    const documentWithTimestamps = {
      ...document,
      createdAt: now,
      updatedAt: now,
    };
    return await collection.insertOne(documentWithTimestamps);
  }

  async updateOne(collectionName, filter, update) {
    const collection = await this.getCollection(collectionName);
    const updateWithTimestamp = {
      $set: {
        ...update.$set,
        updatedAt: new Date(),
      },
    };
    return await collection.updateOne(filter, updateWithTimestamp);
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log("Disconnected from MongoDB");
    }
  }
}

module.exports = Database;
