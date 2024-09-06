const fs = require("fs");
const path = require("path");

const generateLayout = (collectionName, data) => {
  const templatePath = path.join(
    __dirname,
    "templates/viewCollectionTemplate.html"
  );
  let template = fs.readFileSync(templatePath, "utf8");

  // Replace placeholders in the template
  template = template.replace(/{{COLLECTION_NAME}}/g, collectionName);
  template = template.replace(/{{INITIAL_DATA}}/g, JSON.stringify(data));

  return template;
};

module.exports = generateLayout;
