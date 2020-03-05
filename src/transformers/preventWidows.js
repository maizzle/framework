const posthtml = require('posthtml')
const preventWidows = require('prevent-widows')

module.exports = async (html) => {
  return posthtml([preventWidows.posthtml()]).process(html).then(res => res.html)
}
