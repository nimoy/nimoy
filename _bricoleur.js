var cuid = require('cuid')
var _ = require('underscore')
var through = require('through2')
var muxDemux = require('mux-demux')
var createHash = require('crypto-browserify/create-hash')
var async = require('async')

window._ = _

// brico tracks canvas and emits changes to canvas!
// push out current canvas state -- only ... what about stream objects
// be careful with match + regex! do some filtering beforehand!
// all commands that modify the canvas happen in that canvas context


module.exports = function Bricoleur (db, library) {
  var canvas = {} 
  var ID = cuid()
  var syncCache = {}
  var dbCache = []


  function sync (d) { 
    if (d.type && d.type==='put' && dbCache.length>0) {
      var match = false
      dbCache = _.filter(dbCache, function (obj, i) {
        if (obj.key===d.key && obj.value!== d.value) { 
          match=true 
          return {key:k,value:d.value} 
        } else return {key:k,value:v}
      })
      if (!match) dbCache.push({key:d.key,value:d.value})
      console.log(dbCache)
    }
    if (d.key === 'library') library = JSON.parse(d)
    var id = d.key.split('$:')[1]
    if (id && d.value && typeof d.value === 'string') 
      d.value = JSON.parse(d.value)
    if (canvas[id] && canvas[id].$) {
      canvas[id].$.push(d.value)
    }
  }


  var dbMuxDemux = muxDemux(function (st) {
    var key = '$:'+st.meta
    syncCache[st.meta] = ID
    st.on('data', function put (val) { db.put(key,JSON.stringify(val)) })
  })
  var moduleDataMuxDemux = muxDemux()
  moduleDataMuxDemux.pipe(dbMuxDemux)


  var s = through.obj(function interface (d, enc, next) {
    var self = this

    if (d instanceof Array) { 
      d.forEach(function (str) {
        parseCommand(str, handleResult)
      })
    } else parseCommand(d, handleResult)

    function handleResult (e, res) { // make this smarter! 

      if (res && res.parcel) {
        if (res.key) res.key += ':' + res.parcel
        if (!res.key) res.key = res.parcel
        delete res.parcel
      }

      var response = (!e) ? res : e
      self.push(response)
      next() 
    }
  })


  canvas[ID] = s 
  canvas[ID].name = 'bricoleur'


  function compressCanvas () { 
    var c = {}
    _.each(canvas, function (v,k) {
      if (v instanceof Array) {
        c[k] = v
      } else if (typeof v === 'object') {
        if (v.name && v.name !== 'bricoleur') {
          c[k] = {id : k}
          if (v.name) c[k].name = v.name
          if (!v.pipe) {
            for (prop in v) {
              if (!v[prop].pipe) c[k][prop] = v[prop]
            }
          }
        }
      }
    })
    return c
  }


  function parseCommand (d, cb) { 
    var str
    var data
    var res = {cmd : d}

    if (typeof d === 'object' && d.key && d.value) {
      str = d.key 
      data = d.value
    } else if (typeof d === 'string') { 
      str = d
    } else str = null

    if (!str) { cb(new Error('bad input!'), null); return false }

    var parcel = (str.split('/').length > 1) ? str.split('/')[1] : null
    if (parcel) { res.parcel = parcel; str = str.split('/')[0] }

    var action = str[0].match(/\+|\-|\?|\!|\&/)
    if (!action) return false
    action = action[0]

    var type = str.slice(1).match(/\@|\#|\$|\||\_|\*/)
    type = (type !== null) ? type[0] : isCuid(str.slice(1)) ? '^' : '*'

    if (type.match(/\*|\|/)) res.timestamp = new Date().getTime()

    var actor = (type === '^') ? str.slice(1) : (type === '|') 
      ? str.slice(1).split('|') : (type === '*' && str[1] !== '*') 
      ? str.slice(1) : str.slice(2)

    if (!action||!type||!actor) { 
      cb(new Error('wrong cmd:'+str), null); return false
    }


    // SYMBOLS 
    // ACTIONS: ? get/find, + add, - rm , ! open 
    // TYPES: * modules, @ users, # canvas, $ data, | pipes, ^ cuid
    

    if (action==='?') { // SEARCH / GET FROM MULTILEVEL

      if (actor.split(' ').length > 1) 
        var modifier = actor.split(' ')[1]

      if (type==='*') {
        var pkg = _.find(library, function (v,k) {
          if(k.match(actor)) return v
        })

        var uid = _.find(canvas, function (v,k) {
          if (k.match(actor)) return k.split(':')[1]
        })

        res.value = [pkg,uid] 
        cb(null, res)
        return false
      }

      function useModifier (str, arr) { // basic!
        if (str.split(':').length > 1) { // search object key or vals
          if (str[0] !== '') var k = str.split(':')[0]
          if (str[1] !== '') var v = str.split(':')[1]
          return _.filter(arr, function (obj, i) {
            if (k&&v&&k===obj.key&&v===obj.value) return obj
            else if (!k&&v&&v===obj.value) return obj
            else if (!v&&k&&k===obj.key) return obj
          })
        } else return null 
      }

      if (actor === '*') {
        res.value = []
        if (dbCache.length > 0) {
          res.value = _.filter(dbCache,function(obj,i){if (obj.key[0]===type) return obj})
          // if (modifier) {
          //   res.value = useModifier(modifier, dbCache)
          // }
          // console.log(res.value)
          cb(null, res)
        } else {
          var rs = db.createReadStream()
          rs.on('data', function (d) { 
            dbCache.push(d)
            if (d.key[0]===type) res.value.push(d) 
          })
          rs.on('end', function () { 
            if (modifier) res.value = useModifier(modifier, res.value)
            cb(null, res) 
          })
        }
      } else {
        if (type==='^' || type==='#' || type==='$') { // just grab the key
          db.get(type+':'+actor, function (e, v) {
            if (e) { res.value = e; cb(null,res) }
            else {
              if (modifier) { // run some _.fn on v

              } else {
                res.value = v
                cb(null, res)
              }
            }
          })
          return false
        }
      }

      if (modifier) {

        // if its an array or if its a key val

        // k : v
        
        // k: search only for this key
        // :v search only for this value
        // k:v search both

        // ?#* k: search all canvas for that key

        // parse modifier and conver to _.fn chain 
        // run _.fn chain on db stream and return collected results

        //   var rs = db.createKeyStream()
        //   rs.on('data', function (k) {
        //     console.log(actor)
        //     if (k.match(actor)) {
        //       res.value = k
        //       cb(null, res)
        //     }
        //   })
        
        //   rs.on('end', function () {
        //     if (!res.value) { // really not great :(
        //       res.value = new Error(actor+' not found!')
        //       cb(null, res)
        //     }
        //   })
        //
        
      }
    }


    if (action==='&') { // CLONE MODULE / CANVAS
        var newActor = actor.split(' ')[1]
        actor = actor.split(' ')[0]
        console.log(actor, newActor)
      if (type==='#') {
        db.get('#:' + actor, function (e, d) {
          if (e) cb(e, null)
          else db.put('#:' + newActor,d,function (e) {
            if (e) cb(e, null)
            cb(null, res)
          })
        })
      } else if (type==='*') {

      } else if (type==='^') {

      } else {

      }
    }


    if (action==='!'&&type==='^') { // CLEAR !module
      var cvs = _.keys(canvas)
      var top = cvs.slice(_.indexOf(cvs,actor))
      var nTop = []
      var y = window.pageYOffset
      var x = window.pageXOffset

      function add (cid, n) {
        parseCommand('+'+cid, function (e,r) { 
          if (e) { cb(e,null); return false }
          n()
        })
      }

      function rm (cid, n) {
        nTop.push(canvas[cid].name+':'+cid)
        parseCommand('-'+cid, function (e,r) {
          if (e) { cb(e,null); return false }
          n()
        })
      }

      async.eachSeries(top,rm,function (e) {
        if (e) console.error(e)
        nTop[0] = nTop[0].split(':')[0]
        async.eachSeries(nTop,add,function (e) {
          if (e) console.error(e)
          window.scrollTo(x,y)
          cb(e,res)
        })
      })
    }


    if (action==='!'&&type==='#') { // LOAD CANVAS !#canvas
      db.get(type+':'+actor, function (e, jsn) {
        if (e) { cb(e, null); return false }
        var cvs = JSON.parse(jsn)

         res.value = compressCanvas()
        
        var last = cvs[cvs.length-1]
        _.each(_.keys(canvas).reverse(), function (k) {
          if (canvas[k].name !== 'bricoleur')  
            parseCommand('-'+k, function (e,r) {
              if (e) cb(e, null)
            })
        })
        if (cvs.length===0) { cb(null, res); return false }
        _.each(cvs, function (cmd) { 
          parseCommand(cmd, function (e, r) {
            if (e) {cb(e, null)}
            if (!e && cmd===last) {
              res.value = compressCanvas()
              cb(null, res)
            }
          })
        })
      })
    }


    if (type==='_') {  // SAVE GROUP +_group
      if (action==='+') {
        var cvs = compressCanvas()

        var macro = _.map(_.values(cvs), function (v) {
          return '+'+v.name
        })

        db.put('_:'+actor, macro, function (e) {
          if (!e) cb(null,res)
          if (e) cb(e,null)
        })

      } else if (action==='-') {
        db.del('_:'+actor,function (e) {
          if (!e) cb(null,res)
          if (e) cb(e,null)
        })
      }
    }


    if (type==='^') { // ADD/RM/PIPE MODULE USING CUID +cuid|cuid
      if (action==='-') {
        if (!canvas[actor]) {
          cb(new Error(actor + ' not found'),null)
          return false
        } else if (canvas[actor] instanceof Array) {
          var val = canvas[actor]
          var rs = canvas[val[0]]
          var ws = canvas[val[1]]

          // do not destroy bricoleur streams! -- but do unpipe!
          if (rs && rs.name==='bricoleur' || ws && ws.name==='bricoleur') {
            cb(null, res) 
            return false
          } 

          if (rs.$) {
            rs.$.destroy()
            rs.s.destroy()
            rs.s.unpipe(ws) 
          } else {
            rs.destroy()
            rs.unpipe(ws)
          }

          delete canvas[actor] 
        } else {
          if (canvas[actor].$) {
            canvas[actor].s.destroy()
            canvas[actor].$.destroy()
          }
          delete canvas[actor]
        }

        res.value = compressCanvas()
        cb(null, res) 
        return false
      }

      if (action==='+') { // this should work!!!
        cb(new Error('use format +name:cuid instead sorry!!'),null)
      }
    }


    if (type==='|') { // ADD/RM PIPE MODULES
      var id = cuid()

      if (actor[1].split(':').length>1) {
        id = actor[1].split(':')[1]
        actor[1] = actor[1].split(':')[0]
      }

      for (var i=0;i<actor.length;i++) {
        actor[i] = (isCuid(actor[i]))
          ? actor[i] 
          : nameToCuid(actor[i])
      }

      if (!canvas[actor[0]] || !canvas[actor[1]]) {
        cb(new Error('unpipeable'+actor,null)) 
        return false
      }

      var readable = (!canvas[actor[0]].$)?canvas[actor[0]]:canvas[actor[0]].s
      var writable = (!canvas[actor[1]].$)?canvas[actor[1]]:canvas[actor[1]].s

      if (action==='+') {
        readable.pipe(writable)
        canvas[id] = actor 
        res.value = compressCanvas()
        cb(null, res)
        return false
      }

      if (action==='-') { 
        readable.unpipe(writable)

        var uid = pipeToCuid(actor)
        
        delete canvas[uid]
        res.value = compressCanvas()
        cb(null, res)
      }
    } 


    if (type==='*') { // ADD/RM MODULE
      if (action==='-') {
        actor = (!isCuid(actor)) ? nameToCuid(actor) : actor

        if (!canvas[actor]) {
          cb(new Error('no module: '+actor), null)
          return false
        }

        if (canvas[actor].s && canvas[actor].s.pipe) { // destroy pipe!
          canvas[actor].s.destroy()
          canvas[actor].$.destroy()
          delete canvas[pipeFromPiped(actor)]
        } else if (canvas[actor].pipe) {
          canvas[actor].destroy()
          delete canvas[pipeFromPiped(actor)]
        }

        delete canvas[actor]
        res.value = compressCanvas()
        cb(null, res)
        return false
      }


      if (action==='+') {
        var uid = (actor.split(':').length>1) 
          ? actor.split(':')[1] 
          : cuid()

        var name = (actor.match(':')) ? actor.split(':')[0] : actor

        var pkg = _.find(library, function (v,k) {
          if (v.name===name) return v
        })

        if (!pkg) {
          if (name === 'bricoleur') { 
            canvas[uid] = s 
            cb(null,res)
            return false 
          } else cb(new Error('module: ' + actor + ' not found!'), null) 
        }

        if (!pkg.main) {
          db.get('_:'+actor, function (e,d) {
            if (!e) parseCommand(d, cb)
            if (e) cb(e,null)
          })
          return false
        }

        pkg.id = uid

        var mod = require(pkg.name)

        canvas[uid] = mod(moduleDataMuxDemux.createStream(uid))

        canvas[uid].name = pkg.name

        if (pkg.mask) canvas[uid].mask = pkg.mask

        var $ = canvas[uid].$

        $.push(pkg)

        db.get('$:'+uid, function (e,val){ 
          if (typeof val === 'string') val = JSON.parse(val)
          if (!e) { $.push(val) }
          if (e && pkg.data) { $.push(pkg.data) }
          res.value = compressCanvas()
          cb(null, res) 
        })
      }
    }


    if (type==='$' || type==='#') { // ADD/RM CANVAS 
      var key = type+':'+actor
      if (action==='+') {
        var val
        if (type==='#') {
          cmds = []
          _.each(_.keys(canvas), function (k) {
            var v = canvas[k]
            var mask
            var t = (v instanceof Array) ? '|' : '*'

            if (t==='|') 
              v.forEach(function(m){if(canvas[m].mask)mask=true})

            if (t==='*') 
              if (v.mask || v.name === 'bricoleur') mask = true

            var c = (t==='|') 
              ? v.join('|')+':'+k 
              : t+canvas[k].name+':'+k

            if (!mask) {cmds.push('+'+c)}
          })
          val = JSON.stringify(cmds)
        } else val = JSON.stringify(data)
        db.put(key, val, function (e) {
          if (e) cb (e, null)
          res.value = compressCanvas()
          if (!e) cb(null, res)
        })
      }
      if (action==='-') db.del(key, function (e) {
        if (e) cb (e, null)
        res.value = compressCanvas()
        if (!e) cb(null, res)
      })
    }


    if (type==='@') { // LOGIN/LOGOUT
      if (action==='-') {
        res.value = '-'+actor
        delete sessionStorage.edit
        db.deauth(function (e) {if (e) cb(e,null); else cb(null, res)})
        return null
      }
      var auth = actor.split(' ')
      if (!auth) {cb(new Error('bad login'),null); return false}
      var user = { name: auth[0] }
      user.pass = (isCuid(auth[1])) 
        ? auth[1]
        : getAuthToken(auth[1])

      if (parcel) user.parcel = parcel
      if (action==='+') db.auth(user, cb)
    }
  }


  db.liveStream({old:false})
    .on('data', sync)


  function isCuid (id) {
    var r = (typeof id==='string' && id.length===25 && id[0]==='c') 
      ? true : false
    return r
  }


  function nameToCuid (name) {
     return _.find(_.keys(canvas), function(k) {
       var uid = canvas[k].name.match(name)
       if (!uid) return null
       return uid
     })
  }


  function pipeFromPiped (piped) {
    var res
    var p = _.pairs(canvas)
    res = _.find(p,function (arr) {return _.contains(arr[1],piped)})
    if (res) return res[0]
    else return false
  }


  function pipeToCuid (pipe) {
    return _.find(_.keys(canvas), function (k) {
      return canvas[k].toString() === pipe.toString()
   })
  }


  function getAuthToken (pass) {
    return createHash('sha256').update(pass).digest('hex')
  }

  
  function canvasName() {
    return window.location.url
  }


  return s
}
