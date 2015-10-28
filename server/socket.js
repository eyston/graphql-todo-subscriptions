import {graphql} from 'graphql';
import uuid from 'uuid';

import {db} from '../data/database';
import {schema} from '../data/schema';
import {events} from '../data/events';

const globalUserId = uuid.v1();

export const connect = (socket) => {
  // generate a random user id for every connection
  // const userId = uuid.v1();
  const userId = globalUserId;

  db.initializeUser(userId);

  const user = db.getUser(userId);
  const client = db.addWebsocketClient(userId, socket.id);

  // LISTEN for incoming back-end subscription events
  events.on(`${client.id}.graphql.subscription`, response => {
    socket.emit('graphql:subscription', response);
  });

  // LISTEN to client socket-io requests
  socket.on('graphql:query', request => {
    handleGraphQLRequest(user, client, request).then(response => {
      socket.emit('graphql:query', response);
    });
  });

  socket.on('graphql:mutation', request => {
    handleGraphQLRequest(user, client, request).then(response => {
      socket.emit('graphql:mutation', response);
    });
  });

  socket.on('graphql:subscription', request => {
    handleGraphQLRequest(user, client, request).then(response => {
      socket.emit('graphql:subscription', response);
    });
  });

  // keep alive
  socket.on('ping', data => {
    socket.emit('pong', data);
  });

  // on disconnect clean up the subscriptions / client
  socket.on('disconnect', () => {
    db.getSubscriptions(client.id).forEach(sub => {
      db.deleteSubscription(sub.id);
      events.emit(`subscription.delete.${sub.id}`, {
        subscriptionId: sub.id
      });
    });
    db.deleteClient(client.id);
  });

}

const handleGraphQLRequest = (user, client, request) => {
  const {query,variables} = request;

  const rootValue = {
    user,
    client,

    // TODO: see if we can use the 3rd argument in resolve
    request
  }

  return graphql(schema, query, rootValue, variables);
}
