import path from 'path'
import minimatch from 'minimatch'
import omit from 'lodash/omit'
import find from 'lodash/find'
import filter from 'lodash/filter'
import isEmpty from 'lodash/isEmpty'
import flattenDeep from 'lodash/flattenDeep'
import waterfall from 'promise-waterfall'
import OptionManager from './option-manager'
import Assets from './assets'
import Resolver from './resolver'
import { readFileAsync } from './share'
import { SCATTER } from './constants/chunk-type'

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
   * @param {OptionManager} [options=OptionManager] 配置管理器
   */
  constructor (options = OptionManager) {
    /**
     * 配置管理器
     *
     * @type {OptionManager}
     */
    this.options = options
  }

  /**
   * 编译多个文件
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
   * @param {Array|String} file 文件位置
   * @return {Promise} [chunk]
   */
  async compile (file) {
    let chunk = await this.convert(file)
    chunk = await this.transform(chunk)
    return this.resolve(chunk)
  }

  /**
   * 将 file 转化成 chunk
   *
   * @param {String} file 文件
   * @param {Object} [chunkOptions={}] 配置
   * @return {Promise} chunk
   */
  convert (file, chunkOptions = {}) {
    if (typeof file === 'object') {
      chunkOptions = isEmpty(chunkOptions) ? omit(file, 'file') : chunkOptions
      file = file.file
    }

    if (Assets.exists(file)) {
      return Promise.resolve()
    }

    const { rules } = this.options

    /**
     * 筛选 loader 类型, 只有不指定 loader.for
     * 或者独立类型 (SCATTER) 才能操作代码片段
     * 因为某些 loader 只操作打包后的文件, 例如
     * uglify 只操作 打包类型 (BUNDLER)
     */
    let rule = this.matchRule(file, rules) || {}
    let chunk = Assets.add(file, Object.assign({}, chunkOptions, { rule }))

    return readFileAsync(file).then((source) => {
      chunk.update({ content: source })
      return chunk
    })
  }

  /**
   * 编译代码
   *
   * @param {Chunk} chunk 代码片段
   * @returns {Promise} promise
   */
  transform (chunk) {
    const { file, rule } = chunk

    /**
     * 筛选 loader 类型, 只有不指定 loader.for
     * 或者独立类型 (SCATTER) 才能操作代码片段
     * 因为某些 loader 只操作打包后的文件, 例如
     * uglify 只操作 打包类型 (BUNDLER)
     */
    const loaders = filter(rule.loaders, (loader) => {
      if (!loader.hasOwnProperty('for')) {
        return true
      }

      if (Array.isArray(loader.for)) {
        return loader.for.indexOf(SCATTER) !== -1
      }

      return loader.for === SCATTER
    })

    /**
     * 没有 loader 不需要编译
     */
    if (loaders.length === 0) {
      return Promise.resolve(chunk)
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

      if (pattern instanceof RegExp) {
        if (pattern.test(file)) {
          return Promise.resolve(chunk)
        }
      } else {
        const { rootDir } = this.options
        pattern = path.join(rootDir, pattern)

        if (minimatch(file, pattern)) {
          return Promise.resolve(chunk)
        }
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
    let queue = loaders.map((loader) => () => {
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
      let transform = transformer.default || transformer

      /**
       * 因为 loader 为外部包, 因此这里为了不给外部包改变配置
       * 这里使用 connect 来创建一个新的配置, 且不能修改
       */
      let loaderOptions = loader.options || {}
      let options = this.options.connect({ file, rule, options: loaderOptions })

      return transform(chunk.metadata, options).then((result) => {
        let { code: content, map } = result
        return chunk.update({ content, sourceMap: map })
      })
    })

    return waterfall(queue).then(() => chunk)
  }

  /**
   * 解析文件
   *
   * @param {String} srcFile 文件路径
   * @param {Object} options 配置
   * @return {Promise} [chunk]
   */
  async resolve (chunk) {
    let result = Resolver.resolve(chunk.metadata)
    let { file, content, dependencies, map } = result
    chunk.update({ file, content, dependencies, sourceMap: map })

    if (!Array.isArray(dependencies) || dependencies.length === 0) {
      return chunk
    }

    let files = []
    dependencies.forEach((item) => {
      if (Assets.exists(item.dependency)) {
        return
      }

      let { type, dependency, destination } = item
      files.push({ type, file: dependency, destination })
    })

    if (!Array.isArray(files) || files.length === 0) {
      return chunk
    }

    let chunks = await this.multiCompile(files)
    return [chunk].concat(chunks)
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
    let handleFind = (rule) => {
      let { test: pattern, ignore } = rule
      if (pattern.test(file)) {
        if (ignore && inMatches(file, ignore)) {
          return null
        }

        return file
      }
    }

    return find(rules, handleFind) || null
  }
}

export default new Parser()

/**
 * 是否命中其中一个正则
 *
 * @param {String} string 字符串
 * @param {Array[RegExp]} regexps 正则集合
 * @returns {Boolean} 是否命中
 */
const inMatches = (string, regexps) => {
  for (let i = 0, l = regexps.length; i < l; i++) {
    if (regexps[i].test(string)) {
      return true
    }
  }

  return false
}
