const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const admin = require("firebase-admin");

// ===================================================
// 🔐 Firebase Admin init using ENV variable
// ===================================================
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("❌ FIREBASE_SERVICE_ACCOUNT env variable not set");
}

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  ),
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ===================================================
// In-memory storage (FOR TESTING ONLY)
// ===================================================
// userId -> fcmToken
const users = new Map();

// callId -> call info
const activeCalls = new Map();

// ===================================================
// Health check
// ===================================================
app.get("/", (_, res) => {
  res.send("🚀 FCM + Zego backend running");
});

// ===================================================
// Register user FCM token
// ===================================================
app.post("/register", (req, res) => {
  const { userId, fcmToken } = req.body;

  if (!userId || !fcmToken) {
    return res.status(400).json({
      error: "Missing userId or fcmToken",
    });
  }

  users.set(userId, fcmToken);
  console.log(`✅ Registered user: ${userId}`);

  res.json({ success: true });
});

// ===================================================
// Start call (FCM → Zego signaling)
// ===================================================
app.post("/call", async (req, res) => {
  const { fromUserId, toUserId, callType } = req.body;

  if (!fromUserId || !toUserId) {
    return res.status(400).json({
      error: "Missing fromUserId or toUserId",
    });
  }

  const token = users.get(toUserId);
  if (!token) {
    return res.status(404).json({
      error: "User not registered / offline",
    });
  }

  const callId = `call_${Date.now()}`;

  activeCalls.set(callId, {
    fromUserId,
    toUserId,
    status: "ringing",
    createdAt: Date.now(),
  });

  const message = {
    token,
    data: {
      type: "zego_call",
      call_id: callId,
      caller_id: fromUserId,
      caller_name: fromUserId,
      call_type: callType || "video", // video | audio
      timeout: "60", // seconds
    },
    android: {
      priority: "high",
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("📞 Call FCM sent:", response);

    res.json({
      success: true,
      callId,
    });
  } catch (err) {
    console.error("❌ FCM send error:", err);
    res.status(500).json({
      error: "Failed to send call notification",
    });
  }
});

// ===================================================
// Call response (accept / decline / timeout)
// ===================================================
app.post("/call-response", (req, res) => {
  const { callId, action, userId } = req.body;

  if (!callId || !action || !userId) {
    return res.status(400).json({
      error: "Missing callId, action or userId",
    });
  }

  const call = activeCalls.get(callId);
  if (!call) {
    return res.status(404).json({
      error: "Call not found",
    });
  }

  call.status = action; // accepted | declined | timeout
  activeCalls.set(callId, call);

  console.log(
    `📡 Call ${callId} ${action.toUpperCase()} by ${userId}`
  );

  // Cleanup if not accepted
  if (action !== "accepted") {
    activeCalls.delete(callId);
  }

  res.json({ success: true });
});

// ===================================================
// Start server (Render compatible)
// ===================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

















// const express = require("express");
// const bodyParser = require("body-parser");
// const cors = require("cors");
// const admin = require("firebase-admin");

// // 🔐 Initialize Firebase Admin using ENV variable
// admin.initializeApp({
//   credential: admin.credential.cert(
//     JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
//   ),
// });

// const app = express();
// app.use(cors());
// app.use(bodyParser.json());

// // In-memory storage (testing only)
// const users = {}; // userId -> fcmToken

// // Health check
// app.get("/", (req, res) => {
//   res.send("FCM Backend Running 🚀");
// });

// // Register user token
// app.post("/register", (req, res) => {
//   const { userId, fcmToken } = req.body;

//   if (!userId || !fcmToken) {
//     return res.status(400).json({ error: "Missing userId or fcmToken" });
//   }

//   users[userId] = fcmToken;
//   res.json({ success: true });
// });

// // Trigger call
// app.post("/call", async (req, res) => {
//   const { fromUserId, toUserId } = req.body;
//   const token = users[toUserId];

//   if (!token) {
//     return res.status(404).json({ error: "User not found" });
//   }

//   try {
//     const message = {
//       token,
//       notification: {
//         title: "Incoming Call",
//         body: `Call from ${fromUserId}`,
//       },
//       data: {
//         type: "CALL",
//         fromUserId,
//       },
//       android: {
//         priority: "high",
//       },
//     };

//     await admin.messaging().send(message);
//     res.json({ success: true });
//   } catch (err) {
//     console.error("FCM error:", err);
//     res.status(500).json({ error: "Failed to send notification" });
//   }
// });

// // Call response
// app.post("/call-response", (req, res) => {
//   const { fromUserId, action } = req.body;
//   console.log(`Call ${action} by ${fromUserId}`);
//   res.json({ success: true });
// });

// // 🚀 Render requires process.env.PORT
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log("Server running on port", PORT);
// });
