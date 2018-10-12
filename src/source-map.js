import filter from 'lodash/filter'
import isEmpty from 'lodash/isEmpty'
import forEach from 'lodash/forEach'
import { SourceMapConsumer, SourceMapGenerator } from 'source-map'
import OptionManager from './option-manager'

export class SourceMap {
  /**
   * Creates an instance of SourceMap.
   *
   * @param {Chunk} chunk 代码片段
   * @param {OptionManager} options 配置
   * @param {Array[Mapping]} mappings 映射表
   * @param {Object} sources 映射的源码集合
   */
  constructor (chunk, options = OptionManager, mappings, sources) {
    /**
     * 代码片段
     *
     * @type {Chunk}
     */
    this.chunk = chunk

    /**
     * 配置
     *
     * @type {Object}
     */
    this.options = options

    /**
     * 映射图表集合
     *
     * @type {Array[Mapping]}
     */
    this.mappings = Array.isArray(mappings) ? filter(mappings, this.validMapping) : []

    /**
     * 映射的源码集合
     *
     * @type {Object}
     */
    this.sources = sources || {}

    /**
     * 行数统计
     *
     * @type {Number}
     */
    this.lineCount = 0

    if (isEmpty(this.sources)) {
      let { file, content } = chunk
      let fileName = file.replace(options.srcDir, '')
      this.sources = {}
      this.sources[fileName] = content
    }
  }

  prependMap () {

  }

  appendMap () {

  }

  /**
   * 添加一个 Map 并插入到 SourceMap 末尾
   *
   * @param {SourceMap|Object} map SourceMap
   * @param {number} [lineOffset=0] 对原本映射表末尾的偏移行数
   * @param {number} [columnOffset=0] 对原本映射表末尾的偏移列数
   */
  async addMap (map, lineOffset = 0, columnOffset = 0) {
    // 这里判断为原生 SourceMap 数据
    if (!(map instanceof SourceMap) && map.version) {
      // 强制转化成 SourceMapConsumer
      let consumer = await this.getConsumer(map)

      consumer.eachMapping((mapping) => {
        this.addConsumerMapping(mapping, lineOffset, columnOffset)

        if (!this.sources[mapping.source]) {
          this.sources[mapping.source] = consumer.sourceContentFor(mapping.source, true)
        }
      })

      // Only needs to happen in source-map 0.7
      consumer.destroy && consumer.destroy()
    } else {
      if (!map.eachMapping) {
        map = new SourceMap(map.mappings, map.sources)
      }

      if (lineOffset === 0 && columnOffset === 0) {
        this.mappings = this.mappings.concat(map.mappings)
      } else {
        map.eachMapping((mapping) => {
          this.addMapping(mapping, lineOffset, columnOffset)
        })
      }

      Object.keys(map.sources).forEach((sourceName) => {
        if (!this.sources[sourceName]) {
          this.sources[sourceName] = map.sources[sourceName]
        }
      })
    }
  }

  /**
   * 添加一个 Mapping
   *
   * @param {Mapping} mapping 映射表
   * @param {number} [lineOffset=0] 对原本映射表末尾的偏移行数
   * @param {number} [columnOffset=0] 对原本映射表末尾的偏移列数
   */
  addMapping (mapping, lineOffset = 0, columnOffset = 0) {
    this.validMapping(mapping)

    let { source, name, original, generated } = mapping
    generated.line += lineOffset
    generated.column += columnOffset

    this.mappings.push({ source, name, original, generated })
  }

  /**
   * 添加一个 ConsumerMapping
   *
   * @param {Mapping} mapping 映射表
   * @param {number} [lineOffset=0] 对原本映射表末尾的偏移行数
   * @param {number} [columnOffset=0] 对原本映射表末尾的偏移列数
   */
  addConsumerMapping (mapping, lineOffset = 0, columnOffset = 0) {
    if (!this.validConsumerMapping(mapping)) {
      return
    }

    let { source, name, originalLine, originalColumn, generatedLine, generatedColumn } = mapping

    let original = {
      line: originalLine,
      column: originalColumn
    }

    let generated = {
      line: generatedLine + lineOffset,
      column: generatedColumn + columnOffset
    }

    this.mappings.push({ source, name, original, generated })
  }

  /**
   * 遍历所有 mappings
   *
   * @param {Function} callback 遍历每一个的回调
   */
  eachMapping (callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback is not a function or not be provided')
    }

    forEach(this.mappings, callback)
  }

  /**
   * 将不是 SourceMapConsumer 对象也强制转化成 SourceMapConsumer 对象
   *
   * @param {SourceMapConsumer|String|Object} map
   * @return {SourceMapConsumer}
   */
  async getConsumer (map) {
    if (map instanceof SourceMapConsumer) {
      return map
    }

    map = typeof map === 'string' ? JSON.parse(map) : map
    let consumer = await new SourceMapConsumer(map)
    return consumer
  }

  /**
   * 验证映射表集合是否正确
   *
   * @param {ConsumerMapping} mappings 映射表集合
   */
  validConsumerMapping (mapping) {
    if (typeof mapping !== 'object') {
      return false
    }

    if (typeof mapping.source !== 'string' || !mapping.source.length) {
      return false
    }

    if (!(Number.isSafeInteger(mapping.originalLine) && mapping.originalLine >= 1)) {
      return false
    }

    if (!(Number.isSafeInteger(mapping.originalColumn) && mapping.originalColumn >= 0)) {
      return false
    }

    if (!(Number.isSafeInteger(mapping.generatedLine) && mapping.generatedLine >= 1)) {
      return false
    }

    if (!(Number.isSafeInteger(mapping.generatedColumn) && mapping.generatedColumn >= 0)) {
      return false
    }

    return true
  }

  /**
   * 验证映射表集合是否正确
   *
   * @param {Mapping} mapping 映射表
   * @return {Bollean} true
   */
  validMapping (mapping) {
    if (typeof mapping !== 'object') {
      return false
    }

    if (typeof mapping.source !== 'string' || !mapping.source.length) {
      return false
    }

    if (typeof mapping.original !== 'object') {
      return false
    }

    if (!(Number.isSafeInteger(mapping.original.line) && mapping.original.line >= 1)) {
      return false
    }

    if (!(Number.isSafeInteger(mapping.original.column) && mapping.original.column >= 0)) {
      return false
    }

    if (typeof mapping.generated !== 'object') {
      return false
    }

    if (!(Number.isSafeInteger(mapping.generated.line) && mapping.generated.line >= 1)) {
      return false
    }

    if (!(Number.isSafeInteger(mapping.generated.column) && mapping.generated.column >= 0)) {
      return false
    }

    return true
  }

  stringify (file, sourceRoot) {
    let { srcDir } = this.options

    if (!file) {
      let { file: filePath } = this.chunk
      filePath = filePath.replace(srcDir + '/', './')
      file = filePath.replace(/\\/g, '/')
    }

    let generator = new SourceMapGenerator({ file, sourceRoot })

    this.eachMapping((mapping) => generator.addMapping(mapping))
    Object.keys(this.sources).forEach((sourceName) => generator.setSourceContent(sourceName, this.sources[sourceName]))

    return generator.toString()
  }
}

/**
 * @typedef Mapping 映射表
 * @property {String} name 映射表映射的文件名称
 * @property {String} source 映射表映射的原文件名称
 * @property {Object} original 原本代码映射属性
 * @property {Number} original.line 行数必须大于等于1，且必须位整数
 * @property {Number} original.column 列数必须大于等于0，且必须位整数
 * @property {Object} generated 编译代码映射属性
 * @property {Number} generated.line 行数必须大于等于1，且必须位整数
 * @property {Number} generated.column 列数必须大于等于0，且必须位整数
 */

/**
 * @typedef ConsumerMapping 映射表
 * @property {String} name 映射表映射的文件名称
 * @property {String} source 映射表映射的原文件名称
 * @property {Number} originalLine 行数必须大于等于1，且必须位整数
 * @property {Number} originalColumn 列数必须大于等于0，且必须位整数
 * @property {Number} generatedLine 行数必须大于等于1，且必须位整数
 * @property {Number} generatedColumn 列数必须大于等于0，且必须位整数
 */