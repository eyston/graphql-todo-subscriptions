import {Map,List,Record,Set} from 'immutable';
import uuid from 'uuid';

import {events} from './events';

class User extends Record({
  id: undefined
}) { }

class Client extends Record({
  id: undefined,
  userId: undefined,
  type: undefined,
  socketId: undefined
}) { }

class Todo extends Record({
  id: undefined,
  userId: undefined,
  text: undefined,
  completed: false
}) { }

class Subscription extends Record({
  id: undefined,
  clientSubscriptionId: undefined,
  clientId: undefined,
  events: undefined,
  request: undefined
}) { }

class TodoDatabase {
  constructor() {
    this.data = Map({
      users: Map(),
      todos: Map(),
      clients: Map(),
      subscriptions: Map(),

      indexes: Map()
    });
  }

  // USERS

  initializeUser(userId) {
    if (!this.data.hasIn(['users', userId])) {
      const user = new User({
        id: userId
      });

      this.data = this.data.setIn(['users', userId], user);

      this.addTodo(user.id, 'Buy a unicorn');
      this.addTodo(user.id, 'Try out GraphQL Subscriptions');
    }

    return this.getUser(userId);
  }

  getUser(userId) {
    return this.data.getIn(['users', userId]);
  }

  // CLIENTS

  addWebsocketClient(userId, socketId) {
    const client = new Client({
      id: uuid.v1(),
      userId,
      type: 'WEBSOCKET',
      socketId
    });

    this.data = this.data.setIn(['clients', client.id], client);
    this.addIndex(userId, 'clients', client.id);

    events.emit(`client.new`, { type: 'CLIENT_NEW', clientId: client.id });
    events.emit(`${userId}.client.add`, { type: 'USER_CLIENT_ADD', clientId: client.id });

    return client;
  }

  getClients(userId) {
    return this.getIndex(userId, 'clients').map(id => this.getClient(id));
  }

  getClient(clientId) {
    return this.data.getIn(['clients', clientId]);
  }

  deleteClient(clientId) {
    const client = this.getClient(clientId);

    if (client) {
      this.getSubscriptions(client.id).forEach(sub => {
        this.deleteSubscription(sub.id);
      });

      this.data = this.data.deleteIn(['clients', client.id]);
      this.deleteIndexes(client.id);
      this.deleteIndex(client.userId, 'clients', client.id);

      events.emit(`client.delete.${clientId}`, { type: 'CLIENT_DELETE', clientId: client.id });
      events.emit(`${client.userId}.client.remove`, { type: 'USER_CLIENT_REMOVE', clientId: client.id});

      return true;
    } else {
      return false;
    }

  }

  // SUBSCRIPTIONS

  getSubscriptions(clientId) {
    return this.getIndex(clientId, 'subscriptions')
      .map(id => this.getSubscription(id));
  }

  getClientSubscription(clientId, clientSubscriptionId) {
    return this.getSubscriptions(clientId)
      .find(sub => sub.clientSubscriptionId === clientSubscriptionId);
  }

  getSubscription(subscriptionId) {
    return this.data.getIn(['subscriptions', subscriptionId]);
  }

  addSubscription(
    clientId,
    clientSubscriptionId = uuid.v1(),
    subscribedEvents,
    request) {
    const subscription = new Subscription({
      id: uuid.v1(),
      clientSubscriptionId,
      clientId,
      events: subscribedEvents,
      request
    });

    this.data = this.data.setIn(['subscriptions', subscription.id], subscription);
    this.addIndex(clientId, 'subscriptions', subscription.id);

    events.emit('subscription.new', { type: 'SUBSCRIPTION_NEW', subscriptionId: subscription.id });

    const client = db.getClient(clientId);
    events.emit(`${client.id}.subscription.add`, { type: 'CLIENT_SUBSCRIPTION_ADD', subscriptionId: subscription.id });
    events.emit(`${client.userId}.subscription.add`, { type: 'USER_SUBSCRIPTION_ADD', subscriptionId: subscription.id });

    return subscription;
  }

  deleteSubscription(subscriptionId) {
    const sub = this.getSubscription(subscriptionId);

    if (sub) {
      this.data = this.data.deleteIn(['subscriptions', sub.id]);
      this.deleteIndexes(sub.id);
      this.deleteIndex(sub.clientId, 'subscriptions', sub.id);

      events.emit(`subscription.delete.${sub.id}`, { type: 'SUBSCRIPTION_DELETE', subscriptionId: sub.id });
      const client = db.getClient(sub.clientId);
      events.emit(`${client.id}.subscription.remove`, { type: 'CLIENT_SUBSCRIPTION_REMOVE', subscriptionId: sub.id, clientId: client.id });
      events.emit(`${client.userId}.subscription.remove`, { type: 'USER_SUBSCRIPTION_REMOVE', subscriptionId: sub.id, userId: client.userId });

      return true;
    } else {
      return false;
    }
  }

  // TODOS

  getTodos(userId) {
    return this.getIndex(userId, 'todos').map(id => this.getTodo(id));
  }

  getTodo(todoId) {
    return this.data.getIn(['todos', todoId]);
  }

  addTodo(userId, text) {
    const todo = new Todo({
      id: uuid.v1(),
      text: text,
      userId: userId
    });

    this.data = this.data.setIn(['todos', todo.id], todo);
    this.addIndex(userId, 'todos', todo.id);

    events.emit(`todo.new`, { type: 'TODO_NEW', todoId: todo.id });
    events.emit(`${userId}.todo.add`, { type: 'USER_TODO_ADD', todoId: todo.id, userId: userId });

    return todo;
  }

  changeTodoStatus(todoId, completed) {
    this.data = this.data.updateIn(['todos', todoId], todo => {
      return todo.set('completed', completed);
    });

    const todo = this.getTodo(todoId);
    events.emit(`todo.change_status.${todo.id}`, { type: 'TODO_CHANGE_STATUS', todoId: todo.id });
    events.emit(`${todo.userId}.todo.change_status`, { type: 'USER_TODO_CHANGE_STATUS', todoId: todo.id, userId: todo.userId });


    return this.getTodo(todoId);
  }

  deleteTodo(todoId) {
    const todo = this.getTodo(todoId);

    if (todo) {
      this.data = this.data.deleteIn(['todos', todo.id]);
      this.deleteIndexes(todo.id);
      this.deleteIndex(todo.userId, 'todos', todo.id);

      events.emit(`todo.delete.${todo.id}`, { type: 'TODO_DELETE', todoId: todo.id });
      events.emit(`${todo.userId}.todo.remove`, { type: 'USER_TODO_REMOVE', todoId: todo.id, userId: todo.userId });

      return true;
    } else {
      return false;
    }
  }

  // MISC

  addIndex(from, name, id) {
    this.data = this.data.updateIn(['indexes', from, name], List(), ids => {
      return ids.push(id);
    });
  }

  getIndex(from, name) {
    return this.data.getIn(['indexes', from, name], List());
  }

  deleteIndex(from, name, id) {
    this.data = this.data.updateIn(['indexes', from, name], List(), ids => {
      return ids.filter(i => i !== id);
    });
  }

  deleteIndexes(from) {
    this.data = this.data.deleteIn(['indexes', from]);
  }

}

export const db = new TodoDatabase();
