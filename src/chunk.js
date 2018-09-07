import fs from 'fs-extra'
import path from 'path'
import isPlainObject from 'lodash/isPlainObject'
import omit from 'lodash/omit'
import optionManager from './option-manager'

/**
 * 代码片段
 * 用于管理代码文件, 包括其状态, 代码块等
 *
 * @export
 * @class Chunk
 */
export class Chunk {
  /**
   * Creates an instance of Chunk.
   * @param {String} file 文件名
   * @param {Object} [state={}] 状态
   * @param {OptionManager} [options=OptionManager] 配置管理器
   */
  constructor (file, state = {}, options = optionManager) {
    if (!file) {
      throw new TypeError('File is invalid or not be provied')
    }

    if (!fs.existsSync(file)) {
      if (!state.content) {
        throw new Error(`File ${file} is not found`)
      }
    }

    /**
     * 配置管理器
     *
     * @type {OptionManager}
     */
    this.options = options

    /**
     * 是否已经释放掉
     *
     * @type {Boolean}
     */
    this.flushed = false

    /**
     * 文件路径
     *
     * @type {String}
     */
    this.file = file

    /**
     * 分片类型 [bundler|entry]
     *
     * @type {Menu}
     */
    this.type = state.type || 'entry'

    /**
     * 依赖集合
     *
     * @type {Array}
     */
    this.dependencies = state.dependencies || []

    /**
     * 代码内容
     *
     * @type {Buffer}
     */
    this.content = Buffer.from(state.content || '')

    let { rootDir, srcDir, outDir, npmDir, staticDir } = this.options
    let { rule, destination } = this.state = state

    /**
     * 加载规则
     * 重置 rule 值再赋值
     * 下面 rule 需要默认值来使用
     *
     * @type {Object}
     */
    this.rule = rule = rule || {}

    /**
     * 保存的目的地路径
     *
     * @type {String}
     */
    this.destination = destination || ''

    if (destination) {
      if (rule.extname) {
        let dirname = path.dirname(destination)
        let filename = path.basename(destination)
        let extname = path.extname(file)

        filename = filename.replace(extname, rule.extname)
        this.destination = path.join(dirname, filename)
      } else {
        this.destination = destination
      }
    } else {
      /**
       * windows 下 path 存在多个反斜杠
       * 因此需要 escape 才能进行 search
       * 这里可以直接使用 indexOf 进行查询
       */
      let relativePath = file.indexOf(srcDir) !== -1
        ? path.dirname(file).replace(srcDir, '')
        : /[\\/]node_modules[\\/]/.test(file)
          ? path.dirname(file).replace(path.join(rootDir, 'node_modules'), npmDir)
          : path.dirname(file).replace(rootDir, '')

      let filename = path.basename(file)
      if (rule.extname) {
        let extname = path.extname(file)
        filename = filename.replace(extname, rule.extname)
      }

      this.destination = path.join(rule.type === 'static' ? staticDir : outDir, relativePath, filename)
    }
  }

  /**
   * 更新状态
   *
   * @param {Object} [props={}] 属性
   */
  update (props = {}) {
    if (props.hasOwnProperty('file') && typeof props.file === 'string') {
      this.file = props.file
    }

    if (props.hasOwnProperty('type') && typeof props.type === 'string') {
      this.type = props.type
    }

    if (props.hasOwnProperty('dependencies') && Array.isArray(props.dependencies)) {
      this.dependencies = props.dependencies
    }

    if (props.hasOwnProperty('rule') && isPlainObject(props.rule)) {
      this.rule = props.rule
    }

    if (props.hasOwnProperty('destination') && typeof props.destination === 'string') {
      this.destination = props.destination
    }

    if (props.hasOwnProperty('content')) {
      if (typeof props.content === 'string') {
        this.content = Buffer.from(props.content)
      } else if (props.content instanceof Buffer) {
        this.content = props.content
      }
    }

    this.flushed = false
  }

  /**
   * 释放
   *
   * @return {object} metadata 元数据
   */
  flush () {
    let metadata = omit(this, ['flush'])
    this.flushed = true
    return metadata
  }

  /**
   * 销毁对象
   *
   */
  destory () {
    this.file = undefined
    this.dependencies = undefined
    this.state = undefined
    this.rule = undefined
    this.destination = undefined
  }
}
