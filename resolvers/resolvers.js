import UserModel from "../models/UserModel.js";

export const resolvers = {
  Query: {
    project: () => {
      return "Hello Applo";
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
  },
};
