import EventEmitter from 'events';

import {socket} from '../socket';

class Store extends EventEmitter {
  constructor() {
    super();
    this.state = {
      todos: []
    }
  }

  getTodos() {
    return this.state.todos;
  }

  handleQuery(response) {
    Object.keys(response.data).forEach(key => {
      this.set(key, response.data[key]);
    });
  }

  handleMutation(response) {
    Object.keys(response.data).forEach(key => {
      const value = response.data[key];
      switch(key) {
        case 'addTodo':
          this.state.todos = append(this.state.todos, value);
          break;
        case 'changeTodoStatus':
          let todo = this.state.todos.find(todo => todo.id === value.id);
          Object.assign(todo, value);
          break;
        case 'deleteTodo':
          this.state.todos = this.state.todos.filter(todo => todo.id !== value);
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
            this.state.todos = append(this.state.todos, value.todo);
          }
          break;
        case 'deleteTodo':
          if (value.deletedTodoId) {
            this.state.todos = this.state.todos
              .filter(todo => todo.id !== value.deletedTodoId);
          }
          break;
        case 'changeTodoStatus':
          if (value.todo) {
            let todo = this.state.todos.find(todo => todo.id === value.todo.id);
            Object.assign(todo, value.todo);
            break;
          }
        default:
          console.log('unhandled subscription key', key);
          break;
      }
    });

    this.emit('update');
  }

  set(key, data) {
    switch(key) {
      case 'viewer':
        this.set('todos', data.todos);
        break;
      case 'todos':
        this.state.todos = data;
        break;
      default:
        console.log('unhandled key', key);
        break;
    }

    this.emit('update');
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
  if (listContainsItem) {
    return list;
  } else {
    return list.concat([item]);
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
