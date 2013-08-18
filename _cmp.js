var Duplex = require('stream').Duplex
, asyncMap = require('slide').asyncMap
, browserify = require('browserify')
, uglifyJS = require('uglify-js')
, stylus = require('stylus') 
, util = require('util')
, fs = require('fs')

util.inherits(Compiler, Duplex)

module.exports = Compiler
// compiler prepares files for client

function Compiler (opts) {
  if (!(this instanceof Compiler)) return new Compiler(opts)
  Duplex.call(this, opts)

  var self = this
  , DIR = './_wilds/'
  , READ1 = false
  , UPDATE = false
  , MODCOUNT = 0
  , MODS = []
  , B = browserify()


  this._write = function (chunk, enc, next) {
    if (READ1===false) MODCOUNT++
    var mod = JSON.parse(chunk.toString())
    handleModule(mod)
    next()
  }

  this.end = function () {
    READ1 = true
  }

  function handleModule (mod) {
    asyncMap(mod.deps, function readModDeps (file, next) {
      var filepath = DIR+file
      var ext = file.split('.')[1]
      fs.readFile(filepath, function addDepToMod (err, buf) {
        if (err) console.error(err)
        mod[ext] = buf.toString()
        next()
      })
    }, function handledDeps () {
       if (UPDATE === false) MODS.push(mod) 
       if (UPDATE === true) {
         for (var i=0;i<MODS.length;i++) {
           var m = MODS[i]
           if (m.id === mod.id) MODS[i] = mod 
         }
         ready()
       }
       if (MODCOUNT === MODS.length) {
         ready()
         UPDATE = true
       }
    })
  }

  function ready () {
    var CSS = ''
    fs.readFile(DIR+'_css.styl', function (e, buf) { // load base styles
      if (e) console.error(e)
      CSS += buf.toString()
      compile(CSS) 
    })
  }

  function compile (CSS) {
    B.add('./__clnt.js')
    asyncMap(MODS, function (mod, next) {
      if (mod.styl) CSS += mod.styl // add style to css
      var fil = DIR+mod.id+'.js'
      B.add(DIR+mod.id+'.js') // add js to browserify
      next()
    }, function () {
      var bunF = fs.createWriteStream(DIR+'_bundle.js')
      B.bundle().pipe(bunF)
      bunF.on('finish', function () {
        console.log('wrote _bundle.js')
      })
      bunF.on('error', function (e) {
        console.error(e)
      })
      stylus.render(CSS, {filename:'_styles.css'}, function (e, css) {
        if (e) console.error(e)
        fs.writeFile(DIR+'_styles.css', css, function (e) {
          if (e) cosole.error(e)
          console.log('wrote _styles.css')
        })
      })
    })
  }
}
