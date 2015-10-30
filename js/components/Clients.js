import React from 'react';

const Clients = ({clients}) => {
  return (
    <div>
      <h3>Clients &amp; Subscriptions</h3>
      <p>Shows all the clients &amp; subscriptions this user has.</p>
      <pre>
        {JSON.stringify(clients, null, 2)}
      </pre>
    </div>
  );
}

export default Clients;
