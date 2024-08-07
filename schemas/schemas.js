export const typeDefs = `#graphql
scalar Date

type User {
  id: ID
  uuid: String
  name: String
  email: String
  image: String
}

type Project {
  id: ID!
  name: String
  description: String
  authorId: String
  author: User
  status: String
  members: [User]
  invitations: [Invitation]
}

type Task {
  id: ID
  title: String
  description: String
  assignee: [User]
  dueDate: Date
  status: String
  project: ID
}

type Invitation {
  userId: String
  status: InvitationStatus
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  REJECTED
}

type Conversation {
  id: ID!
  participants: [User!]!
  lastMessage: Message
}

type MessageChat {
  id: ID!
  content: String!
  sender: User!
  conversation: Conversation!
  createdAt: Date!
}

type Notification {
  id: ID!
  userId: ID!
  message: String!
  createdAt: Date!
  read: Boolean!
  projectId:ID
}

type Query {
  project: [Project]
  getProjectById(id: ID!): Project
  notifications: [Notification]
  searchUsersByName(name: String!): [User]
  getTaskByProject(projectId:ID!) : [Task]
  getConversationById(id: ID!): Conversation
  getMessagesByConversation(conversationId: ID!): [MessageChat]
  getConversationsByUserId  : [Conversation]
}

type Mutation {
  addUser(uuid: String!, name: String!, email: String!, image: String!): User
  addProject(name: String!, description: String): Project
  addTask( title: String! description: String ,assignedTo:[ID!] ,dueDate: Date , status: String , project: ID!): Task
  deleteTask(id: ID!): Message
  deleteProject(id: ID!): Message
  inviteUser(projectId: ID!, userId: ID!): Project
  updateInvitationStatus(projectId: ID!, status: InvitationStatus!): Invitation
  createNotification(message: String!, projectId: ID): Notification
  markNotificationAsRead(id: ID!): Notification
  sendMessage(content: String!, conversationId: ID!): Message
  createConversation(participants: [ID!]!): Conversation
  deletedNotification (id:ID!) :Message
 
}

type Message {
  message: String
}

type Subscription {
  invitationReceived(projectId: ID!): Project
  invitationStatusChanged(projectId: ID!): Invitation
  notificationCreated: Notification
  projectUpdated(projectId: ID!): Project
  messageReceived(conversationId: ID!): Message
}


`;
