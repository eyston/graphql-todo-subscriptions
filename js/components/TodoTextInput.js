/* stolen from https://github.com/facebook/relay/blob/master/examples/todo/js/components/TodoTextInput.js */

import React from 'react';
import ReactDOM from 'react-dom';

var ENTER_KEY_CODE = 13;
var ESC_KEY_CODE = 27;

export default class TodoTextInput extends React.Component {
  constructor(props) {
    super(props);
    this.props = {
      commitOnBlur: props.commitOnBlur || false,
    };
    this.state = {
      isEditing: false,
      text: props.initialValue || '',
    }
  }

  componentDidMount() {
    ReactDOM.findDOMNode(this).focus();
  }

  _commitChanges() {
    var newText = this.state.text.trim();
    if (this.props.onDelete && newText === '') {
      this.props.onDelete();
    } else if (this.props.onCancel && newText === this.props.initialValue) {
      this.props.onCancel();
    } else if (newText !== '') {
      this.props.onSave(newText);
      this.setState({text: ''});
    }
  }

  _handleBlur() {
    if (this.props.commitOnBlur) {
      this._commitChanges();
    }
  }

  _handleChange(e) {
    this.setState({text: e.target.value});
  }

  _handleKeyDown(e) {
    if (this.props.onCancel && e.keyCode === ESC_KEY_CODE) {
      this.props.onCancel();
    } else if (e.keyCode === ENTER_KEY_CODE) {
      this._commitChanges();
    }
  }

  render() {
    return (
      <input
        onBlur={(e) => this._handleBlur(e)}
        onChange={(e) => this._handleChange(e)}
        onKeyDown={(e) => this._handleKeyDown(e)}
        placeholder={this.props.placeholder}
        value={this.state.text}
      />
    );
  }
}
