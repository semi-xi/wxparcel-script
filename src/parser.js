import fs from 'fs-extra'
import path from 'path'
import omit from 'lodash/omit'
import uniqBy from 'lodash/uniqBy'
import findIndex from 'lodash/findIndex'
import isEmpty from 'lodash/isEmpty'
import flattenDeep from 'lodash/flattenDeep'
import waterfall from 'promise-waterfall'
import stripComments from 'strip-comments'
import OptionManager from './option-manager'
import Assets from './assets'
import { resolve as relativeResolve } from './share/requireRelative'

export class Parser {
  _resolveRule (source, file, rule, instance) {
    let loaders = []
    if (!isEmpty(rule)) {
      loaders = rule.loaders || []
    }

    if (loaders.length === 0) {
      return Promise.resolve(source)
    }

    let taskQueue = loaders.map((loader) => (source) => {
      if (!loader.hasOwnProperty('use')) {
        return Promise.reject(new Error('Params use is not provided from loader'))
      }

      if (typeof loader.use !== 'string') {
        return Promise.reject(new Error('Params use is not a stirng'))
      }

      let transformer = require(loader.use)
      transformer = transformer.default || transformer

      let options = OptionManager.connect({ file, rule })
      return transformer(source.toString(), options, instance)
    })

    taskQueue.unshift(() => Promise.resolve(source))
    return waterfall(taskQueue)
  }

  _resolveJs (source, file, options = OptionManager, instance) {
    let relativeTo = path.dirname(file)
    let dependencies = resolveDependencies(source.toString(), file, relativeTo, options)

    dependencies.forEach((item) => {
      let { file, destination, dependency, required } = item
      instance.emitFile(file, destination, dependency, required)
    })

    source = Buffer.from(source)
    return { file, source, dependencies }
  }

  _resolve (source, file, options = OptionManager, instance) {
    if (/\.js$/.test(file)) {
      return this._resolveJs(source, file, options, instance)
    }

    source = Buffer.from(source)
    return { file, source, dependencies: [] }
  }

  transform (file, rule, options = OptionManager) {
    if (!rule) {
      rule = this.matchRule(file, options.rules)
    }

    let instance = new InstanceForTransform()

    return readFilePromisify(file)
      .then((source) => this._resolveRule(source, file, rule, instance))
      .then((source) => this._resolve(source, file, options, instance))
      .then((metadata) => {
        let dependencies = [].concat(metadata.dependencies, instance.dependencies)
        metadata.dependencies = uniqBy(dependencies, 'dependency')

        return metadata
      })
  }

  compile (file, options = OptionManager) {
    let chunkOptions = {}

    if (typeof file === 'object') {
      chunkOptions = omit(file, 'file')
      file = file.file
    }

    if (Assets.exists(file)) {
      return Promise.resolve()
    }

    let rule = this.matchRule(file, options.rules)
    let chunk = Assets.add(file, Object.assign(chunkOptions, { rule }))
    let rollup = (metadata) => {
      let { source, dependencies, ...otherData } = metadata
      chunk.update({ dependencies, rule })

      let destination = chunk.destination || ''
      let flowdata = { source, dependencies, ...otherData, rule, destination }
      if (!Array.isArray(dependencies) || dependencies.length === 0) {
        return flowdata
      }

      let files = []
      dependencies.forEach((item) => {
        if (Assets.exists(item.dependency)) {
          return
        }

        let { dependency, destination } = item
        files.push({ file: dependency, destination })
      })

      if (!Array.isArray(files) || files.length === 0) {
        return flowdata
      }

      return this.multiCompile(files, options).then((subFlowdata) => {
        return [flowdata].concat(subFlowdata)
      })
    }

    return this.transform(file, rule, options).then(rollup)
  }

  multiCompile (files, options = OptionManager) {
    if (!Array.isArray(files) || files.length === 0) {
      return Promise.resolve([])
    }

    let promises = files.map((file) => this.compile(file, options))
    return Promise.all(promises).then((flowdata) => {
      flowdata = flattenDeep(flowdata).filter((item) => item)
      return flowdata
    })
  }

  matchRule (file, rules = []) {
    return rules.find(({ test: pattern }) => pattern.test(file)) || null
  }
}

export default new Parser()

class InstanceForTransform {
  constructor () {
    this.dependencies = []
  }

  emitFile (file, destination, dependency, required) {
    if (typeof file !== 'string') {
      throw new TypeError('File is not a string or not be provided')
    }

    if (typeof destination !== 'string') {
      throw new TypeError('Destination is not a string or not be provided')
    }

    if (typeof dependency !== 'string') {
      throw new TypeError('Dependency is not a string or not be provided')
    }

    if (typeof required !== 'string') {
      throw new TypeError('Required is not a string or not be provided')
    }

    this.dependencies.push({ file, destination, dependency, required })
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

  return filterDependencies(dependencies)
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
