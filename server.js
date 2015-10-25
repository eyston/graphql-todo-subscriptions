import {graphql} from 'graphql';

import {db} from './data/database';
import {schema} from './data/schema';

console.log('todos', JSON.stringify(db.getTodos(123), null, 2));

const query = `
{
  viewer {
    todos {
      id
      text
    }
  }
}`;

graphql(schema, query).then(response => {
  console.log('graphq', JSON.stringify(response, null, 2));
});
