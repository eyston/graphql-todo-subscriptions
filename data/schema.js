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
    }
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

class AddTodoEvent extends Record({
  type: 'TODO_ADD',
  userId: undefined,
  todoId: undefined
}) { }

const AddTodoMutation = {
  type: TodoType,
  args: {
    text: { type: GraphQLString }
  },
  resolve: ({user}, {text}) => {
    const todo = db.addTodo(user.id, text);
    events.emit(`${user.id}.todo.add`, {
      type: 'TODO_ADD',
      todoId: todo.id
    });
    return todo;
  }
};

const AddTodoSubscriptionPayloadType = new GraphQLObjectType({
  name: 'AddTodoSubscriptionPayload',
  fields: {
    clientSubscriptionId: {
      type: GraphQLString,
      resolve: ({subscription}) => subscription.clientSubscriptionId
    },
    subscription: {
      type: SubscriptionType,
      resolve: ({subscription}) => subscription
    },
    todo: {
      type: TodoType,
      resolve: ({event}) => event ? db.getTodo(event.todoId) : null
    }
  }
});

const AddTodoSubscription = {
  type: AddTodoSubscriptionPayloadType,
  args: {
    clientSubscriptionId: { type: GraphQLString }
  },
  resolve: ({user,client,request,event}, {clientSubscriptionId}, {variableValues}) => {
    let subscription = db.getClientSubscription(client.id, clientSubscriptionId);

    if (!subscription) {
      subscription = db.addSubscription(
        client.id,
        clientSubscriptionId,
        [`${user.id}.todo.add`],
        request
      );

      events.emit('subscription.new', {
        type: 'SUBSCRIPTION_NEW',
        subscriptionId: subscription.id
      });
    }

    if (event && event.type === 'TODO_ADD') {
      return {
        subscription,
        event
      }
    } else {
      return {
        subscription
      }
    }
  }
}

const DeleteTodoMutation = {
  type: GraphQLString,
  args: {
    id: { type: new GraphQLNonNull(GraphQLString) }
  },
  resolve: ({user}, {id}) => {
    db.deleteTodo(id);
    events.emit(`${user.id}.todo.delete`, {
      type: 'TODO_DELETE',
      todoId: id
    });
    return id
  }
}

const DeleteTodoSubscriptionPayloadType = new GraphQLObjectType({
  name: 'DeleteTodoSubscriptionPayload',
  fields: {
    clientSubscriptionId: {
      type: GraphQLString,
      resolve: ({subscription}) => subscription.clientSubscriptionId
    },
    subscription: {
      type: SubscriptionType,
      resolve: ({subscription}) => subscription
    },
    deletedTodoId: {
      type: GraphQLString,
      resolve: ({event}) => event ? event.todoId : null
    }
  }
});

const DeleteTodoSubscription = {
  type: DeleteTodoSubscriptionPayloadType,
  args: {
    clientSubscriptionId: { type: GraphQLString }
  },
  resolve: ({user,client,request,event}, {clientSubscriptionId}, {variableValues}) => {
    let subscription = db.getClientSubscription(client.id, clientSubscriptionId);

    if (!subscription) {
      subscription = db.addSubscription(
        client.id,
        clientSubscriptionId,
        [`${user.id}.todo.delete`],
        request
      );

      events.emit('subscription.new', {
        type: 'SUBSCRIPTION_NEW',
        subscriptionId: subscription.id
      });
    }

    if (event && event.type === 'TODO_DELETE') {
      return {
        subscription,
        event
      }
    } else {
      return {
        subscription
      }
    }
  }
}

const ChangeTodoStatusMutation = {
  type: TodoType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    completed: { type: new GraphQLNonNull(GraphQLBoolean) }
  },
  resolve: ({user}, {id, completed}) => {
    const todo = db.changeTodoStatus(id, completed);
    events.emit(`${user.id}.todo.change_status`, {
      type: 'TODO_CHANGE_STATUS',
      todoId: todo.id
    });
    return todo;
  }
};

const ChangeTodoStatusSubscriptionPayloadType = new GraphQLObjectType({
  name: 'ChangeTodoStatusSubscriptionPayload',
  fields: {
    clientSubscriptionId: {
      type: GraphQLString,
      resolve: ({subscription}) => subscription.clientSubscriptionId
    },
    subscription: {
      type: SubscriptionType,
      resolve: ({subscription}) => subscription
    },
    todo: {
      type: TodoType,
      resolve: ({event}) => event ? db.getTodo(event.todoId) : null
    }
  }
});

const ChangeTodoStatusSubscription = {
  type: ChangeTodoStatusSubscriptionPayloadType,
  args: {
    clientSubscriptionId: { type: GraphQLString }
  },
  resolve: ({user,client,request,event}, {clientSubscriptionId}, {variableValues}) => {
    let subscription = db.getClientSubscription(client.id, clientSubscriptionId);

    if (!subscription) {
      subscription = db.addSubscription(
        client.id,
        clientSubscriptionId,
        [`${user.id}.todo.change_status`],
        request
      );

      events.emit('subscription.new', {
        type: 'SUBSCRIPTION_NEW',
        subscriptionId: subscription.id
      });
    }

    if (event && event.type === 'TODO_CHANGE_STATUS') {
      return {
        subscription,
        event
      }
    } else {
      return {
        subscription
      }
    }
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
    clientSubscriptionId: { type: GraphQLString }
  },
  resolve: ({user,client,request,event}, {clientSubscriptionId}, {variableValues}) => {
    let subscription = db.getClientSubscription(client.id, clientSubscriptionId);

    if (!subscription) {
      subscription = db.addSubscription(
        client.id,
        clientSubscriptionId,
        [`${user.id}.todo.change_status`, `${user.id}.todo.add`, `${user.id}.todo.delete`],
        request
      );

      events.emit('subscription.new', {
        type: 'SUBSCRIPTION_NEW',
        subscriptionId: subscription.id
      });
    }

    return {
      subscription,
      user
    }
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
    todos: TodoSubscription
  }
})

export const schema = new GraphQLSchema({
  query: QueryRootType,
  mutation: MutationRootType,
  subscription: SubscriptionRootType
});
