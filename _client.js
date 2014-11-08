var manifest = require('./static/manifest.json')
var lib = require('./library.json')
var url = require('url')
var cuid = require('cuid')
var bindshim = require('bindshim')
var om = require('./lib/omni.js')
var omni

var ws = (!lib.env.soc || lib.env.soc === 'ws') 
  ? require('websocket-stream')('ws://'+lib.env.host+':'+lib.env.port)
  : null
 
ws.on('error', Errs)

var db = require('multilevel').client(manifest)
           .on('error', Errs)

var bricoleur = require('./_bricoleur')(db,lib)
                  .on('error', Errs)

ws.pipe(db.createRpcStream()).pipe(ws)

function Errs (err) {
  if (err.code === 1) 
    if (omni.write) omni.write({code:1})
}

function loadCanvas (loc) {
  loc = (loc.newURL) ? url.parse(loc.newURL) : url.parse(loc)

  var canvas = (loc.path !== '/') 
    ? loc.path.slice(1)
    : (!loc.hash) 
    ? 'home' 
    : loc.hash.slice(1)

  if (canvas[0] === '@' || sessionStorage.edit) {
    omni = om({id:cuid(),lib:lib})
    omni.pipe(bricoleur).pipe(omni)
  } 

  if (canvas[0] !== '@') bricoleur.write('!#'+canvas)
}

window.addEventListener('hashchange', loadCanvas, false)

window.addEventListener('popstate', function (e) {
  if (e.state) console.log(e.state)
}, false)

loadCanvas(window.location.href)
