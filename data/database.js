import {Map} from 'immutable';

const generateId = (() => {
  let id = 0;
  return () => {
    return id++;
  }
})();

class TodoDatabase {
  constructor() {
    this.data = Map();
  }

  getTodos(userId) {
    var userData = this._getUserData(userId);
    return userData.get('todos');
  }

  _getUserData(userId) {
    if (!this.data.has(userId)) {
      this._initializeUserData(userId);
    }

    return this.data.get(userId);
  }

  _initializeUserData(userId) {
    this.data = this.data.set(userId, Map({
      todos: [{
        id: generateId(),
        text: 'Buy a unicorn'
      },{
        id: generateId(),
        text: 'Try out GraphQL Subscriptions'
      }]
    }));
  }
}

var db = new TodoDatabase();

export default db;
