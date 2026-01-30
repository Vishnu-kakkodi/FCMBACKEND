const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const users = {}; // userId -> socketId

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (!userId) {
    socket.disconnect();
    return;
  }

  users[userId] = socket.id;
  console.log("User connected:", userId);

  // ---------- CALL OFFER ----------
  socket.on("call-offer", ({ targetId, offer }) => {
    const targetSocket = users[targetId];
    if (targetSocket) {
      io.to(targetSocket).emit("call-offer", {
        from: userId,
        offer,
      });
    }
  });

  // ---------- CALL ANSWER ----------
  socket.on("call-answer", ({ targetId, answer }) => {
    const targetSocket = users[targetId];
    if (targetSocket) {
      io.to(targetSocket).emit("call-answer", {
        from: userId,
        answer,
      });
    }
  });

  // ---------- ICE CANDIDATE ----------
  socket.on("ice-candidate", ({ targetId, candidate }) => {
    const targetSocket = users[targetId];
    if (targetSocket) {
      io.to(targetSocket).emit("ice-candidate", {
        from: userId,
        candidate,
      });
    }
  });

  // ---------- END CALL ----------
  socket.on("end-call", ({ targetId }) => {
    const targetSocket = users[targetId];
    if (targetSocket) {
      io.to(targetSocket).emit("end-call", {
        from: userId,
      });
    }
  });

  // ---------- DISCONNECT ----------
  socket.on("disconnect", () => {
    delete users[userId];
    console.log("User disconnected:", userId);
  });
});

server.listen(3000, () => {
  console.log("🚀 Signaling server running on port 3000");
});
