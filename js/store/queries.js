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
    subscription (
        $addTodoSubscriptionId: String!,
        $deleteTodoSubscriptionId: String!,
        $changeTodoSubscriptionId: String!) {
      addTodo(clientSubscriptionId: $addTodoSubscriptionId) {
        todo {
          id
          text
          completed
        }
      }
      deleteTodo(clientSubscriptionId: $deleteTodoSubscriptionId) {
        deletedTodoId
      }
      changeTodoStatus(clientSubscriptionId: $changeTodoSubscriptionId) {
        todo {
          id
          completed
        }
      }
    }
  `,
  variables: {
    addTodoSubscriptionId: generateSubId(),
    deleteTodoSubscriptionId: generateSubId(),
    changeTodoSubscriptionId: generateSubId()
  }
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
