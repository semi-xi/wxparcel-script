import map from 'lodash/map'
import find from 'lodash/find'
import flatten from 'lodash/flatten'
import without from 'lodash/without'
import filter from 'lodash/filter'
import JSPackager from './js-packager'
import OptionManager from '../option-manager'

export class Packager {
  /**
   * Creates an instance of Packager.
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
    this.packagers = []

    /**
     * 这里的正则匹配为结果文件的后缀
     */
    this.register(/\.js$/, JSPackager)
  }

  /**
   * 注册打包器
   *
   * @param {RegExp} regexp 匹配正则
   * @param {Packager} packager 解析器类
   */
  register (regexp, packager) {
    if (typeof packager === 'string') {
      packager = require(packager)
    }

    this.packagers.push({ regexp, packager })
  }

  bundle (chunks) {
    chunks = [].concat(chunks)

    let bundledChunks = map(this.packagers, ({ regexp, packager: Packager }) => {
      let targetChunks = filter(chunks, (chunk) => {
        return regexp.test(chunk.destination)
      })

      /**
       * 已经确定的文件就不需要再次读取
       * 这里筛选掉已匹配过的 chunks
       */
      chunks = without(chunks, ...targetChunks)

      let packager = new Packager(targetChunks, this.options)
      return packager.bundle()
    })

    bundledChunks = flatten(bundledChunks)
    return [].concat(chunks, bundledChunks)
  }

  matchPackager (file) {
    return find(this.packagers, ({ regexp }) => regexp.test(file))
  }
}

export default new Packager()
