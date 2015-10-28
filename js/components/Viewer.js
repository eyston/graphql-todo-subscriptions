import React from 'react';

import {store} from '../store';

export default class Viewer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      text: ''
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.viewer.id) {
      this.setState({
        text: nextProps.viewer.id
      });
    }
  }

  onChange(e) {
    this.setState({text: e.target.value});
  }

  onClick() {
    if (this.state.text && this.state.text.length > 0) {
      store.changeUser(this.state.text);
    }
  }

  render() {
    return (
      <div>
        <p>You can cut / paste this User GUID to multiple browser windows. Browser windows with the same User GUID should show the same state and subscribe to each others actions</p>
        <input
          style={{width: 300}}
          onChange={(e) => this.onChange(e)}
          type="text"
          value={this.state.text}
        />
        <button onClick={() => this.onClick()}>change user</button>
      </div>
    );
  }
}
