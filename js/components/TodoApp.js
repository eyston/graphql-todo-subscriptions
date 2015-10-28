import React from 'react';

import {store} from '../store';

import TodoTextInput from './TodoTextInput';
import TodoList from './TodoList';
import Viewer from './Viewer';

const individualSubscriptions = `
subscription ($clientSubscriptionId: String) {
  addTodo(clientSubscriptionId: $clientSubscriptionId) {
    todo {
      id
      text
      completed
    }
  }
  deleteTodo(clientSubscriptionId: $clientSubscriptionId) {
    deletedTodoId
  }
  changeTodoStatus(clientSubscriptionId: $clientSubscriptionId) {
    todo {
      id
      completed
    }
  }
}
`;

const rollupSubscription = `
  subscription ($clientSubscriptionId: String) {
    todos(clientSubscriptionId: $clientSubscriptionId) {
      todos {
        id
        text
        completed
      }
    }
  }
`;

export default class TodoApp extends React.Component {

  static query() {
    return `
      query {
        viewer {
          id
          todos {
            id
            text
            completed
          }
        }
      }
    `;
  }

  static subscription() {
    // return rollupSubscription;
    return individualSubscriptions;
  }


  componentWillMount() {
    this.updateState();

    store.on('update', () => {
      this.updateState();
    });
  }

  updateState() {
    this.setState({
      viewer: store.getViewer(),
      todos: store.getTodos()
    });
  }

  _handleTextInputSave(text) {
    store.addTodo(text);
  }

  render() {
    return (
      <div>
        <h3>Viewer</h3>
        <Viewer viewer={this.state.viewer} />
        <h1>Todos</h1>
        <TodoTextInput
          autoFocus={true}
          onSave={(text) => this._handleTextInputSave(text)}
          placeholder="What needs to be done?"
        />
        <TodoList todos={this.state.todos} />
      </div>
    );
  }

}
