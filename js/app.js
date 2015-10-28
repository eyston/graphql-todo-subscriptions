import io from 'socket.io-client';

const socket = io();

const idGenerator = () => {
  let id = 0;
  return () => {
    return id++;
  }
}

const generateId = idGenerator();


setInterval(() => {
  socket.emit('ping', new Date());
}, 10000);

socket.on('pong', () => {

});

socket.on('graphql:query', response => {
  console.log('query', JSON.stringify(response, null, 2));
});

socket.on('graphql:mutation', response => {
  console.log('mutation', JSON.stringify(response, null, 2));
});

socket.on('graphql:subscription', response => {
  console.log('subscription', JSON.stringify(response, null, 2));
});

window.listTodos = () => {
  socket.emit('graphql:query', {
    query: `
    {
      viewer {
        id
        todos {
          id
          text
          completed
        }
      }
    }
    `,
    variables: { }
  });
}

window.addTodo = (text) => {
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
    variables: {
      text: text
    }
  });
}

window.deleteTodo = id => {
  socket.emit('graphql:mutation', {
    query: `
    mutation ($id: Int) {
      deleteTodo(id: $id)
    }
    `,
    variables: {
      id: id
    }
  });
}

window.listTodos();

window.subscribeAddTodo = () => {
  socket.emit('graphql:subscription', {
    query: `
    subscription ($clientSubscriptionId: String) {
      addTodo(clientSubscriptionId: $clientSubscriptionId) {
        clientSubscriptionId
        subscription {
          id
          clientSubscriptionId
        }
        todo {
          id
          text
          completed
        }
      }
    }`,
    variables: { }
  });
}

window.subscribeAddTodoWithId = (clientSubscriptionId = generateId()) => {
  socket.emit('graphql:subscription', {
    query: `
    subscription ($clientSubscriptionId: String) {
      addTodo(clientSubscriptionId: $clientSubscriptionId) {
        clientSubscriptionId
        subscription {
          id
          clientSubscriptionId
        }
        todo {
          id
          text
          completed
        }
      }
    }
    `,
    variables: {
      clientSubscriptionId: clientSubscriptionId
    }
  });
}

window.listSubscriptions = () => {
  socket.emit('graphql:query', {
    query: `
    query {
      viewer {
        clients {
          id
          type
          socketId
          user {
            id
          }
          subscriptions {
            id
            clientSubscriptionId
          }
        }
        subscriptions {
          id
          clientSubscriptionId
          client {
            id
          }
        }
      }
    }
    `,
    variables: { }
  })
}
