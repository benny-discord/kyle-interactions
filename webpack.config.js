const path = require('path')
const webpack = require('webpack')

const mode = process.env.NODE_ENV || 'production'

module.exports = {
	output: {
		filename: `out.js`,
		path: __dirname,
	},
	mode,
	resolve: {
		extensions: ['.js'],
		plugins: [],
		fallback: { util: false }
	},
	entry: './src/index.js'
}