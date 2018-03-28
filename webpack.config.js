'use strict';

const webpack = require('webpack');
const path = require('path');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
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
        filename: prod ? '[name].[hash].min.js' : '[name].min.js',
        publicPath: '/dist'
    },
    resolve: {
        extensions: ['.js', '.scss', '.sass'],
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
                test: /\.s(a|c)ss$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: !prod
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: !prod
                        }
                    }
                ]
                // loader: [
                //     prod ? MiniCssExtractPlugin.loader : 'style-loader',
                //     'css-loader',
                //     {
                //         loader: 'sass-loader',
                //         options: {
                //             sourceMap: !prod,
                //             filename: prod ? '[name].[hash].min.css' : '[name].min.css',
                //         }
                //     }
                // ]
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2)$/,
                loader: 'file-loader',
                options: {
                    name: '/fonts/[name].[ext]'
                }
            },
            {
                test: /\.(png|jpe?g|gif)$/,
                loader: 'file-loader',
                options: {
                    name: '/images/[name].[ext]'
                }
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: prod ? '[name].[hash].min.css' : '[name].min.css',
            chunkFilename: prod ? '[id].[hash].min.css' : '[id].min.css'
        }),
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
                    filename: prod ? '[name].[hash].min.js' : '[name].min.js',
                    chunks: 'all',
                }
            }
        },
        minimize: prod
    },
    devServer: {
        contentBase: path.resolve(__dirname, './web'),
        publicPath: '/dist/',
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        historyApiFallback: true,
        inline: true,
        open: false,
        hot: true
    },
    devtool: prod ? undefined : 'eval-source-map'
};

if (prod)
{
    config.plugins.push(new OptimizeCssAssetsPlugin({
        cssProcessor: require('cssnano'),
        cssProcessorOptions: { discardComments: { removeAll: true } },
        canPrint: true
    }));
}

module.exports = config;
