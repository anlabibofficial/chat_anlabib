const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Tell the server to look for our website files in a folder called 'public'
app.use(express.static("public"));

// This block listens for new users connecting to the server
io.on("connection", (socket) => {
  // 1. Listen for a user asking to join a specific room
  socket.on("joinRoom", ({ username, room }) => {
    socket.join(room);
    socket.username = username;
    socket.room = room;

    // Broadcast a system message to that specific room
    socket.to(room).emit("message", {
      username: "System",
      text: `${username} has joined the chat.`,
    });
  });

  // 2. Listen for chat messages from the user
  socket.on("chatMessage", (msg) => {
    if (socket.room) {
      // Send the message to everyone in the room, including the sender
      io.to(socket.room).emit("message", {
        username: socket.username,
        text: msg,
      });
    }
  });

  // 3. Listen for when a user closes their browser tab
  socket.on("disconnect", () => {
    if (socket.room && socket.username) {
      socket.to(socket.room).emit("message", {
        username: "System",
        text: `${socket.username} left the chat.`,
      });
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});
