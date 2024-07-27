import express from "express";
import "dotenv/config";
import { OAuth2Client } from "google-auth-library";
const router = express.Router();

router.post("/", async function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Referrer-Policy", "no-referrer-when-downgrade");

  const redirectUrl = "http://127.0.0.1:3000/oauth";

  const OAuth2 = new OAuth2Client(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET
  );

  const authorizeUrl = OAuth2.generateAuthUrl({
    access_type: "offline",
    scope: "https://www.googleapis.com/auth/userinfo.profile  openid ",
    prompt: "consent",
  });

  res.json({ url: authorizeUrl });
});

export default router;
