class Paginator {
  constructor(data, page = 1, perPage = 10) {
    this.data = data;
    this.page = parseInt(page);
    this.perPage = parseInt(perPage);
    this.totalItems = data.length;
    this.totalPages = Math.ceil(this.totalItems / this.perPage);
  }

  getItems() {
    const start = (this.page - 1) * this.perPage;
    const end = start + this.perPage;
    return this.data.slice(start, end);
  }

  getMetadata() {
    return {
      currentPage: this.page,
      perPage: this.perPage,
      totalItems: this.totalItems,
      totalPages: this.totalPages,
      hasNextPage: this.page < this.totalPages,
      hasPrevPage: this.page > 1,
    };
  }

  static paginate(data, page = 1, perPage = 10) {
    const paginator = new Paginator(data, page, perPage);
    return {
      items: paginator.getItems(),
      metadata: paginator.getMetadata(),
    };
  }
}

module.exports = Paginator;
