const webpack = require("webpack");
const path = require("path");

const ExtractTextWebpackPlugin = require("extract-text-webpack-plugin");

module.exports = {
    context: path.resolve(__dirname, "assets"),
    entry: "./js/index.js",
    output: {
        path: path.resolve(__dirname, "./web/dist"),
        filename: "./zeps-gui.js",
        publicPath: "/dist"
    },
    devtool: 'source-map',
    resolve: {
        alias: {
            // For Leaflet… TODO find a better solution, that's pretty ugly.
            './images/layers.png$': path.resolve(__dirname, './node_modules/leaflet/dist/images/layers.png'),
            './images/layers-2x.png$': path.resolve(__dirname, './node_modules/leaflet/dist/images/layers-2x.png'),
            './images/marker-icon.png$': path.resolve(__dirname, './node_modules/leaflet/dist/images/marker-icon.png'),
            './images/marker-icon-2x.png$': path.resolve(__dirname, './node_modules/leaflet/dist/images/marker-icon-2x.png'),
            './images/marker-shadow.png$': path.resolve(__dirname, './node_modules/leaflet/dist/images/marker-shadow.png')
        }
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "babel-loader"
            },
            {
                test: /\.scss$/,
                use: ExtractTextWebpackPlugin.extract({
                    fallback: 'style-loader',
                    use: [
                        {
                            loader: 'css-loader',
                            options: { sourceMap: true }
                        },
                        {
                            loader: 'sass-loader',
                            options: { sourceMap: true }
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
        new ExtractTextWebpackPlugin("./zeps-gui.css"),
        new webpack.LoaderOptionsPlugin({
            debug: true
        })
    ]
}
