import ProjectModel from "../models/ProjectModel.js";
import UserModel from "../models/UserModel.js";

export const resolvers = {
  Query: {
    project: async (parent, args, context) => {
      const projects = await ProjectModel.find({ authorId: context?.sub }).sort(
        {
          updatedAt: "desc",
        }
      );
      return projects;
    },
  },
  Project: {
    author: async (parent, args) => {
      const authorId = parent.authorId;
      const author = await UserModel.findOne({ uuid: authorId });
      return author;
    },
  },
  Mutation: {
    addUser: async (parent, args) => {
      try {
        const foundUser = await UserModel.findOne({ name: args.name });
        if (!foundUser) {
          const newUser = new UserModel(args);
          await newUser.save();
          return newUser;
        }
        return foundUser;
      } catch (error) {
        console.error("Error adding user:", error);
        throw new Error("Failed to add user");
      }
    },
    addProject: async (parent, args, context) => {
      try {
        const newProject = new ProjectModel({
          ...args,
          authorId: context?.sub,
        });
        await newProject.save();
        return newProject;
      } catch (error) {
        console.log(error);
      }
    },
  },
};
