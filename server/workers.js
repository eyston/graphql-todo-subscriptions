import {graphql} from 'graphql';

import {schema} from '../data/schema';
import {db} from '../data/database';
import {events} from '../data/events';

export const startWorkers = () => {
  events.on('subscription.new', handleSubscriptionNew);
}

export const stopWorkers = () => {
  events.removeListener('subscription.new', handleSubscriptionNew);
}

// when a new subscription is made we start up a listener
// for each of the subscription events
//
// when the subscription is deleted we remove all those listeners
const handleSubscriptionNew = ({subscriptionId}) => {
  const subscription = db.getSubscription(subscriptionId);

  const handlers = subscription.events.map(ev => {
    const handler = {
      type: ev,
      callback: handleSubscriptionEvent.bind(null, subscription)
    };

    events.on(handler.type, handler.callback);

    return handler;
  });

  const removeEvent = `subscription.delete.${subscription.id}`;
  const removeHandlers = () => {
    events.removeListener(removeEvent, removeHandlers);
    handlers.forEach(handler => {
      events.removeListener(handler.type, handler.callback);
    });
  }

  events.on(removeEvent, removeHandlers)
}

// when an event the subscription is listening for happens we execute
// a new graphql query with the subscription query and variables
// and the event payload
//
// this produces a graphql response which we emit to any clients
// listening for graphql subscription executions
//
// in this app that would be the socket-io client which is listening
// for any and all subscription events for its own client id
const handleSubscriptionEvent = (subscription, event) => {
  const {query,variables} = subscription.request;
  const client = db.getClient(subscription.clientId);
  const user = db.getUser(client.userId);

  const variablesWithSubId = {
    clientSubscriptionId: subscription.clientSubscriptionId,
    ...variables
  };

  const rootValue = {
    user,
    client,

    request: {
      query,
      variables: variablesWithSubId
    },

    event
  }

  graphql(schema, query, rootValue, variablesWithSubId)
    .then(response => {
      events.emit(`${subscription.clientId}.graphql.subscription`, response);
    });
}
