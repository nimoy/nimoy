var telepath = require('tele')
, stream = require('stream')

module.exports = function (usr, map) { // BRICOLEUR 
  var self = this
  telepath(this) // use telepath server side -- otherwise allow multiple streams/keys to be added

  if (usr) self.usr = usr
  if (map) {
    self.map = map
    console.log(map)
  }
    
  this.recv = function (buffer) {
    var data = JSON.parse(buffer.toString())
    console.log(data)
  }

  // prob. temp hack for adding server side stream conn's
  // ------------------------------------------------------
  this.addConnection = function (key) {
    self[key] = {}
    var s = self[key]

    // add write stream
    s.in = new stream.Writable()
    s.in._write = function (chunk, encoding, cb) {
      self.recv(chunk)
      cb()
    }
    // add read stream
    s.out = new stream()
    s.out.readable = true
    s.send = function (data) {
      s.out.emit('data',data)
    }
  }

  this.rmConnection = function (key) {
    self[key].out.emit('close')
    delete self[key]
  }// -------------------------------------------------------
}
