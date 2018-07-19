import path from 'path'
import Module from 'module'
import findIndex from 'lodash/findIndex'
import stripComments from 'strip-comments'
import { Resolver } from './resolver'
import OptionManager from '../option-manager'

const REQUIRE_REGEXP = /require\(['"]([\w\d_\-./]+)['"]\)/

export class JsResolver extends Resolver {
  constructor (options = OptionManager) {
    super(options)

    this.modules = {}
  }

  resolve (source, file, instance) {
    let relativeTo = path.dirname(file)
    let dependencies = this.resolveDependencies(source.toString(), file, relativeTo, this.options)

    dependencies.forEach((item) => {
      let { file, destination, dependency, required } = item
      instance.emitFile(file, destination, dependency, required)
    })

    source = Buffer.from(source)
    return { file, source, dependencies }
  }

  resolveDependencies (code, file, relativeTo) {
    if (code) {
      code = stripComments(code, { sourceType: 'module' })
    }

    let dependencies = []

    while (true) {
      let match = REQUIRE_REGEXP.exec(code)
      if (!match) {
        break
      }

      let [all, required] = match
      code = code.replace(all, '')

      let dependency = this.resolveRelative(required, relativeTo)
      if (findIndex(dependencies, { file, dependency, required }) === -1) {
        let destination = this.resolveDestination(dependency, this.options)
        dependencies.push({ file, dependency, destination, required })
      }
    }

    return this.filterDependencies(dependencies)
  }

  resolveRelative (requested, relativeTo) {
    try {
      let root = this.resolveModule(relativeTo)
      return Module._resolveFilename(requested, root)
    } catch (error) {
      /**
       * 兼容 require('not-a-system-dependency') 的情况
       * 若无法通过正常方式获取, 则尝试使用相对定位寻找该文件
       */
      try {
        let file = path.join(relativeTo, requested)
        return require.resolve(file)
      } catch (err) {
        throw new Error(error)
      }
    }
  }

  resolveModule (directive) {
    let rootPath = directive ? path.resolve(directive) : process.cwd()
    let rootName = path.join(rootPath, '@root')
    let root = this.modules[rootName]

    if (!root) {
      root = new Module(rootName)
      root.filename = rootName
      root.paths = Module._nodeModulePaths(rootPath)
      this.modules[rootName] = root
    }

    return root
  }

  filterDependencies (dependencies) {
    return dependencies.filter(({ dependency, destination }) => {
      let extname = path.extname(destination)
      /**
       * 过滤没有后缀的文件
       */
      if (extname !== '' && !/\.js/.test(extname)) {
        return false
      }

      /**
       * 过滤系统依赖
       */
      if (dependency === path.basename(dependency)) {
        return false
      }

      return true
    })
  }
}
