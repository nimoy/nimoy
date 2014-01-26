// BRICO

var env = process.title // node or browser
var through = require('through')

module.exports = function bricoleur (data, ready) {
  var self = this

  var liveStream = data.liveStream({old:false}) 

  liveStream.on('data', function (d) {
    console.log(d)
  })
      
  data.get('map', function (e, val) {
    if (e) console.error(e)
    if (!e) console.log(val)
  })

  ready()

  this.put = function (mod, cb) { // put module
    // put 'module' opt=string opt=string

  }
  this.rm = function (mod, cb) { // rm module
    // rm module

  }
  this.conn = function (mods, cb) { // connect modules
    // conn module module module

  }
  this.disconn = function (mods, cb) { // disconnect modules
    // disconn module /single /chain

  }
  this.status = function (cb) {
    // view env & conns
    
  }
  // map / survey / library -- transforms?
  // search
  // put / rm
  // conn / disconn
  // env / status
  // events
  // object/transport/stream protocol
}
