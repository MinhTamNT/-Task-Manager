import { GraphQLScalarType } from "graphql";
import ProjectModel from "../models/ProjectModel.js";
import UserModel from "../models/UserModel.js";
import NotificationModel from "../models/NotificationModel.js";
import { PubSub } from "graphql-subscriptions";

const pubsub = new PubSub();
const PROJECT_UPDATED = "PROJECT_UPDATED";
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
      const res = await NotificationModel.find({ userId: context?.sub }).sort({
        createdAt: "desc",
      });
      return res;
    },
    searchUsersByName: async (parent, { name }) => {
      return await UserModel.find({ name: { $regex: name, $options: "i" } });
    },
  },
  Project: {
    author: async (parent) => {
      return await UserModel.findOne({ uuid: parent.authorId });
    },
    members: async (parent) => {
      return await UserModel.find({ _id: { $in: parent.members } });
    },
    invitations: async (parent) => {
      return parent.invitations;
    },
  },
  Mutation: {
    addUser: async (parent, args) => {
      const foundUser = await UserModel.findOne({
        name: args.name,
      });
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
    deleteProject: async (parent, { deleteProjectId }, context) => {
      try {
        const project = await ProjectModel.findById(deleteProjectId);
        if (!project) throw new Error("Project not found");
        console.log("Project Id", project);
        if (project.authorId !== context?.sub) throw new Error("Unauthorized");
        await ProjectModel.findByIdAndDelete(deleteProjectId);
        return { message: "Project deleted successfully" };
      } catch (error) {
        console.log(error);
      }
    },
    inviteUser: async (parent, { projectId, userId }, context) => {
      try {
        const project = await ProjectModel.findById(projectId);
        if (!project) throw new Error("Project not found");

        const existingMember = project.members.find(
          (member) => member._id.toString() === userId
        );
        if (existingMember) throw new Error("User is already a member");

        const existingInvitation = project.invitations.find(
          (invite) =>
            invite.userId.toString() === userId && invite.status === "PENDING"
        );
        if (existingInvitation)
          throw new Error("User already has a pending invitation");

        const user = await UserModel.findOne({ uuid: userId });
        if (!user) throw new Error("User not found");

        project.invitations.push({ userId, status: "PENDING" });
        await project.save();

        const notification = new NotificationModel({
          userId,
          message: `You have been invited to join the project ${project.name}`,
          projectId, // Thêm projectId vào thông báo
        });
        await notification.save();

        pubsub.publish(INVITATION_RECEIVED, { invitationReceived: project });
        pubsub.publish(NOTIFICATION_CREATED, {
          notificationCreated: notification,
        });

        return project;
      } catch (error) {
        console.log(error);
      }
    },
    updateInvitationStatus: async (parent, { projectId, status }, context) => {
      const project = await ProjectModel.findById(projectId);
      const userId = context?.sub;
      if (!project) throw new Error("Project not found");
      const invitation = project.invitations.find(
        (invite) => invite.userId.toString() === userId
      );
      if (!invitation) throw new Error("Invitation not found");

      invitation.status = status;

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
        projectId,
      });
      await notification.save();

      pubsub.publish(NOTIFICATION_CREATED, {
        notificationCreated: notification,
      });

      return invitation;
    },
    createNotification: async (parent, { message, projectId }, context) => {
      const notification = new NotificationModel({
        userId: context?.sub,
        message,
        createdAt: new Date(),
        projectId, // Thêm projectId vào thông báo
      });
      await notification.save();

      pubsub.publish(NOTIFICATION_CREATED, {
        notificationCreated: notification,
      });

      return notification;
    },
    markNotificationAsRead: async (parent, { id }, context) => {
      const notification = await NotificationModel.findById(id);
      if (!notification) throw new Error("Notification not found");

      if (notification.userId.toString() !== context?.sub) {
        throw new Error("Unauthorized");
      }

      notification.read = true;
      await notification.save();

      return notification;
    },
  },
  Subscription: {
    projectUpdated: {
      subscribe: (parent, { projectId }) =>
        pubsub.asyncIterator([PROJECT_UPDATED]),
    },
    invitationReceived: {
      subscribe: (parent, { id }) =>
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
