import fs from 'fs-extra'
import path from 'path'
import minimatch from 'minimatch'
import omit from 'lodash/omit'
import uniqBy from 'lodash/uniqBy'
import isEmpty from 'lodash/isEmpty'
import flattenDeep from 'lodash/flattenDeep'
import waterfall from 'promise-waterfall'
import OptionManager from './option-manager'
import Assets from './assets'
import Resolver from './resolver'

export class Parser {
  constructor (options = OptionManager) {
    this.options = options
  }

  multiCompile (files) {
    if (!Array.isArray(files) || files.length === 0) {
      return Promise.resolve([])
    }

    let promises = files.map((file) => this.compile(file))
    return Promise.all(promises).then((chunks) => {
      chunks = flattenDeep(chunks).filter((chunk) => chunk)
      return chunks
    })
  }

  compile (file) {
    let chunkOptions = {}

    if (typeof file === 'object') {
      chunkOptions = omit(file, 'file')
      file = file.file
    }

    if (Assets.exists(file)) {
      return Promise.resolve()
    }

    let rule = this.matchRule(file, this.options.rules)
    let chunk = Assets.add(file, Object.assign(chunkOptions, { rule }))
    let rollup = (flowdata) => {
      let { source, dependencies } = flowdata
      chunk.update({ content: source, dependencies, rule })

      if (!Array.isArray(dependencies) || dependencies.length === 0) {
        return chunk
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
        return chunk
      }

      return this.multiCompile(files).then((chunks) => {
        return [chunk].concat(chunks)
      })
    }

    return this.convert(file, rule).then(rollup)
  }

  convert (file, rule) {
    if (!rule) {
      rule = this.matchRule(file, this.options.rules) || {}
    }

    let instance = new InstanceForTransform()
    return readFilePromisify(file)
      .then((source) => this.transform(source, file, rule, instance))
      .then((source) => Resolver.resolve(source, file, instance))
      .then((flowdata) => {
        let dependencies = [].concat(flowdata.dependencies, instance.dependencies)
        flowdata.dependencies = uniqBy(dependencies, 'dependency')
        return flowdata
      })
  }

  transform (source, file, rule, instance) {
    let loaders = []
    if (!isEmpty(rule)) {
      loaders = rule.loaders || []
    }

    if (loaders.length === 0) {
      return Promise.resolve(source)
    }

    let exclude = rule.exclude || []
    for (let i = exclude.length; i--;) {
      let pattern = exclude[i]
      pattern = path.join(this.options.rootDir, pattern)

      if (minimatch(file, pattern)) {
        return Promise.resolve(source)
      }
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

      let loaderOptions = loader.options || {}
      let options = this.options.connect({ file, rule, options: loaderOptions })
      return transformer(source.toString(), options, instance)
    })

    taskQueue.unshift(() => Promise.resolve(source))
    return waterfall(taskQueue)
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

const readFilePromisify = (file) => new Promise((resolve, reject) => {
  fs.readFile(file, (error, source) => error ? reject(error) : resolve(source))
})
