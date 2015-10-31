import {graphql} from 'graphql';
import uuid from 'uuid';
import {Subject,AsyncSubject} from 'rx';

import {db} from '../data/database';
import {schema} from '../data/schema';
import {events} from '../data/events';

export const connect = (socket) => {
  // generate a random user id for every connection
  let {user,client} = initialze(socket, uuid.v1());

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
    graphqlObservable(user, client, request).subscribe(response => {
      console.log('response-sub', response);
      socket.emit('graphql:subscription', response);
    }, err => {
      console.log('error', err);
    }, () => {
      console.log('on complete');
    });
  });

  socket.on('change_user', data => {
    deleteClient(client);

    // we want to set user to the new user
    const context = initialze(socket, data.userId);
    user = context.user;
    client = context.client;

    socket.emit('change_user', {});
  });

  // keep alive
  socket.on('ping', data => {
    socket.emit('pong', data);
  });

  // on disconnect clean up the subscriptions / client
  socket.on('disconnect', () => {
    deleteClient(client);
  });

}

const handleGraphQLRequest = (user, client, request, roots) => {
  const {query,variables} = request;

  const rootValue = {
    user,
    client,

    ...roots
  }

  return graphql(schema, query, rootValue, variables);
}

const initialze = (socket, userId) => {
  db.initializeUser(userId);

  const user = db.getUser(userId);
  const client = db.addWebsocketClient(userId, socket.id);
  events.emit(`${client.userId}.client.add`, { clientId: client.id });

  return {
    user,
    client
  }
}

const deleteClient = (client) => {
  db.deleteClient(client.id);

  events.removeAllListeners(`${client.id}.graphql.subscription`);
}

const graphqlObservable = (user, client, request) => {

  let responses = new Subject();
  let events = new Subject();

  handleGraphQLRequest(user, client, request, {
    subscription: {
      mode: 'INITIALIZE',
      events
    }
  }).then(responses.onNext.bind(responses));

  events.subscribe(event => {
    handleGraphQLRequest(user, client, request, {
      subscription: {
        mode: 'EVENT',
        event
      }
    }).then(responses.onNext.bind(responses));
  });

  return responses;
}
