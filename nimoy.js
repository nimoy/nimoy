var fs = require('fs')
var level = require('level')
var multiLevel = require('multilevel')
var liveStream = require('level-live-stream')
var fileServer = require('node-static')
var webSocketStream = require('websocket-stream')
var webSocketServer = require('ws').Server
var Bricoleur = require('./_bricoleur')
var mappify = require('./_map')

var server
var serverInfo = 'nginx' // uhm...
var brico
var file
var dB


var config = (process.argv[2]) 
  ? config = require(process.argv[2]) 
  : config = require('./config.json') 

if (config.modules.slice(-1) !== '/') config.modules += '/' 
if (config.static.slice(-1) !== '/') config.static += '/'

var mount = st({index:'index.html',path:config.static,passthrough:true}) 

if (config.crypto) {

  var tlsConfig = {
    key : fs.readFileSync(config.crypto.key),
    cert : fs.readFileSync(config.crypto.cert),
    honorCipherOrder : true,
    cipher : 'ecdh+aesgcm:dh+aesgcm:ecdh+aes256:dh+aes256:'+
             'ecdh+AES128:DH+AES:ECDH+3DES:DH+3DES:RSA+AESGCM:'+
             'RSA+AES:RSA+3DES:!aNULL:!MD5:!DSS'
  }

  if (config.crypto.ca) tlsConfig.ca = fs.readFileSync(config.crypto.ca)

  var file = fileServer.Server(config.static, {'Strict-Transport-Security','max-age=31536000'})

  server = require('https').createServer(tlsConfig, function (req,res) {
    doHttp(req, res)
  })
}

if (!config.crypto)  {
  var file = fileServer.Server(config.static)
  server = require('http').createServer(doHttp)
}

function doHttp (req, res) { 
  file.serve(req, res, function (e, res) {
    if(e) file.serveFile('/index.html', 200, {}, req, res)
  })
}

server.listen(config.port, config.host, function setupWebSocket () {
  var ws = new webSocketServer({server:server})

  ws.on('connection', function newSocketConnection (soc) {
    var levelServer = multiLevel.server(db)
    var wss = webSocketStream(soc) 

    wss.pipe(levelServer).pipe(wss)

    wss.on('error', function (e) {
      console.error('webSocStreamErr: '+e)
    })

    brico.installMuxDemux(levelServer)
  })
})


db = level('./'+config.host) 
liveStream.install(db)
multiLevel.writeManifest(db, config.static+'manifest.json')


var browserBootScript = config.static+'boot.js'

writeBrowserFiles(function thenMappify () { // todo: allow map to be called with cli / web api
  var dbWriteStream = db.createWriteStream()

  mappify({
    wilds : config.modules,
    bundle : config.static+'bundle.js',
    browserify : browserBootScript,
    min : config.minify
  }).pipe(dbWriteStream)
    .on('error', console.error)

  dbWriteStream.on('close', function () {

    brico = Bricoleur(db, {wilds:config.modules})

    process.stdin.pipe(brico)

    console.log('nimoy running on host: "'+config.host+'" port: "'+config.port+'"')
    //if (config.cli === true) 
      // process.stdin.pipe(require('./_cli')()).pipe(brico).pipe(process.stdout)
  })
})


function writeBrowserFiles (written) {

  var indexHtml = '<!doctype html><html lang="en">'
    + '<head><meta charset="utf-8"></head>'
    + '<body><script src="/bundle.js"></script></body>'
    + '</html>'

  fs.writeFileSync(config.static+'index.html', indexHtml)
   
  fs.writeFileSync(browserBootScript, thisFnBodyToString(function () {
  // Start Browser Boot 
  var websocStream = require('websocket-stream')
  var host = window.document.location.host.replace(/:.*/, '')
  if (window.location.port) host += (':'+window.location.port)
  if (window.location.protocol === 'https:') var ws = websocStream('wss://' + host)
  if (window.location.protocol === 'http:') var ws = websocStream('ws://' + host)

  var ml = require('multilevel')
  var manifest = require('./manifest.json')
  var multiLevel = ml.client(manifest)
  var rpc = multiLevel.createRpcStream()
  ws.pipe(rpc).pipe(ws)
  ws.on('error', function (e) {
    console.error(e)
  })

  var bricoleur = require('../_bricoleur')
  var Brico = new bricoleur(multiLevel)
  Brico.installMuxDemux(rpc)
  // End Browser Boot
  })) 

  written()
}


// Utils
function thisFnBodyToString (fn) {// takes fn as input, unwraps and returns string
  var s = fn.toString()
  return s.substring(0,s.lastIndexOf('\n')).substring(s.indexOf('\n'),s.length)
}
