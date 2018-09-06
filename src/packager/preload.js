!(function (modules, caches) {
  const ParcelRequire = function (name) {
    if (cache[name]) {
      return cache[name].exports
    }

    const localRequire = function (prop) {
      return parcelRequire(localRequire.resolve(prop))
    }

    const resolve = function (prop) {
      return modules[name][1][prop] || prop
    }

    localRequire.resolve = resolve

    if (module[name]) {
      const module = caches[name] = new ParcelRequire.Module(name)
      modules[name][0].call(module.exports, localRequire, module, module.exports, this)
      return module.exports
    }

    var err = new Error('Cannot find module \'' + name + '\'');
    err.code = 'MODULE_NOT_FOUND';
    throw err;
  }

  const Module = function (moduleName) {
    this.id = moduleName
    this.bundle = ParcelRequire
    this.exports = {}
  }

  const register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports
    }, {}];
  }

  ParcelRequire.Module = Module
  ParcelRequire.modules = modules
  newRequire.register = register

  return ParcelRequire
})
