import {EventEmitter2} from 'eventemitter2';

export const events = new EventEmitter2({
  wildcard: true,
  maxListeners: 500 // yolo
});
