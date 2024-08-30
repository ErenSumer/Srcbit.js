const WebSocket = require("ws");

class WebSocketManager {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.handlers = new Map();

    this.wss.on("connection", (ws, req) => {
      ws.on("message", (message) => {
        this.handleMessage(ws, message, req);
      });
    });
  }

  handleMessage(ws, message, req) {
    try {
      const { event, data } = JSON.parse(message);
      const handler = this.handlers.get(event);
      if (handler) {
        handler(ws, data, req);
      } else {
        console.warn(`No handler for WebSocket event: ${event}`);
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
    }
  }

  on(event, handler) {
    this.handlers.set(event, handler);
  }

  broadcast(event, data) {
    const message = JSON.stringify({ event, data });
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

module.exports = WebSocketManager;
