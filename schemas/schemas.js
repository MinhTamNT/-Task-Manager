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

type Invitation {
  userId: String
  status: InvitationStatus
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  REJECTED
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
}

type Mutation {
  addUser(uuid: String!, name: String!, email: String!, image: String!): User
  addProject(name: String!, description: String): Project
  deleteProject(id: ID!): Message
  inviteUser(projectId: ID!, userId: ID!): Project
  updateInvitationStatus(projectId: ID!, status: InvitationStatus!): Invitation
 createNotification(message: String!, projectId: ID): Notification
  markNotificationAsRead(id: ID!): Notification
}

type Message {
  message: String
}

type Subscription {
  invitationReceived(projectId: ID!): Project
  invitationStatusChanged(projectId: ID!, userId: ID!): Invitation
  notificationCreated: Notification
  projectUpdated(projectId: ID!): Project
}


`;
