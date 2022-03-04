const Plaintext = require('../generators/plaintext')

const toPlaintext = async (html, config = {}) => Plaintext.generate(html, false, config)

module.exports = toPlaintext
