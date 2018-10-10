import fs from 'fs'
import path from 'path'
import minimatch from 'minimatch'
import omit from 'lodash/omit'
import filter from 'lodash/filter'
import flattenDeep from 'lodash/flattenDeep'
import waterfall from 'promise-waterfall'
import OptionManager from './option-manager'
import Assets from './assets'
import Resolver from './resolver'

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

    let rule = this.matchRule(file, this.options.rules) || {}
    let loaders = filter(rule.loaders, (loader) => !loader.hasOwnProperty('for'))

    let chunk = Assets.add(file, Object.assign(chunkOptions, { rule }))
    let content = fs.readFileSync(file)
    chunk.update({ content })

    let queue = [
      () => this.transform(chunk, rule, loaders),
      () => this.resolve(chunk)
    ]

    return waterfall(queue).then(() => {
      let { dependencies } = chunk
      if (!Array.isArray(dependencies) || dependencies.length === 0) {
        return chunk
      }

      let files = []
      dependencies.forEach((item) => {
        if (Assets.exists(item.dependency)) {
          return chunk
        }

        let { type, dependency, destination } = item
        files.push({ type, file: dependency, destination })
      })

      if (!Array.isArray(files) || files.length === 0) {
        return chunk
      }

      return this.multiCompile(files).then((chunks) => {
        return [chunk].concat(chunks)
      })
    })
  }

  /**
   * 编译代码
   *
   * @param {Chunk} chunk 代码片段
   * @returns {Promise} promise
   */
  transform (chunk, rule, loaders) {
    let { file } = chunk

    /**
     * 没有 loader 不需要编译
     */
    if (loaders.length === 0) {
      return Promise.resolve()
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
          return Promise.resolve()
        }
      } else {
        pattern = path.join(this.options.rootDir, pattern)

        if (minimatch(file, pattern)) {
          return Promise.resolve()
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
      transformer = transformer.default || transformer

      /**
       * 因为 loader 为外部包, 因此这里为了不给外部包改变配置
       * 这里使用 connect 来创建一个新的配置, 且不能修改
       */
      let loaderOptions = loader.options || {}
      let options = this.options.connect({ file, rule, options: loaderOptions })

      return transformer(chunk.metadata, options).then((result) => {
        let { code: content, map } = result
        chunk.update({ content, map })
      })
    })

    return waterfall(queue).then(() => chunk)
  }

  /**
   * 解析代码
   *
   * @param {Chunk} chunk 代码片段
   * @returns {Promise} promise
   */
  resolve (chunk) {
    return new Promise((resolve) => {
      let result = Resolver.resolve(chunk.metadata)
      let { file, content, dependencies, map } = result
      chunk.update({ file, content, dependencies, map })

      resolve(chunk)
    })
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
    const handleFind = (rule) => {
      const { test: pattern, ignore } = rule
      if (pattern.test(file)) {
        if (ignore && inMatches(file, ignore)) {
          return null
        }

        return file
      }
    }

    return rules.find(handleFind) || null
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
