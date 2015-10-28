
import React from 'react';
import ReactDOM from 'react-dom';

import {store} from './store';
import {socket} from './socket';

import TodoApp from './components/TodoApp';

socket.emit('graphql:query', {query: TodoApp.query(), variables: {} });
socket.emit('graphql:subscription', {query: TodoApp.subscription(), variables: {} });

ReactDOM.render(<TodoApp />, document.getElementById('root'));

setInterval(() => {
  socket.emit('ping', new Date());
}, 10000);

socket.on('pong', () => { });
