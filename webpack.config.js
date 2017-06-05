const server = {
  entry: './index.js',
  output: {
    path: __dirname,
    filename: 'bundle.js'
  },
  node: {
    fs: 'empty'
  },
  target: 'node'
};


const client = {
  entry: './client.js',
  output: {
    path: __dirname,
    filename: 'client.bundle.js'
  },

  module: {
    loaders: [
      {
        test   : /client\.js$/,
        exclude: /node_modules/,
        loader : 'babel-loader',
        query  : {
          presets: [ 'es2015' ]
        }
      },
      {
        test   : /\.css$/,
        exclude: /node_modules/,
        loader : 'style-loader!css-loader'
      }      
    ]
  }  
};


module.exports = [
  client,
  server
];