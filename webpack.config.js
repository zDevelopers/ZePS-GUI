'use strict';

const webpack = require('webpack');
const path = require('path');

const ExtractTextWebpackPlugin = require('extract-text-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const prod = process.env.NODE_ENV === 'production';

let config = {
    context: path.resolve(__dirname, 'assets'),
    mode: prod ? 'production' : 'development',
    entry: {
        'zeps-gui': './js/index.js'
    },
    output: {
        path: path.resolve(__dirname, './web/dist'),
        filename: '[name].min.js',
        publicPath: '/dist'
    },
    resolve: {
        alias: {
            // For Leaflet… TODO find a better solution, that's pretty ugly.
            './images/layers.png$': path.resolve(__dirname, './node_modules/leaflet/dist/images/layers.png'),
            './images/layers-2x.png$': path.resolve(__dirname, './node_modules/leaflet/dist/images/layers-2x.png'),
            './images/marker-icon.png$': path.resolve(__dirname, './node_modules/leaflet/dist/images/marker-icon.png'),
            './images/marker-icon-2x.png$': path.resolve(__dirname, './node_modules/leaflet/dist/images/marker-icon-2x.png'),
            './images/marker-shadow.png$': path.resolve(__dirname, './node_modules/leaflet/dist/images/marker-shadow.png')
        },
        unsafeCache: !prod
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            },
            {
                test: /\.scss$/,
                use: ExtractTextWebpackPlugin.extract({
                    fallback: 'style-loader',
                    use: [
                        {
                            loader: 'css-loader',
                            options: { sourceMap: !prod }
                        },
                        {
                            loader: 'sass-loader',
                            options: { sourceMap: !prod }
                        },
                        'postcss-loader'
                    ],
                })
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2)$/,
                loader: 'file-loader?name=/fonts/[name].[ext]'
            },
            {
                test: /\.(png|jpe?g|gif)$/,
                loader: 'file-loader?name=/images/[name].[ext]'
            }
        ]
    },
    plugins: [
        new ExtractTextWebpackPlugin('zeps-gui.min.css'),
        new webpack.LoaderOptionsPlugin({
            debug: !prod
        })
    ],
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    filename: '[name].min.js',
                    chunks: 'all',
                }
            }
        },
        minimize: prod
    },
    devServer: {
        contentBase: path.resolve(__dirname, './web'),
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        historyApiFallback: true,
        inline: true,
        open: false,
        hot: true
    },
    devtool: prod ? undefined : 'eval-source-map'
}

if (prod)
{
    config.plugins.push(new OptimizeCssAssetsPlugin({
        cssProcessor: require('cssnano'),
        cssProcessorOptions: { discardComments: { removeAll: true } },
        canPrint: true
    }));
}

module.exports = config;
