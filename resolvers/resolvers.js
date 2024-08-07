import { GraphQLScalarType } from "graphql";
import ProjectModel from "../models/ProjectModel.js";
import UserModel from "../models/UserModel.js";
import NotificationModel from "../models/NotificationModel.js";
import { PubSub } from "graphql-subscriptions";
import Task from "../models/TaskModel.js";
import { sendEmail } from "../controller/sendmail.js";
import ConversationModel from "../models/ConversationModel.js";
import MessageModel from "../models/MessageModel.js";
import { getUserByUuid } from "../helper/user.js";

const pubsub = new PubSub();
const PROJECT_UPDATED = "PROJECT_UPDATED";
const INVITATION_RECEIVED = "INVITATION_RECEIVED";
const INVITATION_STATUS_CHANGED = "INVITATION_STATUS_CHANGED";
const NOTIFICATION_CREATED = "NOTIFICATION_CREATED";
const MESSAGE_RECEIVED = "MESSAGE RECEIVED";

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
    getConversationById: async (parent, { id }) => {
      try {
        console.log("ID", id);
        const res = await ConversationModel.findById(id)
          .populate("participants")
          .populate("lastMessage");
        console.log(res);
        return res;
      } catch (error) {
        console.error("Error fetching conversation:", error);
        throw new Error("Error fetching conversation");
      }
    },
    getConversationsByUserId: async (parent, args, context) => {
      try {
        const user = getUserByUuid(context?.sub);
        const userId = (await user)._id;
        const conversations = await ConversationModel.find({
          participants: userId,
        })
          .populate("participants")
          .populate("lastMessage");
        console.log(conversations);
        return conversations;
      } catch (error) {
        console.error("Error fetching conversations for user:", error);
        throw new Error("Error fetching conversations");
      }
    },
    getMessagesByConversation: async (parent, { conversationId }) => {
      try {
        return await MessageModel.find({
          conversation: conversationId,
        }).populate("sender");
      } catch (error) {
        console.log(error);
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
  Conversation: {
    participants: async (parent) => {
      try {
        return await UserModel.find({ _id: { $in: parent.participants } });
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
    inviteUser: async (parent, { projectId, userId }) => {
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
    createNotification: async (parent, { message, projectId, userId }) => {
      try {
        const notification = new NotificationModel({
          userId,
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
    deletedNotification: async (parent, { id }, context) => {
      try {
        const notify = NotificationModel.findById(id);
        if (!notify) throw new Error("Notify not found");
        await NotificationModel.findByIdAndDelete(id);
        return { message: "Notiy deleted successfully" };
      } catch (error) {
        console.log(error);
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
    createConversation: async (parent, { participants }, context) => {
      try {
        const currentUser = await UserModel.findOne({ uuid: context?.sub });

        if (!currentUser) {
          throw new Error("User not found");
        }

        const currentUserId = currentUser._id;
        console.log("Current User ID:", currentUserId);

        const newConversation = new ConversationModel({
          participants: [...participants, currentUserId],
        });

        await newConversation.save();
        console.log("Conversation created successfully");

        return newConversation;
      } catch (error) {
        console.error("Error creating conversation:", error);
        throw new Error("Error creating conversation");
      }
    },
    sendMessage: async (parent, { content, conversationId }, context) => {
      try {
        const newMessage = new MessageModel({
          content,
          sender: context?.sub,
          conversation: conversationId,
        });
        await newMessage.save();
        pubsub.publish(MESSAGE_RECEIVED, {
          messageReceived: newMessage,
          conversationId,
        });
        return newMessage;
      } catch (error) {
        console.error(error);
        throw new Error("Error sending message");
      }
    },
  },
  Subscription: {
    projectUpdated: {
      subscribe: (parent, { projectId }) =>
        pubsub.asyncIterator([PROJECT_UPDATED]),
    },
    invitationReceived: {
      subscribe: (parent, { projectId, userId }) =>
        pubsub.asyncIterator([INVITATION_RECEIVED]),
    },
    invitationStatusChanged: {
      subscribe: (parent, { projectId }) =>
        pubsub.asyncIterator([INVITATION_STATUS_CHANGED]),
    },
    notificationCreated: {
      subscribe: (parent, { userId }) =>
        pubsub.asyncIterator([NOTIFICATION_CREATED]),
    },
    messageReceived: {
      subscribe: (parent, { conversationId }) =>
        pubsub.asyncIterator([MESSAGE_RECEIVED]),
    },
  },
};
