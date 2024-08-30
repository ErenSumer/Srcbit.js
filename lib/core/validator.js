class Validator {
  static customRules = {};

  static isString(value) {
    return typeof value === "string";
  }

  static isNumber(value) {
    if (typeof value === "number" && !isNaN(value)) {
      return true;
    }
    if (typeof value === "string" && !isNaN(Number(value))) {
      return true;
    }
    return false;
  }

  static isBoolean(value) {
    return typeof value === "boolean";
  }

  static isArray(value) {
    return Array.isArray(value);
  }

  static isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  static isEmail(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return Validator.isString(value) && emailRegex.test(value);
  }

  static minLength(value, min) {
    return Validator.isString(value) && value.length >= min;
  }

  static maxLength(value, max) {
    return Validator.isString(value) && value.length <= max;
  }

  static min(value, min) {
    return Validator.isNumber(value) && value >= min;
  }

  static max(value, max) {
    return Validator.isNumber(value) && value <= max;
  }

  static addRule(name, validationFunction) {
    if (Validator[name] || Validator.customRules[name]) {
      throw new Error(`Validation rule '${name}' already exists.`);
    }
    Validator.customRules[name] = validationFunction;
  }

  static validate(data, schema) {
    const errors = {};

    for (const [field, rules] of Object.entries(schema)) {
      let value = data[field];

      // Convert string numbers to actual numbers
      if (
        rules.isNumber &&
        typeof value === "string" &&
        !isNaN(Number(value))
      ) {
        value = Number(value);
        data[field] = value; // Update the original data
      }

      for (const [rule, param] of Object.entries(rules)) {
        let validationFunction;
        if (Validator[rule]) {
          validationFunction = Validator[rule];
        } else if (Validator.customRules[rule]) {
          validationFunction = Validator.customRules[rule];
        } else {
          throw new Error(`Unknown validation rule: ${rule}`);
        }

        if (!validationFunction(value, param)) {
          errors[field] = errors[field] || [];
          errors[field].push(`Failed ${rule} validation`);
        }
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }
}

module.exports = Validator;
