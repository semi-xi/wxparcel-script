import fs from 'fs-extra'
import path from 'path'
import findIndex from 'lodash/findIndex'
import isEmpty from 'lodash/isEmpty'
import waterfall from 'async/waterfall'
import stripComments from 'strip-comments'
import OptionManager from './option-manager'
import Assets from './assets'
import { resolve as relativeResolve } from './share/requireRelative'

export default class Parser {
  constructor (options = OptionManager) {
    this.assets = new Assets(options)
  }

  _resolveJs (source, file, options = OptionManager) {
    let relativeTo = path.dirname(file)
    let dependencies = resolveDependencies(source.toString(), file, relativeTo, options)
    return { file, source, dependencies }
  }

  _resolve (source, file, options = OptionManager) {
    if (/\.js$/.test(file)) {
      return this._resolveJs(source, file, options)
    }

    return { file, source, dependencies: [] }
  }

  _resolveRule (source, file, rule) {
    let loaders = []
    if (!isEmpty(rule)) {
      loaders = rule.loaders || []
    }

    if (loaders.length === 0) {
      return Promise.resolve(source)
    }

    let tasks = loaders.map((loader) => (source, callback) => {
      if (!loader.hasOwnProperty('use')) {
        callback(new Error('Params use is not provided from loader'))
        return
      }

      if (typeof loader.use !== 'string') {
        callback(new Error('Params use is not a stirng'))
        return
      }

      let transformer = require(loader.use)
      transformer = transformer.default || transformer

      let options = OptionManager.connect({ file, rule })
      transformer.call(this, source, options)
        .then((source) => callback(null, source))
        .catch((error) => callback(error))
    })

    tasks.unshift((callback) => callback(null, source))

    return new Promise((resolve, reject) => {
      waterfall(tasks, (error, source) => {
        error ? reject(error) : resolve(source)
      })
    })
  }

  multiCompile (files, options = OptionManager, assets = []) {
    if (!Array.isArray(files) || files.length === 0) {
      return Promise.resolve()
    }

    let promises = files.map((file) => this.compile(file, options, assets))
    return Promise.all(promises).then(() => assets)
  }

  compile (file, options = OptionManager, assets = []) {
    if (this.assets.exists(file)) {
      return Promise.resolve()
    }

    let rule = this.matchRule(file, options.rules)
    let { chunk } = this.assets.add(file, { rule })

    let rollup = (metadata) => {
      let { dependencies } = metadata
      let { destination } = chunk
      assets.push({ ...metadata, rule, destination })

      if (!Array.isArray(dependencies) || dependencies.length === 0) {
        return assets
      }

      let files = []
      filterDependencies(dependencies).forEach(({ dependency }) => {
        !this.assets.exists(dependency) && files.push(dependency)
      })

      if (!Array.isArray(files) || files.length === 0) {
        return assets
      }

      return this.multiCompile(files, options, assets).then(() => assets)
    }

    return this.transform(file, rule, options).then((metadata) => rollup(metadata))
  }

  transform (file, rule, options = OptionManager) {
    if (!rule) {
      rule = this.matchRule(file, options.rules)
    }

    return readFilePromisify(file)
      .then((source) => this._resolveRule(source, file, rule))
      .then((source) => this._resolve(source, file, options))
  }

  matchRule (file, rules = []) {
    return rules.find(({ test: pattern }) => pattern.test(file))
  }
}

const resolveDestination = function (file, options) {
  let { rootDir, srcDir, outDir } = options

  /**
   * windows 下 path 存在多个反斜杠
   * 因此需要 escape 才能进行 search
   * 这里可以直接使用 indexOf 进行查询
   */
  return file.indexOf(srcDir) !== -1
    ? file.replace(srcDir, outDir)
    : file.replace(rootDir, outDir)
}

const resolveDependencies = function (code, file, relativeTo, options) {
  if (code) {
    code = stripComments(code, { sourceType: 'module' })
  }

  let dependencies = []

  while (true) {
    let match = /require\(['"]([\w\d_\-./]+)['"]\)/.exec(code)
    if (!match) {
      break
    }

    let [all, required] = match
    code = code.replace(all, '')

    let dependency = relativeResolve(required, relativeTo)
    if (findIndex(dependencies, { file, dependency, required }) === -1) {
      let destination = resolveDestination(dependency, options)
      dependencies.push({ file, dependency, destination, required })
    }
  }

  return dependencies
}

const filterDependencies = function (dependencies) {
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

const readFilePromisify = (file) => new Promise((resolve, reject) => {
  fs.readFile(file, (error, source) => error ? reject(error) : resolve(source))
})
