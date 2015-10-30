import React from 'react';

import {store} from '../store';

var ENTER_KEY_CODE = 13;

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

  handleChange(e) {
    this.setState({text: e.target.value});
  }

  handleKeyDown(e) {
    if (e.keyCode === ENTER_KEY_CODE && this.state.text && this.state.text.length > 0) {
      store.changeUser(this.state.text);
    }
  }

  render() {
    return (
      <div>
        <h3>Viewer</h3>
        <p>You can cut / paste this User GUID to multiple browser windows. Browser windows with the same User GUID should show the same state and subscribe to each others actions</p>
        <input
          style={{width: 300}}
          onChange={(e) => this.handleChange(e)}
          onKeyDown={(e) => this.handleKeyDown(e)}
          type="text"
          value={this.state.text}
        />
        <p>current user: {this.props.viewer.id}</p>
      </div>
    );
  }
}
