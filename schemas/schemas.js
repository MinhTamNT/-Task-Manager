export const typeDefs = `#graphql
type User {
    name:String,
    email :String
}
type Project {
    name:String,
    description : String,
}
type Query {
    project : [Project]
}
type Mutation {
    addUser (name:String!,email:String!) :User,
}
`;
