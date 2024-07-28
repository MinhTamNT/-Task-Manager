export const typeDefs = `#graphql
type User {
    uuid:String,
    name:String,
    email :String
}
type Project {  
    id:String,
    name:String,
    description : String,
    authorId: String,
    author:User,
    status : String
    members : [User]
}
type Query {
    project : [Project]
}
type Mutation {
    addUser (uuid:String!,name:String!,email:String!) :User,
    addProject (name:String! ) : Project
}
`;
