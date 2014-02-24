// NIMOY/browser


// SETUP WEBSOCKET
var websocStream = require('websocket-stream')
var host = window.document.location.host.replace(/:.*/, '')
if (window.location.port) host += (':' + window.location.port)
if (window.location.protocol === 'https:') var ws = websocStream('wss://' + host)
if (window.location.protocol === 'http:') var ws = websocStream('ws://' + host)


// SETUP DB
var ml = require('multilevel')
var manifest = require('./manifest.json')
var db = ml.client(manifest)
var rpc = db.createRpcStream()
ws.pipe(rpc).pipe(ws)

// RUN BRICO
var bricoleur = require('./_brico')
var brico = bricoleur(db)
brico.installMuxDemux(rpc)
brico.on('error', function (e) {
  console.error(e)
})

