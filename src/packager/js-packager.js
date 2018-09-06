import Packager from './packager'

export class JSPackager extends Packager {
  wrapCode (name, code, dependencies) {
    return `${JSON.stringify(name)}: [function(require,module,exports) {\n${code}\n}, ${JSON.stringify(dependencies)}],`
  }
}

// ;var q = {
//   '1': [function (require,module,exports) {
//     require('./a')
//   }, { './a': '1' }]
// }

let packager = new JSPackager()
console.log(packager.wrapCode('asdf', 'require("./a")', { './a': '1' }))
