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

/**
 * @typedef {Object} flowdata
 * @property {String} file
 * @property {String} source
 * @property {Array} dependencies
 */

/**
 * 编译器
 * 主要用于编译文件内容, 通过配置 rule loader 等信息对
 * 内容进行编译
 *
 * @class
 */
export class Parser {
  /**
   * Creates an instance of Parser.
   * @param {OptionManager} [options=OptionManager]
   */
  constructor (options = OptionManager) {
    this.options = options
  }

  /**
   * 编译多个文件
   *
   * @param {Array} files 需要编译的文件
   */
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

  /**
   * 编译文件
   *
   * @param {String} file 文件位置
   */
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

  /**
   * 将文件转换成 {flowdata}, 其中包括
   * 编译后的文件内容和文件所需要的依赖
   *
   * @param {String} file 文件路径 (required)
   * @param {Object} rule 编译规则 (optional)
   * @returns {Promise} pormise
   * @returns {flowdata} 流程数据
   */
  convert (file, rule) {
    if (!rule) {
      rule = this.matchRule(file, this.options.rules) || {}
    }

    /**
     * 创建接口对象, 用于提供 loader 编译时创建新流程
     */
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

  /**
   * 编译代码
   *
   * @param {String|Buffer} source 文件内容
   * @param {String} file 文件路径
   * @param {Object} rule 编译规则
   * @param {InstanceForTransform} instance 流程接口对象
   * @returns {Promise} promise
   * @returns {String} 编译后的内容
   */
  transform (source, file, rule, instance) {
    let loaders = []
    if (!isEmpty(rule)) {
      loaders = rule.loaders || []
    }

    /**
     * 没有 loader 不需要编译
     */
    if (loaders.length === 0) {
      return Promise.resolve(source)
    }

    /**
     * 过滤不需要编译的文件
     * 顾虑文件实用 minimatch, 具体参考: https://github.com/isaacs/minimatch
     *
     * 例如: 不编译 JS 文件
     * exclude: ['./**\/*.js']
     */
    let exclude = rule.exclude || []
    for (let i = exclude.length; i--;) {
      let pattern = exclude[i]
      pattern = path.join(this.options.rootDir, pattern)

      if (minimatch(file, pattern)) {
        return Promise.resolve(source)
      }
    }

    /**
     * 通过配置的 loader 集合, 逐个轮询并编译;
     * 这一过程是异步串行的, 每个 loader 都需要验证
     * 属性
     *
     * 例如: 没有通过 `npm install` 安装包的情况下
     * loader: {
     *  use: require.resolve('wxparcel-xxx-loader'),
     *  options: {}
     * }
     *
     * 使用 `npm install` 安装在本地的情况下
     * loader: {
     *  use: 'wxparcel-xxx-loader',
     *  options: {}
     * }
     */
    let taskQueue = loaders.map((loader) => (source) => {
      if (!loader.hasOwnProperty('use')) {
        return Promise.reject(new Error('Params use is not provided from loader'))
      }

      if (typeof loader.use !== 'string') {
        return Promise.reject(new Error('Params use is not a stirng'))
      }

      /**
       * 读取模块, 若模块为 es6 模块则通过 default 形式去获取.
       * 所有 loader 都通过 default 形式暴露接口给编译器
       */
      let transformer = require(loader.use)
      transformer = transformer.default || transformer

      /**
       * 因为 loader 为外部包, 因此这里为了不给外部包改变配置
       * 这里使用 connect 来创建一个新的配置, 且不能修改
       */
      let loaderOptions = loader.options || {}
      let options = this.options.connect({ file, rule, options: loaderOptions })
      return transformer(source.toString(), options, instance)
    })

    /**
     * 因为流程中没有 source, 因此在主流程中头部任务插入
     * 一个输入内容的任务
     */
    taskQueue.unshift(() => Promise.resolve(source))
    return waterfall(taskQueue)
  }

  /**
   * 匹配规则, 根据文件名与 test 来进行
   * 规则匹配
   *
   * @param {String}} file 文件
   * @param {Array} rules 规则
   * @return {Object} rule 匹配到的规则
   *
   * 这里通过配置 rule.test 来进行匹配
   * {
   *   test: /regexp/
   * }
   */
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
