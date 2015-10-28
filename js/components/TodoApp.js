import React from 'react';

import {store} from '../store';

import TodoTextInput from './TodoTextInput';
import TodoList from './TodoList';

export default class TodoApp extends React.Component {

  static query() {
    return `
      query {
        viewer {
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
    return `
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
  }


  componentWillMount() {
    this.updateState();

    store.on('update', () => {
      this.updateState();
    });
  }

  updateState() {
    this.setState({
      todos: store.getTodos()
    });
  }

  _handleTextInputSave(text) {
    store.addTodo(text);
  }

  render() {
    return (
      <div>
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
