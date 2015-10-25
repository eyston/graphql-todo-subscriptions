import path from 'path';

import express from 'express';
import http from 'http';
import IO from 'socket.io';
import {graphql} from 'graphql';
import webpack from 'webpack';
import webpackMiddleware from 'webpack-dev-middleware';

import {db} from './data/database';
import {schema} from './data/schema';

const APP_PORT = 3000;

const compiler = webpack({
  entry: path.resolve(__dirname, 'js', 'app.js'),
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader'
    }]
  },
  output: {filename: 'app.js', path: '/'}
});

const app = express();
const server = http.Server(app);
const io = IO(server);

io.on('connection', socket => {
  socket.on('ping', data => {
    socket.emit('pong', data);
  });

  socket.on('graphql', request => {
    graphql(schema, request.query, null, request.variables).then(response => {
      socket.emit('graphql', response);
    });
  });
});

app.use('/', express.static('public'));

app.use(webpackMiddleware(compiler, {
  contentBase: '/public/',
  publicPath: '/js',
  stats: {colors: true}
}));

server.listen(APP_PORT, () => {
  console.log(`App is now running on http://localhost:${APP_PORT}`);
});
