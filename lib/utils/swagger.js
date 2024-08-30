class SwaggerGenerator {
  constructor(app) {
    this.app = app;
    this.spec = {
      openapi: "3.0.0",
      info: {
        title: "SourceBit API",
        version: "1.0.0",
        description: "API documentation for SourceBit application",
      },
      paths: {},
      components: {
        schemas: {},
      },
    };
  }

  generateSpec() {
    this.generatePaths();
    this.generateSchemas();
    return this.spec;
  }

  generatePaths() {
    for (const method in this.app.router.routes) {
      for (const route of this.app.router.routes[method]) {
        const path = route.path.replace(
          /:\w+/g,
          (match) => `{${match.slice(1)}}`
        );
        if (!this.spec.paths[path]) {
          this.spec.paths[path] = {};
        }
        this.spec.paths[path][method.toLowerCase()] =
          this.generatePathItem(route);
      }
    }
  }

  generatePathItem(route) {
    const pathItem = {
      summary: `${route.method} ${route.path}`,
      responses: {
        200: {
          description: "Successful response",
        },
      },
    };

    if (route.schema) {
      pathItem.requestBody = {
        content: {
          "application/json": {
            schema: {
              $ref: `#/components/schemas/${route.schema.name}`,
            },
          },
        },
      };
    }

    return pathItem;
  }

  generateSchemas() {
    for (const [name, schema] of Object.entries(this.app.schemas || {})) {
      this.spec.components.schemas[name] = this.generateSchemaObject(schema);
    }
  }

  generateSchemaObject(schema) {
    const schemaObject = {
      type: "object",
      properties: {},
    };

    for (const [field, rules] of Object.entries(schema)) {
      schemaObject.properties[field] = this.generatePropertyObject(rules);
    }

    return schemaObject;
  }

  generatePropertyObject(rules) {
    const property = {};

    if (rules.isString) property.type = "string";
    if (rules.isNumber) property.type = "number";
    if (rules.isBoolean) property.type = "boolean";
    if (rules.isArray) property.type = "array";
    if (rules.isObject) property.type = "object";

    if (rules.minLength) property.minLength = rules.minLength;
    if (rules.maxLength) property.maxLength = rules.maxLength;
    if (rules.min) property.minimum = rules.min;
    if (rules.max) property.maximum = rules.max;

    return property;
  }
}

module.exports = SwaggerGenerator;
