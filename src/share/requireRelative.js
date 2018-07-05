import path from 'path'
import Module from 'module'

let modules = {}

const resolveModule = function (directive) {
  let rootPath = directive ? path.resolve(directive) : process.cwd()
  let rootName = path.join(rootPath, '@root')
  let root = modules[rootName]

  if (!root) {
    root = new Module(rootName)
    root.filename = rootName
    root.paths = Module._nodeModulePaths(rootPath)
    modules[rootName] = root
  }

  return root
}

export const relative = function (requested, relativeTo) {
  let root = resolveModule(relativeTo)
  return root.require(requested)
}

export const resolve = function (requested, relativeTo) {
  let root = resolveModule(relativeTo)
  return Module._resolveFilename(requested, root)
}

relative.resolve = resolve
export default relative
