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

















// /**
//  * IMPORTANT for Render DNS
//  * This MUST be at the very top of the file
//  */
// process.env.NODE_OPTIONS = "--dns-result-order=ipv4first";

// require("dotenv").config();
// const express = require("express");
// const axios = require("axios");
// const crypto = require("crypto");

// const app = express();
// app.use(express.json());

// const ZEGO_APP_ID = Number(process.env.ZEGO_APP_ID);
// const ZEGO_SERVER_SECRET = process.env.ZEGO_SERVER_SECRET;

// /**
//  * Axios instance forcing IPv4 (extra safety)
//  */
// const axiosInstance = axios.create({
//   timeout: 5000,
//   family: 4, // ✅ force IPv4
// });

// /**
//  * Generate ZEGOCLOUD Server API auth
//  */
// function generateZegoAuth() {
//   const timestamp = Math.floor(Date.now() / 1000);
//   const nonce = Math.floor(Math.random() * 1000000);

//   const signStr = `${ZEGO_APP_ID}${timestamp}${nonce}`;

//   const signature = crypto
//     .createHmac("sha256", ZEGO_SERVER_SECRET)
//     .update(signStr)
//     .digest("base64");

//   return { signature, timestamp, nonce };
// }

// /**
//  * POST /zego/online-users
//  * Body: { "roomId": "123456" }
//  */
// app.post("/zego/online-users", async (req, res) => {
//   try {
//     const { roomId } = req.body;

//     if (!roomId) {
//       return res.status(400).json({
//         error: "roomId is required",
//       });
//     }

//     const { signature, timestamp, nonce } = generateZegoAuth();

//     const response = await axiosInstance.post(
//       "https://rtc-api.zegocloud.com/v1/room/online_users",
//       {
//         app_id: ZEGO_APP_ID,
//         room_id: roomId,
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           "X-Zego-AppId": ZEGO_APP_ID,
//           "X-Zego-Timestamp": timestamp,
//           "X-Zego-Nonce": nonce,
//           Authorization: signature,
//         },
//       }
//     );

//     return res.json({
//       success: true,
//       zego: response.data,
//     });
//   } catch (error) {
// console.error("❌ ZEGOCLOUD ERROR");

// if (error.response) {
//   console.error("STATUS:", error.response.status);
//   console.error("DATA:", error.response.data);
//   console.error("HEADERS:", error.response.headers);

//   return res.status(500).json({
//     source: "zego",
//     status: error.response.status,
//     data: error.response.data,
//   });
// }

// console.error("MESSAGE:", error.message);
// console.error("STACK:", error.stack);

// return res.status(500).json({
//   source: "node",
//   error: error.message,
// });

//   }
// });

// /**
//  * Health check
//  */
// app.get("/", (_, res) => {
//   res.send("ZEGOCLOUD backend running 🚀");
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`✅ Server running on port ${PORT}`);
// });
