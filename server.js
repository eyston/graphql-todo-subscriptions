import db from './data/database';

console.log('todos', JSON.stringify(db.getTodos(123), null, 2));
