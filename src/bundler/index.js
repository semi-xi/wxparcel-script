import find from 'lodash/find'
import flatten from 'lodash/flatten'
import without from 'lodash/without'
import filter from 'lodash/filter'
import JSBundler from './js-bundler'
import { BUNDLER, SCATTER } from '../constants/chunk-type'
import OptionManager from '../option-manager'
import Parser from '../parser'

export class Bundler {
  /**
   * Creates an instance of Bundler.
   * @param {OptionManager} [options=OptionManager] 配置管理器
   */
  constructor (options = OptionManager) {
    /**
     * 配置管理器
     *
     * @type {OptionManager}
     */
    this.options = options

    /**
     * 打包器集合
     *
     * @type {Array}
     */
    this.bundlers = []

    /**
     * 这里的正则匹配为结果文件的后缀
     */
    this.register(/\.js$/, JSBundler)
  }

  /**
   * 注册打包器
   *
   * @param {RegExp} regexp 匹配正则
   * @param {Bundler} bundler 解析器类
   */
  register (regexp, bundler) {
    if (typeof bundler === 'string') {
      bundler = require(bundler)
    }

    this.bundlers.push({ regexp, bundler })
  }

  async bundle (chunks) {
    chunks = [].concat(chunks)

    let bundledChunks = []
    let bundleTasks = this.bundlers.map(({ regexp, bundler: Bundler }) => {
      let targetChunks = filter(chunks, (chunk) => {
        return chunk.type !== SCATTER && regexp.test(chunk.destination)
      })

      /**
       * 已经确定的文件就不需要再次读取
       * 这里筛选掉已匹配过的 chunks
       */
      chunks = without(chunks, ...targetChunks)

      let bundler = new Bundler(targetChunks, this.options)
      return bundler.bundle()
    })

    bundledChunks = await Promise.all(bundleTasks)
    bundledChunks = flatten(bundledChunks)

    let transformTasks = bundledChunks.map((chunk) => {
      let rule = chunk.rule || {}
      let loaders = filter(rule.loaders, (loader) => loader.for === BUNDLER)
      return Parser.transform(chunk, rule, loaders)
    })

    bundledChunks = await Promise.all(transformTasks)
    return [].concat(chunks, bundledChunks)
  }

  matchBundler (file) {
    return find(this.bundlers, ({ regexp }) => regexp.test(file))
  }
}

export default new Bundler()
