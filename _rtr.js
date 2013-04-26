var filed = require('filed')
, async = require('async')

module.exports = function (opts) { // ROUTER / include additional info - like user agent
  if (!opts) var opts = null
  opts = [
    {url:"/",
    file:"./_wilds/_index.html"},
    {url:"/_bundle.min.js",
    file:"./_wilds/_bundle.js"},
    {url:"/_styles.css",
    file:"./_wilds/_styles.css"}
  ]

  this.handleReqs = function (req,res) {
    var match = false
    , headers = req.headers
    , origin = headers.referer
    , agent = headers['user-agent']
    , host = headers.host

    async.forEach(opts, function (route, cb) {
      if (route.url === req.url) {
        console.dir('serving '+route.file)
        filed(route.file).pipe(res)
        match = true
      }
      cb()
    }, function () {
      if (match === false) res.end('404')
    })
  }
}
