var hash = require('crypto-browserify/create-hash')

module.exports.UID = function (name) {
  var r = Math.random().toString().slice(2)
  return hash('sha1').update(name+r).digest('hex')
}

module.exports.search = function (haystack, needle) {
  for (hay in haystack) {
    if (hay.match(needle)) return haystack[hay]
  }
}

module.exports.getPath = function () { 
  if (!window.location.hash) return false
  if (window.location.hash) return window.location.hash.slice(1)
}

module.exports.cancel = function (e) {
  e.preventDefault()
  if (e.stopPropogation) e.stopPropogation()
  return false
}
