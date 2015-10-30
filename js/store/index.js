import EventEmitter from 'events';

import {socket} from '../socket';

import {
  queryAll,
  individualSubscriptions,
  rollupSubscription,
  subscriptionSubscription
} from './queries'

class Store extends EventEmitter {
  constructor() {
    super();
    this.state = { }
  }

  initialize() {
    socket.emit('graphql:query', queryAll());
    socket.emit('graphql:subscription', individualSubscriptions());
    socket.emit('graphql:subscription', subscriptionSubscription());
  }

  refresh() {
    socket.emit('graphql:query', queryAll());
  }

  getTodos() {
    let viewer = this.getViewer();
    if (!viewer.todos) {
      viewer.todos = [];
    }
    return viewer.todos;
  }

  getViewer() {
    if (!this.state.viewer) {
      this.state.viewer = {};
    }
    return this.state.viewer;
  }

  getClients() {
    let viewer = this.getViewer();
    if (!viewer.clients) {
      viewer.clients = [];
    }
    return viewer.clients;
  }

  handleQuery(response) {
    this.state = response.data;

    this.emit('update');
  }

  handleMutation(response) {
    Object.keys(response.data).forEach(key => {
      const value = response.data[key];
      switch(key) {
        case 'addTodo':
          append(this.getTodos(), value);
          break;
        case 'changeTodoStatus':
          let todo = this.getTodos().find(todo => todo.id === value.id);
          Object.assign(todo, value);
          break;
        case 'deleteTodo':
          let todos = this.getTodos();
          this.state.viewer.todos = todos.filter(todo => todo.id !== value);
          break;
        default:
          console.log('unhandled mutation key', key);
          break;
      }
    });

    this.emit('update');
  }

  handleSubscription(response) {
    Object.keys(response.data).forEach(key => {
      const value = response.data[key];
      switch(key) {
        case 'addTodo':
          if (value.todo) {
            append(this.getTodos(), value.todo);
          }
          break;
        case 'deleteTodo':
          if (value.deletedTodoId) {
            let todos = this.getTodos();
            this.state.viewer.todos = todos.filter(todo => todo.id !== value.deletedTodoId);
          }
          break;
        case 'changeTodoStatus':
          if (value.todo) {
            let todo = this.getTodos().find(todo => todo.id === value.todo.id);
            Object.assign(todo, value.todo);
          }
          break;
        case 'todos':
          if (value.todos) {
            this.state.viewer.todos = value.todos;
          }
          break;
        case 'subscriptions':
          if (value.clients) {
            this.state.viewer.clients = value.clients;
          }
          break;
        default:
          console.log('unhandled subscription key', key);
          break;
      }
    });

    this.emit('update');
  }

  changeUser(id) {
    socket.emit('change_user', {
      userId: id
    });
  }

  addTodo(text) {
    socket.emit('graphql:mutation', {
      query: `
        mutation ($text: String) {
          addTodo(text: $text) {
            id
            text
            completed
          }
        }
      `,
      variables: { text }
    });
  }

  todoCompleteChange(id, completed) {
    socket.emit('graphql:mutation', {
      query: `
        mutation ($id: String!, $completed: Boolean!) {
          changeTodoStatus(id: $id, completed: $completed) {
            id
            completed
          }
        }
      `,
      variables: {
        id,
        completed
      }
    });
  }

  todoDelete(id) {
    socket.emit('graphql:mutation', {
      query: `
        mutation ($id: String!) {
          deleteTodo(id: $id)
        }
      `,
      variables: { id }
    })
  }
}

const append = (list, item) => {
  const listContainsItem = list.some(element => element.id === item.id);
  if (!listContainsItem) {
    list.push(item);
  }
}

const store = new Store();

socket.on('graphql:query', response => {
  console.log('query', JSON.stringify(response, null, 2));
  store.handleQuery(response);
});

socket.on('graphql:mutation', response => {
  console.log('mutation', JSON.stringify(response, null, 2));
  store.handleMutation(response);
});

socket.on('graphql:subscription', response => {
  console.log('subscription', JSON.stringify(response, null, 2));
  store.handleSubscription(response);
});


export {store}
