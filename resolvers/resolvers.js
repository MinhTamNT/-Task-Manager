import { GraphQLScalarType } from "graphql";
import ProjectModel from "../models/ProjectModel.js";
import UserModel from "../models/UserModel.js";
import NotificationModel from "../models/NotificationModel.js";
import { PubSub } from "graphql-subscriptions";

const pubsub = new PubSub();
const INVITATION_RECEIVED = "INVITATION_RECEIVED";
const INVITATION_STATUS_CHANGED = "INVITATION_STATUS_CHANGED";
const NOTIFICATION_CREATED = "NOTIFICATION_CREATED";

export const resolvers = {
  Date: new GraphQLScalarType({
    name: "Date",
    parseValue(value) {
      return new Date(value);
    },
    serialize(value) {
      return value.toISOString();
    },
  }),
  Query: {
    project: async (parent, args, context) => {
      return await ProjectModel.find({ authorId: context?.sub }).sort({
        updatedAt: "desc",
      });
    },
    getProjectById: async (parent, { id }) => {
      return await ProjectModel.findById(id);
    },
    notifications: async (parent, args, context) => {
      return await NotificationModel.find({ userId: context?.sub }).sort({
        createdAt: "desc",
      });
    },
    searchUsersByName: async (parent, { name }) => {
      const users = await UserModel.find({
        name: { $regex: name, $options: "i" },
      });
      return users;
    },
  },
  Project: {
    author: async (parent) => {
      return await UserModel.findOne({ uuid: parent.authorId });
    },
    invitations: async (parent) => {
      return null;
    },
  },
  Mutation: {
    addUser: async (parent, args) => {
      const foundUser = await UserModel.findOne({ name: args.name });
      if (!foundUser) {
        const newUser = new UserModel(args);
        await newUser.save();
        return newUser;
      }
      return foundUser;
    },
    addProject: async (parent, args, context) => {
      const newProject = new ProjectModel({
        ...args,
        authorId: context?.sub,
      });
      await newProject.save();
      return newProject;
    },
    deleteProject: async (parent, { id }, context) => {
      const project = await ProjectModel.findById(id);
      if (!project) throw new Error("Project not found");
      if (project.authorId !== context?.sub) throw new Error("Unauthorized");
      await ProjectModel.findByIdAndDelete(id);
      return { message: "Project deleted successfully" };
    },
    inviteUser: async (parent, { projectId, userId }, context) => {
      const project = await ProjectModel.findById(projectId);
      if (!project) throw new Error("Project not found");

      const existingMember = project.members.find(
        (member) => member.uuid === userId
      );
      if (existingMember) throw new Error("User is already a member");

      const user = await UserModel.findOne({ uuid: userId });
      if (!user) throw new Error("User not found");

      project.invitations.push({ userId, status: "PENDING" });
      await project.save();

      const notification = new NotificationModel({
        userId,
        message: `You have been invited to join the project ${project.name}`,
      });
      await notification.save();

      pubsub.publish(INVITATION_RECEIVED, { invitationReceived: project });
      pubsub.publish(NOTIFICATION_CREATED, {
        notificationCreated: notification,
      });

      return project;
    },
    updateInvitationStatus: async (
      parent,
      { projectId, userId, status },
      context
    ) => {
      const project = await ProjectModel.findById(projectId);
      if (!project) throw new Error("Project not found");

      const invitation = project.invitations.find(
        (invite) => invite.userId === userId
      );
      if (!invitation) throw new Error("Invitation not found");

      invitation.status = status;
      await project.save();

      if (status === "ACCEPTED") {
        const user = await UserModel.findOne({ uuid: userId });
        if (!user) throw new Error("User not found");

        project.members.push(user);
        await project.save();
      }

      pubsub.publish(INVITATION_STATUS_CHANGED, {
        invitationStatusChanged: invitation,
      });

      const notification = new NotificationModel({
        userId,
        message: `Your invitation to the project ${
          project.name
        } has been ${status.toLowerCase()}`,
        createdAt: new Date(),
      });
      await notification.save();

      pubsub.publish(NOTIFICATION_CREATED, {
        notificationCreated: notification,
      });

      return invitation;
    },
    createNotification: async (parent, { message }, context) => {
      const notification = new NotificationModel({
        userId: context?.sub,
        message,
        createdAt: new Date(),
      });
      await notification.save();

      pubsub.publish(NOTIFICATION_CREATED, {
        notificationCreated: notification,
      });

      return notification;
    },
  },
  Subscription: {
    invitationReceived: {
      subscribe: (parent, { projectId }) =>
        pubsub.asyncIterator([INVITATION_RECEIVED]),
    },
    invitationStatusChanged: {
      subscribe: (parent, { projectId, userId }) =>
        pubsub.asyncIterator([INVITATION_STATUS_CHANGED]),
    },
    notificationCreated: {
      subscribe: () => pubsub.asyncIterator([NOTIFICATION_CREATED]),
    },
  },
};
