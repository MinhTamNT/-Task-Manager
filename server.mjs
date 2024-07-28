import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import { OAuth2Client } from "google-auth-library";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { typeDefs } from "./schemas/schemas.js";
import { resolvers } from "./resolvers/resolvers.js";
import "dotenv/config";

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 4000;

// Setup schema and server
const schema = makeExecutableSchema({ typeDefs, resolvers });
const server = new ApolloServer({
  schema,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

// Connect to MongoDB
const URL = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@task-manager.p7773m1.mongodb.net/?retryWrites=true&w=majority&appName=task-manager`;
mongoose
  .connect(URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connection to database successful");
  });

import cloudinary from "cloudinary";
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
  if (!token) return next();
  console.log(token);
  try {
    const user = await verifyGoogleToken(token);
    req.user = user;
    console.log(user);
    res.locals.sub = user?.sub; // Store name in res.locals
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

async function startApolloServer() {
  await server.start();
  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        return {
          sub: res.locals.sub,
        };
      },
    })
  );
}

startApolloServer().then(() => {
  httpServer.listen({ port: PORT }, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  });
});
