var hmac = require('crypto-browserify/create-hmac')
var hash = require('crypto-browserify/create-hash')
var config = require('./bricoleurConfig.json')
var Buffer = require('buffer/').Buffer
var through = require('through2')

var Canvas = function (interface) {
  var self = this

  this._ = { brico : { s : interface } }

  function parse (d, cbPipe, cbModule) {
    if (typeof d === 'string') {  // check for hash!
      (!d.match('>')) ? cbModule(d) : cbPipe(d.split('>'))
    }
    if (d instanceof Array) {
      d.forEach(function (str) {
        (!str.match('>')) ? cbModule(str) : cbPipe(str.split('>'))
      })
    } 
    if (typeof d === 'object' && d.nimoy) cbModule(d)
  }

  this.draw = function (d) { 
    parse (d, function drawPipe (conn) {
      var a = search(self._, conn[0])
      var b = search(self._, conn[1])
      var key = 'pipe:' + genUID(conn) + ':' + conn[0] + '|' + conn[1]
      a.s.pipe(b.s)
      self._[key] = [a.id , b.id]
    }, function drawModule (nameOrPkg) {
      var pkg = (typeof nameOrPkg !== 'object') 
        ? search(config.library.master, nameOrPkg)
        : nameOrPkg
      var key = 'module:' + genUID(pkg.name) + ':' + pkg.name
      self._[key] = self._.render({key:key, value:pkg})
    })
  } 

  this.erase = function (d) {
    parse (d, function erasePipe (pipeID) { 
      var a = self._[pipeID][0] 
      var b = self._[pipeID][1]
      a.unpipe(b) // not so sure about this...
      delete self._[pipeID]
    }, function eraseModule (moduleID) {
      var mod = search(self._, moduleID)
      if (mod) {
        mod.erase()
        delete mod
      }
    })
  }

  this.import = function (name) {
    db.get('canvas:'+name, function (e, res) {
      if (e) {console.error(e);return}
      console.log(res)

      // current canvas - imported
      // in current canvas but not in imported (erase)
      // in import but not in canvas (draw)

    })
  }

  this.export = function (name) {
    var key = 'canvas:'+name
    var cvsExport = {modules: [], pipes: []}
    for (item in cvs._) {
       var  type = item.split(':')[0]
       var  hash = item.split(':')[1]
       if (hash && hash.length === 40) { // theres a valid hash
         if (type==='module') cvsExport.modules.push(hash)
         if (type==='pipe') cvsExport.pipes.push(hash)
       }
    }
    db.put(key, cvsExport)
  }
}

module.exports = function Bricoleur (db, user) {
  localStorage.library = JSON.stringify(config.library.global)
  var api = {}
  api.auth = function (d) {
    if (!d.value.session) {
      var img = new Buffer(config.uImg).toString()
      var pass = hmac('sha256', img).update(d.value.pass).digest('hex')
      db.auth({name: d.value.name, pass: pass}, handleAuth)
    } else if (d.value.session) {
      db.auth({name: d.value.name, session: d.value.session}, handleAuth)
    }

    function handleAuth (e, res) {
      if (e) { 
        console.error(e)
        s.push({key:'notify', value: {text:e.message} })
        if (!search(cvs._, config.auth))
          cvs.draw([config.auth, config.auth+'>brico']) 
      }
      if (!e) {
        sessionStorage[res.name] = res.token
        var login = search(cvs._, config.auth)
        if (typeof login ==='object') cvs.erase(login.id)
        if (config.users[user].canvas) { // !
          cvs.draw(config.users[user].canvas.modules)
          cvs.draw(config.users[user].canvas.pipes)
        }
        return false
      }
    }
  }
  api.deauth = function (d) {
    db.deauth(function () { 
      delete sessionStorage[user] 
      var path = (!getPath()) ? home : home + getPath()
      window.location = path
    })
  }
  api.data = function (d) {
    if (d.type) {
      if (d.type === 'put') db.put(d.key,d.value)
      if (d.type === 'get' && d.origin) {
        var origin = search(cvs._, d.key.split(':')[1])
        db.get(d.key, function (e, res) {
          if (e) {console.error(e); return false}
          origin.s.write(res)
        })
      }
    }
  }
  api.module = function (d) {

  }
  api.pipe = function (d) {

  }
  api.canvas = function (d) {
    // import / export wrapper
    
  }

  var s = through.obj(function Write (d, enc, next) {
    if (d.key) {
      var path = d.key.split(':')[0]
      if (api[path]) api[path](d)
    }
    next()
  })

  var cvs = new Canvas() 
  cvs._.brico = { s : s } 
  cvs._.render = require(config.canvasRender) 

  if (sessionStorage[user])
    api.auth({value: {name: user, session: sessionStorage[user]}})

  if (!sessionStorage[user] && user !== 'default')
    cvs.draw([config.auth, config.auth+'>brico'])

  db.liveStream({reverse : true})
    .on('data', sync)

  function sync (d) { 
    var path = d.key.split(':')[0]
    if (path === 'data') {
      var origin = search(cvs._, d.key.split(':')[1]) // update module
      if (origin) origin.s.write(d)
    }
  }

  window.cvs = cvs._

  return s
}

// UTILS

function genUID (name) { 
  var r = Math.random().toString().slice(2)
  return hash('sha1').update(name+r).digest('hex')
} 

function search (haystack, needle) {
  for (hay in haystack) {
    if (hay.match(needle)) return haystack[hay]
  }
}

function getPath () { 
  if (!window.location.hash) return false
  if (window.location.hash) return window.location.hash.slice(1)
}
