const path = require('path');
const webpack = require('webpack');

const entry = exports.entry = './src/index.js';
exports.name = 'av';

exports.create = () => ({
  entry: {
    av: entry,
  },
  output: {
    filename: '[name].js',
    libraryTarget: 'umd2',
    library: 'LY',
    path: path.resolve(__dirname, '../dist'),
  },
  resolve: {},
  devtool: 'source-map',
  node: {
    // do not polyfill Buffer
    Buffer: false,
    stream: false,
    process: false,
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, '../src'),
          path.resolve(__dirname, '../node_modules/weapp-polyfill'),
        ],
        loader: 'babel-loader',
        query: {
          presets: ['es2015'],
        },
      }, {
        test: /\.js$/,
        enforce: 'pre',
        include: [
          path.resolve(__dirname, '../src'),
        ],
        use: [
          {
            loader: 'webpack-strip-block',
            options: {
              start: 'NODE-ONLY:start',
              end: 'NODE-ONLY:end',
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.EnvironmentPlugin([
      'CLIENT_PLATFORM',
    ]),
    new webpack.optimize.UglifyJsPlugin({
      include: /-min\.js$/,
      sourceMap: true,
    }),
  ],
});
