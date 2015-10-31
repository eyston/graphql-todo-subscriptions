import {List,Record} from 'immutable';

import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLInt,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';

import {db} from './database';
import {events} from './events';

const UserType = new GraphQLObjectType({
  name: 'User',
  fields: {
    id: { type: GraphQLString }
  }
});

const TodoType = new GraphQLObjectType({
  name: 'Todo',
  fields: {
    id: { type: GraphQLString },
    text: { type: GraphQLString },
    completed: { type: GraphQLBoolean }
  }
});

const SubscriptionType = new GraphQLObjectType({
  name: 'Subscription',
  fields: () => ({
    id: { type: GraphQLString },
    clientSubscriptionId: { type: GraphQLString },
    client: {
      type: WebsocketClientType,
      resolve: sub => db.getClient(sub.clientId)
    },
    events: { type: new GraphQLList(GraphQLString) }
  })
});

const WebsocketClientType = new GraphQLObjectType({
  name: 'WebsocketClient',
  fields: {
    id: { type: GraphQLString },
    type: { type: GraphQLString },
    socketId: { type: GraphQLString },
    user: {
      type: UserType,
      resolve: client => db.getUser(client.userId)
    },
    subscriptions: {
      type: new GraphQLList(SubscriptionType),
      resolve: client => db.getSubscriptions(client.id).toArray()
    }
  }
})

const ViewerType = new GraphQLObjectType({
  name: 'Viewer',
  fields: {
    id: { type: GraphQLString },
    todos: {
      type: new GraphQLList(TodoType),
      resolve: (viewer) => db.getTodos(viewer.id).toArray()
    },
    clients: {
      type: new GraphQLList(WebsocketClientType),
      resolve: (viewer) => db.getClients(viewer.id).toArray()
    },
    subscriptions: {
      type: new GraphQLList(SubscriptionType),
      resolve: (viewer) => {
        const clients = db.getClients(viewer.id);
        return clients.flatMap(client =>
          db.getSubscriptions(client.id)
        ).toArray();
      }
    }
  }
});

const QueryRootType = new GraphQLObjectType({
  name: 'QueryRoot',
  fields: {
    viewer: { type: ViewerType, resolve: ({user}) => user }
  }
});

const AddTodoMutation = {
  type: TodoType,
  args: {
    text: { type: GraphQLString }
  },
  resolve: ({user}, {text}) => {
    return db.addTodo(user.id, text);
  }
};

const AddTodoSubscription = {
  type: TodoType,
  resolve: ({user,client,subscription}) => {
    if (subscription.mode === 'INITIALIZE') {
      events.on(`${user.id}.todo.add`, ev => subscription.events.onNext(ev));
    }

    const event = subscription.event;
    const todoId = event && event.type === 'USER_TODO_ADD' && event.todoId;

    return todoId ? db.getTodo(todoId) : null;
  }
}

const DeleteTodoMutation = {
  type: GraphQLString,
  args: {
    id: { type: new GraphQLNonNull(GraphQLString) }
  },
  resolve: ({user}, {id}) => {
    if(db.deleteTodo(id)) {
      return id
    }
  }
}

const DeleteTodoSubscription = {
  type: GraphQLString,
  resolve: ({user,client,subscription}) => {
    if (subscription.mode === 'INITIALIZE') {
      events.on(`${user.id}.todo.remove`, ev => subscription.events.onNext(ev));
    }

    const event = subscription.event;
    const todoId = event && event.type === 'USER_TODO_REMOVE' && event.todoId;

    return todoId ? todoId : null;
  }
}

const ChangeTodoStatusMutation = {
  type: TodoType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    completed: { type: new GraphQLNonNull(GraphQLBoolean) }
  },
  resolve: ({user}, {id, completed}) => {
    return db.changeTodoStatus(id, completed);
  }
};

const ChangeTodoStatusSubscription = {
  type: TodoType,
  resolve: ({user,client,request,subscription}) => {
    if (subscription.mode === 'INITIALIZE') {
      events.on(`${user.id}.todo.change_status`, ev => subscription.events.onNext(ev));
    }

    const event = subscription.event;
    const todoId = event && event.type === 'USER_TODO_CHANGE_STATUS' && event.todoId;

    return todoId ? db.getTodo(todoId) : null;
  }
}

const TodosSubscriptionPayloadType = new GraphQLObjectType({
  name: 'TodosSubscriptionPayloadType',
  fields: {
    clientSubscriptionId: {
      type: GraphQLString,
      resolve: ({subscription}) => subscription.clientSubscriptionId
    },
    subscription: {
      type: SubscriptionType,
      resolve: ({subscription}) => subscription
    },
    todos: {
      type: new GraphQLList(TodoType),
      resolve: ({user}) => db.getTodos(user.id).toArray()
    }
  }
});

const TodoSubscription = {
  type: TodosSubscriptionPayloadType,
  args: {
    clientSubscriptionId: { type: new GraphQLNonNull(GraphQLString) }
  },
  resolve: ({user,client,request}, {clientSubscriptionId}, {variableValues}) => {
    let subscription = db.getClientSubscription(client.id, clientSubscriptionId);

    if (!subscription) {
      subscription = db.addSubscription(
        client.id,
        clientSubscriptionId,
        [
          `${user.id}.todo.change_status`,
          `${user.id}.todo.add`,
          `${user.id}.todo.delete`
        ],
        request
      );
    }

    return {
      subscription,
      user
    }
  }
}

const SubscriptionSubscription = {
  type: ViewerType,
  args: {
    clientSubscriptionId: { type: new GraphQLNonNull(GraphQLString) }
  },
  resolve: ({user,client,request}, {clientSubscriptionId}) => {
    let subscription = db.getClientSubscription(client.id, clientSubscriptionId);

    if (!subscription) {
      subscription = db.addSubscription(
        client.id,
        clientSubscriptionId,
        [
          `${user.id}.client.add`,
          `${user.id}.client.remove`,
          `${user.id}.subscription.add`,
          `${user.id}.subscription.remove`,
        ],
        request
      );
    }

    return user;
  }
}

const MutationRootType = new GraphQLObjectType({
  name: 'MutationRoot',
  fields: {
    addTodo: AddTodoMutation,
    deleteTodo: DeleteTodoMutation,
    changeTodoStatus: ChangeTodoStatusMutation
  }
});

const SubscriptionRootType = new GraphQLObjectType({
  name: 'SubscriptionRoot',
  fields: {
    addTodo: AddTodoSubscription,
    deleteTodo: DeleteTodoSubscription,
    changeTodoStatus: ChangeTodoStatusSubscription,
    todos: TodoSubscription,
    subscriptions: SubscriptionSubscription
  }
})

export const schema = new GraphQLSchema({
  query: QueryRootType,
  mutation: MutationRootType,
  subscription: SubscriptionRootType
});
