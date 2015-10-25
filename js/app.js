import io from 'socket.io-client';

var socket = io();

setInterval(() => {
  socket.emit('ping', new Date());
}, 10000);

socket.on('pong', () => {

});

socket.on('graphql', response => {
  console.log('response', JSON.stringify(response, null, 2));
});

socket.emit('graphql', {
  query: `
  {
    viewer {
      todos {
        id
        text
      }
    }
  }
  `,
  variables: { }
});
