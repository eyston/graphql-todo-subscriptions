import {graphql} from 'graphql';
import {Map,List,Record} from 'immutable';

import {schema} from '../data/schema';
import {db} from '../data/database';
import {events} from '../data/events';

// keep track of subscription handlers so we can remove them!
let handlers = Map();

const Handler = Record({type: undefined, callback: undefined });

export const startWorkers = () => {
  events.on('subscription.new', handleSubscriptionNew);
  events.on('subscription.delete.*', handleSubscriptionDelete);
}

// when a new subscription is made we start up a listener
// for each of the subscription events
const handleSubscriptionNew = ({subscriptionId}) => {
  const subscription = db.getSubscription(subscriptionId);

  handlers = handlers.set(
    subscriptionId,
    List(subscription.events).map(ev => {
      return Handler({
        type: ev,
        callback: handleSubscriptionEvent.bind(null, subscription)
      });
    })
  );

  // start'em up!
  handlers
    .get(subscriptionId)
    .forEach(handler => events.on(handler.type, handler.callback))
}

// when the subscription is deleted we remove all those listeners
const handleSubscriptionDelete = ({subscriptionId}) => {
  handlers.get(subscriptionId).forEach(handler => {
    events.removeListener(handler.type, handler.callback);
  });

  handlers = handlers.delete(subscriptionId);
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
  const client = db.getClient(subscription.clientId);
  const user = db.getUser(client.userId);

  const {request,clientSubscriptionId} = subscription;
  const {query,variables} = request;

  const rootValue = {
    user,
    client,

    request,

    subscription: {
      clientSubscriptionId,
      event
    }
  }

  graphql(schema, query, rootValue, variables)
    .then(response => {
      events.emit(`${subscription.clientId}.graphql.subscription`, response);
    });
}
