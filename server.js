const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());

// file upload setup
const upload = multer({ dest: "uploads/" });

// 🔐 YOUR GOOGLE CREDENTIALS (यहाँ डालना)
const CLIENT_ID = "646980081714-94engb86sqa5gq984sli36gfc7pvr6j5.apps.googleusercontent.com";
const CLIENT_SECRET = "";
const REDIRECT_URI = "https://your-app.onrender.com/oauth2callback";

// OAuth client
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// 🟢 Home route
app.get("/", (req, res) => {
  res.send("🚀 HYT Upload Server Running");
});

// 🔐 Step 1: Login URL
app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.upload"],
  });
  res.redirect(url);
});

// 🔐 Step 2: Callback
app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    res.send("✅ Login successful! Now you can upload video.");
  } catch (err) {
    res.send("❌ Error: " + err.message);
  }
});

// 📤 Upload API
app.post("/upload", upload.single("video"), async (req, res) => {

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  try {
    const response = await youtube.videos.insert({
      part: "snippet,status",
      requestBody: {
        snippet: {
          title: req.body.title,
          description: req.body.description,
          tags: req.body.tags ? req.body.tags.split(",") : [],
        },
        status: {
          privacyStatus: req.body.privacy || "public",
        },
      },
      media: {
        body: fs.createReadStream(req.file.path),
      },
    });

    res.json({
      success: true,
      videoId: response.data.id,
      url: "https://youtube.com/watch?v=" + response.data.id,
    });

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
