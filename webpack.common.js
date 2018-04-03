'use strict'

const path = require('path')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const FaviconsWebpackPlugin = require('webapp-webpack-plugin') // favicons-webpack-plugin

const extractPlugin = new ExtractTextPlugin({
    filename: '[name].css',
    allChunks: true
})

module.exports = {
    target: 'web',
    entry: {
        main: './src/app'
    },
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: '[name].js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                          cacheDirectory: true,
                          presets: [['@babel/preset-env', { useBuiltIns: 'entry' }]]
                        }
                    }
                ]
            },
            {
                test: /normalize.css/,
                use: extractPlugin.extract({
                    use: ['css-loader']
                })
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/index.html',
            hash: true
        }),
        extractPlugin,
        new FaviconsWebpackPlugin({
            logo: './src/logo.png'
        }),
        new CleanWebpackPlugin(['dist']),
        new CopyWebpackPlugin([
            { from: 'src/demo-songs', to: 'demo-songs' }
        ])
    ]
}
