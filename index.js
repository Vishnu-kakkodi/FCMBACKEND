const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

// In-memory storage (for testing only)
const users = {}; // userId -> fcmToken

// Register user token
app.post("/register", (req, res) => {
  const { userId, fcmToken } = req.body;
  users[userId] = fcmToken;
  res.json({ success: true });
});

// Trigger call
app.post("/call", async (req, res) => {
  const { fromUserId, toUserId } = req.body;
  const token = users[toUserId];

  if (!token) {
    return res.status(404).json({ error: "User not found" });
  }

  const message = {
    token,
    notification: {
      title: "Incoming Call",
      body: `Call from ${fromUserId}`,
    },
    data: {
      type: "CALL",
      fromUserId,
    },
    android: {
      priority: "high",
    },
  };

  await admin.messaging().send(message);
  res.json({ success: true });
});

// Call response
app.post("/call-response", (req, res) => {
  const { fromUserId, action } = req.body;
  console.log(`Call ${action} by ${fromUserId}`);
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
