module.exports = (function (modules, caches) {
  function ParcelRequire (name) {
    if (caches[name]) {
      return caches[name].exports
    }
 
    function localRequire (prop) {
      return ParcelRequire(localRequire.resolve(prop))
    }

    function resolve (prop) {
      var module = modules[name][1] || {}
      return module[prop] || prop
    }

    localRequire.resolve = resolve

    /**
     * 本地 require
     */
    if (modules[name]) {
      var module = caches[name] = new ParcelRequire.Module(name)
      modules[name][0].call(module.exports, localRequire, module, module.exports, this)
      return module.exports
    }

    /**
     * 原生 require
     */
    if (require && typeof name === 'string') {
      return require(name)
    }

    var err = new Error('Cannot find module \'' + name + '\'')
    err.code = 'MODULE_NOT_FOUND'
    throw err
  }

  function Module (moduleName) {
    this.id = moduleName
    this.bundle = ParcelRequire
    this.exports = {}
  }

  function register (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports
    }, {}]
  }

  ParcelRequire.Module = Module
  ParcelRequire.modules = modules
  ParcelRequire.register = register

  return function (entry) {
    return ParcelRequire(entry)
  }
})
