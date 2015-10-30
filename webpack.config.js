var path = require('path');
var webpack = require('webpack');

var config = {
  entry: path.resolve(__dirname, 'js', 'app.js'),
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader'
    }]
  },
  output: {filename: 'app.js', path: path.resolve(__dirname, 'dist', 'js')}
};

module.exports = config;
