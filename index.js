const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// NEW: Configured CORS to allow your external website to connect
const io = new Server(server, {
  cors: {
    origin: "*", // Allows any website to connect. (Change to your specific domain later if you want strict security)
    methods: ["GET", "POST"]
  }
});

app.use(express.static("public"));

// --- IN-MEMORY STORAGE ---
// Buffer for messages
const roomMessages = {}; 
// Track specific users
const users = {}; 

function getRoomUsers(room) {
  const usersInRoom = [];
  for (const socketId in users) {
    if (users[socketId].room === room) {
      usersInRoom.push(users[socketId].username);
    }
  }
  return usersInRoom;
}

io.on("connection", (socket) => {
  
  // Verify if room exists before user joins
  socket.on("checkRoom", (room) => {
    // A room exists if it has active users or a saved message buffer
    const roomHasUsers = getRoomUsers(room).length > 0;
    const roomHasBuffer = !!roomMessages[room];
    
    const exists = roomHasUsers || roomHasBuffer;
    
    // Send status back to the single user asking
    socket.emit("roomStatus", { exists, room });
  });

  // 1. User Joins Room
  socket.on("joinRoom", ({ username, room }) => {
    socket.join(room);
    
    users[socket.id] = { username, room };

    if (roomMessages[room]) {
      socket.emit("messageHistory", roomMessages[room]);
    }

    const sysMsg = {
      username: "System",
      text: `${username} slipped into the void.`,
    };
    socket.to(room).emit("message", sysMsg);

    io.to(room).emit("roomUsers", {
      users: getRoomUsers(room)
    });
  });

  // 2. User Sends Message
  socket.on("chatMessage", (text) => {
    const user = users[socket.id];
    
    if (user && text.trim().length > 0) {
      const msgObj = {
        username: user.username,
        text: text.trim(),
      };

      if (!roomMessages[user.room]) {
        roomMessages[user.room] = [];
      }

      roomMessages[user.room].push(msgObj);

      if (roomMessages[user.room].length > 50) {
        roomMessages[user.room].shift();
      }

      io.to(user.room).emit("message", msgObj);
    }
  });

  // 3. User Disconnects
  socket.on("disconnect", () => {
    const user = users[socket.id];
    
    if (user) {
      socket.to(user.room).emit("message", {
        username: "System",
        text: `${user.username} faded away.`,
      });

      delete users[socket.id];

      io.to(user.room).emit("roomUsers", {
        users: getRoomUsers(user.room)
      });
      
      const remainingUsers = getRoomUsers(user.room);
      if (remainingUsers.length === 0) {
        delete roomMessages[user.room];
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`chat_anlabib server is running on port ${PORT}`);
});
