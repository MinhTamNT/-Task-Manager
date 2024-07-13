import express from "express";
import http from "http";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServer } from "apollo-server-express"; // Updated import
import { typeDefs } from "./schemas/schemas.js";
import { resolvers } from "./resolvers/resolvers.js";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import cors from "cors";
import bodyParser from "body-parser";

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

app.use(cors(), bodyParser.json());

httpServer.listen({ port: PORT }, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
});
