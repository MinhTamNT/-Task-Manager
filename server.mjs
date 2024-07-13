import express from "express";
import http from "http";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServer } from "apollo-server-express"; // Updated import
import { typeDefs } from "./schemas/schemas.js";
import { resolvers } from "./resolvers/resolvers.js";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import "dotenv/config";
import cloudinary from "cloudinary";
const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 4000;

const schema = makeExecutableSchema({ typeDefs, resolvers });

const server = new ApolloServer({
  schema,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

// Use applyMiddleware to connect ApolloServer to Express
async function startApolloServer() {
  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });
}

startApolloServer();

// connect database

const URL = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@task-manager.p7773m1.mongodb.net/?retryWrites=true&w=majority&appName=task-manager`;

mongoose
  .connect(URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("Connection database successfully");
  });

//configuration cloudinary
cloudinary.config({
  secure: true,
});
app.use(cors(), bodyParser.json());

httpServer.listen({ port: PORT }, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
});
