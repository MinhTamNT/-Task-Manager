import { GraphQLScalarType } from "graphql";
import ProjectModel from "../models/ProjectModel.js";
import UserModel from "../models/UserModel.js";
import NotificationModel from "../models/NotificationModel.js";
import { PubSub } from "graphql-subscriptions";
import Task from "../models/TaskModel.js";
import { sendEmail } from "../controller/sendmail.js";

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
      return await NotificationModel.find({ userId: context?.sub }).sort({
        createdAt: "desc",
      });
    },
    searchUsersByName: async (parent, { name }) => {
      return await UserModel.find({ name: { $regex: name, $options: "i" } });
    },
    getTaskByProject: async (parent, { projectId }) => {
      try {
        const tasks = await Task.find({ project: projectId }).sort({
          createdAt: "desc",
        });
        console.log("Fetched tasks:", tasks);
        return tasks;
      } catch (error) {
        console.error("Error fetching tasks:", error);
        throw new Error("Error fetching tasks");
      }
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
  Task: {
    assignee: async (parent) => {
      try {
        return await UserModel.find({ _id: { $in: parent.assignedTo } });
      } catch (error) {
        console.error("Error fetching assignees:", error);
        throw new Error("Error fetching assignees");
      }
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
      try {
        const project = await ProjectModel.findById(id);
        console.log(project);
        if (!project) throw new Error("Project not found");
        if (project.authorId !== context?.sub) throw new Error("Unauthorized");
        await ProjectModel.findByIdAndDelete(id);
        return { message: "Project deleted successfully" };
      } catch (error) {
        console.error(error);
        throw new Error("Error deleting project");
      }
    },
    addTask: async (
      parent,
      { title, description, assignedTo, dueDate, status, project }
    ) => {
      try {
        const task = new Task({
          title,
          description,
          dueDate,
          status,
          assignedTo,
          project,
        });

        await task.save();
        const users = await UserModel.find({ _id: { $in: assignedTo } });
        const emails = users.map((user) => user.email);
        const subject = `New Task Assigned: ${title}`;
        const text = `You have been assigned a new task titled "${title}".\n\nDescription: ${description}\nDue Date: ${dueDate}\nStatus: ${status}\nProject: ${project}`;
        for (const email of emails) {
          await sendEmail(email, subject, text);
        }
        return task;
      } catch (error) {
        console.error(error);
        throw new Error("Error creating task", error);
      }
    },
    inviteUser: async (parent, { projectId, userId }, context) => {
      try {
        const project = await ProjectModel.findById(projectId);
        if (!project) throw new Error("Project not found");

        if (project.members.includes(userId)) {
          throw new Error("User is already a member");
        }

        const existingInvitation = project.invitations.find(
          (invite) =>
            invite.userId.toString() === userId && invite.status === "PENDING"
        );
        if (existingInvitation) {
          throw new Error("User already has a pending invitation");
        }

        const user = await UserModel.findOne({ uuid: userId });
        if (!user) throw new Error("User not found");

        project.invitations.push({ userId, status: "PENDING" });
        await project.save();

        const notification = new NotificationModel({
          userId,
          message: `You have been invited to join the project ${project.name}`,
          projectId,
        });
        await notification.save();

        pubsub.publish(INVITATION_RECEIVED, { invitationReceived: project });
        pubsub.publish(NOTIFICATION_CREATED, {
          notificationCreated: notification,
        });

        return project;
      } catch (error) {
        console.error(error);
        throw new Error("Error inviting user");
      }
    },
    updateInvitationStatus: async (parent, { projectId, status }, context) => {
      try {
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
          invitationStatusChanged: { invitation, projectId },
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
      } catch (error) {
        console.error(error);
        throw new Error("Error updating invitation status");
      }
    },
    createNotification: async (parent, { message, projectId }, context) => {
      try {
        const notification = new NotificationModel({
          userId: context?.sub,
          message,
          createdAt: new Date(),
          projectId,
        });
        await notification.save();

        pubsub.publish(NOTIFICATION_CREATED, {
          notificationCreated: notification,
        });

        return notification;
      } catch (error) {
        console.error(error);
        throw new Error("Error creating notification");
      }
    },
    markNotificationAsRead: async (parent, { id }, context) => {
      try {
        const notification = await NotificationModel.findById(id);
        if (!notification) throw new Error("Notification not found");

        if (notification.userId.toString() !== context?.sub) {
          throw new Error("Unauthorized");
        }

        notification.read = true;
        await notification.save();

        return notification;
      } catch (error) {
        console.error(error);
        throw new Error("Error marking notification as read");
      }
    },
  },
  Subscription: {
    projectUpdated: {
      subscribe: (parent, { projectId }) =>
        pubsub.asyncIterator([PROJECT_UPDATED]),
    },
    invitationReceived: {
      subscribe: (parent, { projectId }) =>
        pubsub.asyncIterator([INVITATION_RECEIVED]),
    },
    invitationStatusChanged: {
      subscribe: (parent, { projectId }) =>
        pubsub.asyncIterator([INVITATION_STATUS_CHANGED]),
    },
    notificationCreated: {
      subscribe: () => pubsub.asyncIterator([NOTIFICATION_CREATED]),
    },
  },
};
