import "dotenv/config";
import express from "express";
import { OAuth2Client } from "google-auth-library";
const router = express.Router();
async function getUserData(access_token) {
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`
  );

  const data = await response.json();
  console.log("data", data);
}

/* GET home page. */
router.get("/", async function (req, res, next) {
  const code = req.query.code;

  console.log(code);
  try {
    const redirectURL = "http://127.0.0.1:3000/oauth";
    const oAuth2Client = new OAuth2Client(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      redirectURL
    );
    const r = await oAuth2Client.getToken(code);
    // Make sure to set the credentials on the OAuth2 client.
    await oAuth2Client.setCredentials(r.tokens);
    console.info("Tokens acquired.");
    const user = oAuth2Client.credentials;
    console.log("credentials", user);
    await getUserData(oAuth2Client.credentials.access_token);
  } catch (err) {
    console.log("Error logging in with OAuth2 user", err);
  }

  res.redirect(303, "http://localhost:3000/");
});

export default router;
