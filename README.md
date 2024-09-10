# SourceBit Backend Framework

SourceBit is a powerful and flexible backend framework for building robust web applications. It provides a simple and intuitive API for creating server-side applications with features like routing, middleware support, database integration, and more.

## Features

- Easy-to-use routing system with support for string and regex routes
- Middleware support for request processing
- Built-in request and response handling
- Database integration (MongoDB support)
- Caching mechanism for improved performance
- Rate limiting for API protection
- Static file serving
- CORS support
- View collections for easy data management
- Customizable error handling and debugging

## Installation

```bash
npm install srcbit
```

## Quick Start
```javascript
const SourceBit = require('srcbit');

const app = new SourceBit({ port: 3000 });

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to SourceBit!' });
});

app.start();
```
