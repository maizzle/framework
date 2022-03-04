const Output = require('../generators/output')

const render = async (html, options) => Output.toString(html, options)

module.exports = render
