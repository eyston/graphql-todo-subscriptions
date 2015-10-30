import React from 'react';

import {store} from '../store';

import TodoTextInput from './TodoTextInput';
import TodoList from './TodoList';
import Viewer from './Viewer';
import Clients from './Clients';

export default class TodoApp extends React.Component {

  componentWillMount() {
    this.updateState();

    store.on('update', () => {
      this.updateState();
    });
  }

  updateState() {
    this.setState({
      viewer: store.getViewer(),
      todos: store.getTodos(),
      clients: store.getClients()
    });
  }

  _handleTextInputSave(text) {
    store.addTodo(text);
  }

  handleRefreshClick() {
    store.refresh();
  }

  render() {
    return (
      <div>
        <button onClick={() => this.handleRefreshClick()}>refresh</button>
        <Viewer viewer={this.state.viewer} />
        <h1>Todos</h1>
        <TodoTextInput
          autoFocus={true}
          onSave={(text) => this._handleTextInputSave(text)}
          placeholder="What needs to be done?"
        />
        <TodoList todos={this.state.todos} />
        <Clients clients={this.state.clients} />
      </div>
    );
  }

}
