const webpack = require('webpack'); // eslint-disable-line no-unused-vars

module.exports = {

  entry: './index.js',
  target: 'node',

  output: {
    path: __dirname,
    filename: 'bundle.js'
  }

};
