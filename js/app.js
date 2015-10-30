
import React from 'react';
import ReactDOM from 'react-dom';

import {store} from './store';
import {socket} from './socket';

import TodoApp from './components/TodoApp';

socket.on('change_user', () => {
  store.initialize();
});

socket.on('connect', () => {
  store.initialize();
});

ReactDOM.render(<TodoApp />, document.getElementById('root'));

setInterval(() => {
  socket.emit('ping', new Date());
}, 10000);

socket.on('pong', () => { });
