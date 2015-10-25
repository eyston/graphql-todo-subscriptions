import {
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql'

import {db} from './database';

const TodoType = new GraphQLObjectType({
  name: 'Todo',
  fields: {
    id: { type: GraphQLInt },
    text: { type: GraphQLString }
  }
});

const ViewerType = new GraphQLObjectType({
  name: 'Viewer',
  fields: {
    todos: {
      type: new GraphQLList(TodoType),
      resolve: (viewer) => db.getTodos(viewer.id)
    }
  }
});

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    viewer: { type: ViewerType, resolve: () => ({id: 123}) }
  }
})

export const schema = new GraphQLSchema({
  query: QueryType
});
