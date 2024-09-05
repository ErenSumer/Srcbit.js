const SourceBit = require('./lib/application');

const app = new SourceBit({
  port: 4000,

});
app.get("/", (req, res) => {
  res.send("Hello World");
});
app.get("/:id", (req, res) => {
  const productId = req.params.id;
  res.send(productId)
});


app.start();
