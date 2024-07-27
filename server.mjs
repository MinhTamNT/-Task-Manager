import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServer } from "apollo-server-express";
import bodyParser from "body-parser";
import cloudinary from "cloudinary";
import cors from "cors";
import "dotenv/config";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import { resolvers } from "./resolvers/resolvers.js";
import { typeDefs } from "./schemas/schemas.js";
import { OAuth2Client } from "google-auth-library";
const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 4000;
const router = express.Router();
const schema = makeExecutableSchema({ typeDefs, resolvers });

const server = new ApolloServer({
  schema,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

async function startApolloServer() {
  await server.start();
  server.applyMiddleware({ app, path: "/" });
}

startApolloServer();

const URL = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@task-manager.p7773m1.mongodb.net/?retryWrites=true&w=majority&appName=task-manager`;

mongoose
  .connect(URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connection to database successful");
  });

cloudinary.config({
  secure: true,
});

const client = new OAuth2Client(process.env.CLIENT_ID);
async function verifyGoogleToken(token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload;
  } catch (error) {
    console.error("Error verifying Google token:", error);
    throw new Error("Invalid token");
  }
}

app.use(cors());
app.use(bodyParser.json());
app.use(async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  console.log({ token });
  if (!token) {
    next();
  }

  try {
    const user = await verifyGoogleToken(token);
    console.log(user);
    req.user = user; // Store user info in req object for use in routes
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

httpServer.listen({ port: PORT }, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}/`);
});
