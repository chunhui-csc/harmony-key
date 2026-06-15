const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: {
      background: './src/background/index.ts',
      content: './src/content/index.ts',
      popup: './src/popup/index.tsx',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          // content 入口的 CSS 用 MiniCssExtractPlugin 提取为独立文件
          // popup 的 CSS 由 style-loader 内联
          oneOf: [
            {
              issuer: /src[\\/]content[\\/]/,
              use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            {
              use: ['style-loader', 'css-loader'],
            },
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@content': path.resolve(__dirname, 'src/content'),
        '@background': path.resolve(__dirname, 'src/background'),
        '@popup': path.resolve(__dirname, 'src/popup'),
      },
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'content.css',
      }),
      new HtmlWebpackPlugin({
        template: './src/popup/index.html',
        filename: 'popup.html',
        chunks: ['popup'],
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'manifest.json',
            to: 'manifest.json',
          },
          {
            from: 'public',
            to: 'public',
            noErrorOnMissing: true,
          },
        ],
      }),
    ],
    devtool: isDev ? 'inline-source-map' : false,
  };
};
