import React from 'react';

import {store} from '../store';

const handleCompleteChange = (todo) => {
  store.todoCompleteChange(todo.id, !todo.completed);
}

const handleDelete = (todo) => {
  store.todoDelete(todo.id);
}

const Todo = ({todo}) => {
  return (
    <li>
      <input
        checked={todo.completed}
        onChange={() => handleCompleteChange(todo)}
        type="checkbox"
      />
      <span>{todo.text}</span>
      <button
        style={{float: 'right'}}
        onClick={() => handleDelete(todo)}
      >delete</button>
    </li>
  );
}

export default Todo;
