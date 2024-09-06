const SourceBit = require("srcbit");

const app = new SourceBit({
  port: 4000,
  templateEngine: "ejs",
  staticDir: "public",
});
const posts = [
  {
    id:1,
    title: "Post 1",
    content: "This is the first post.",
  },
  {
    id:2,
    title: "Post 2",
    content: "This is the second post.",
  },
];
app.get("/", (req, res) => {
  res.render("index", { posts });
});

app.get("/posts/:id", (req, res) => {
  const post = posts.find((p) => p.id === parseInt(req.params.id));
  if (post) {
    res.render("show", { post });
  } else {
    res.status(404).send("Post not found");
  }
});
app.start();
