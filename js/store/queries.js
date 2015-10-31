let subIds = 0;
const generateSubId = () => {
  return subIds++;
}

export const queryAll = () => ({
  query: `
    query {
      viewer {
        id
        todos {
          id
          text
          completed
        }
        clients {
          id
          type
          subscriptions {
            id
            clientSubscriptionId
            events
          }
        }
      }
    }
  `,
  variables: { }
})

export const individualSubscriptions = () => ({
  query: `
    subscription {
      addTodo {
        id
        text
        completed
      }
      deleteTodo
      changeTodoStatus {
        id
        completed
      }
    }
  `,
  variables: { }
})

export const rollupSubscription = () => ({
  query: `
    subscription ($clientSubscriptionId: String!) {
      todos(clientSubscriptionId: $clientSubscriptionId) {
        todos {
          id
          text
          completed
        }
      }
    }
  `,
  variables: {
    clientSubscriptionId: generateSubId()
  }
})

export const subscriptionSubscription = () => ({
  query: `
    subscription ($clientSubscriptionId: String!) {
      subscriptions(clientSubscriptionId: $clientSubscriptionId) {
        clients {
          id
          type
          subscriptions {
            id
            clientSubscriptionId
            events
          }
        }
      }
    }
  `,
  variables: {
    clientSubscriptionId: generateSubId()
  }
})
