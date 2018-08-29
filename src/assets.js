import { Chunk } from './chunk'
import OptionManager from './option-manager'

/**
 * Chunk 管理器
 * 用于管理所有 Chunk
 * 通过他能查找,添加,修改,删除文件相对应的 chunk
 *
 * @export
 * @class Assets
 */
export class Assets {
  /**
   * 获取大小
   *
   * @readonly
   */
  get size () {
    return this.chunks.length
  }

  /**
   * Creates an instance of Assets.
   * @param {*} [options=OptionManager]
   */
  constructor (options = OptionManager) {
    /**
     * 配置管理器
     *
     * @type {OptionManager}
     */
    this.options = options

    /**
     * Chunk 集合
     *
     * @type {Array}
     */
    this.chunks = []
  }

  /**
   * 根据文件获取 chunk 的下标
   *
   * @param {String} file 文件名
   * @return {Number} 下标
   */
  index (file) {
    return this.chunks.findIndex((chunk) => chunk.file === file)
  }

  /**
   * 添加 chunk
   *
   * @param {String} file 文件名
   * @param {Object} [state={}] 状态
   * @return {Chunk}
   */
  add (file, state = {}) {
    let chunk = new Chunk(file, state, this.options)
    this.chunks.push(chunk)
    return chunk
  }

  /**
   * 更新 chunk
   *
   * @param {String} file 文件名
   * @param {Object} [state={}] 状态
   */
  update (file, state = {}) {
    let chunk = this.get(file)
    chunk && chunk.update(state)
  }

  /**
   * 通过文件获取 chunk
   *
   * @param {String} file 文件名
   * @returns {Chunk}
   */
  get (file) {
    let index = this.index(file)
    return this.chunks[index] || null
  }

  /**
   * 通过文件删除 chunk
   *
   * @param {String} file 文件名
   */
  del (file) {
    let index = this.index(file)
    index !== -1 && this.chunks.splice(index, 1)
  }

  /**
   * 通过文件判断 chunk 是否已存在
   *
   * @param {String} file 文件名
   * @return {Boolean}
   */
  exists (file) {
    return this.index(file) !== -1
  }

  /**
   * 清除所有 chunk
   *
   */
  clean () {
    let chunks = this.chunks.splice(0)
    this.chunks = []

    chunks.forEach((chunk) => chunk.destory())
  }
}

export default new Assets()
