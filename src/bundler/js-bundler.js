import fs from 'fs-extra'
import path from 'path'
import map from 'lodash/map'
import filter from 'lodash/filter'
import forEach from 'lodash/forEach'
import trimEnd from 'lodash/trimEnd'
import findIndex from 'lodash/findIndex'
import Bundler from './bundler'
import { BUNDLER, ENTRY } from '../constants/chunk-type'
import OptionManager from '../option-manager'
import Parser from '../parser'

const { execDir } = OptionManager
const PreludeCode = fs.readFileSync(path.join(execDir, './builtins/prelude.js'))

/**
 * JS 合并类
 *
 * 主要负责所有引入的 js chunks 进行合并,
 * 合并后每个模块将有属于自己的作用于作为模块,
 * 并将其内部执行代码包裹
 */
export default class JSBundler extends Bundler {
  /**
   * Creates an instance of JSBundler.
   *
   * @param {Array[Chunk]} chunks JS 代码片段集合
   * @param {OptionManager} [options=OptionManager] 配置
   */
  constructor (chunks, options = OptionManager) {
    super(chunks, options)

    this._uid = 0
    this._fileMap = new Map()
  }

  /**
   * 生成唯一标识
   * 每个模块的独立标识, 通过递增数字进行标记
   *
   * @return {String} 32进制的数字字符串
   */
  _genUid () {
    let uid = this._uid.toString(32)
    this._uid++
    return uid
  }

  /**
   * 标识文件
   * 通过唯一ID标识一个文件, 若文件已标识, 则返回该唯一ID
   *
   * @param {String} file 文件路径
   * @return {String} 32进制的唯一ID标识
   */
  _remember (file) {
    if (typeof file !== 'string') {
      throw new Error('File is a invalid string or not be provided')
    }

    let id = this._fileMap.get(file)
    if (!id) {
      id = this._genUid()
      this._fileMap.set(file, id)
    }

    return id
  }

  /**
   * 打包代码
   * 因为入口文件为每一个 page,
   * 因此这里除了打包所有 chunk 之外还需要建立新的
   * 入口 chunk 来 require bundler 文件
   *
   * @return {Array[Chunk]} 新的代码片段实例集合
   */
  bundle () {
    let { outDir, rules } = this.options

    let { code, map: sourceMap } = this.wrapBundler(this.chunks)
    code = PreludeCode.toString() + code

    let bundleContent = Buffer.from(code)
    let bundleFilename = 'bundler.js'
    let bundleDestination = path.join(outDir, bundleFilename)

    let bundledChunk = this.assets.add(bundleFilename, {
      type: BUNDLER,
      content: bundleContent,
      destination: bundleDestination,
      rule: Parser.matchRule(bundleDestination, rules),
      map: sourceMap
    })

    let entryChunks = filter(this.chunks, (chunk) => chunk.type === ENTRY)

    entryChunks = map(entryChunks, ({ file, content, destination, ...otherProps }) => {
      let id = this._remember(destination)

      let destFolder = path.dirname(destination)
      let relativePath = path.relative(destFolder, bundleDestination)
      let requiredPath = relativePath.replace(/\\/g, '/')
      let required = requiredPath.replace(path.extname(requiredPath), '')

      let code = `require(${this.wrapQuote(required)})(${this.wrapQuote(id)})`
      let entryContent = Buffer.from(code)

      return this.assets.add(file, {
        ...otherProps,
        content: entryContent,
        rule: Parser.matchRule(file, rules)
      })
    })

    return [bundledChunk].concat(entryChunks)
  }

  /**
   * 打包模块
   *
   * @param {Array[Chunk]} chunks
   * @return {String} 包裹后的代码块
   */
  wrapBundler (chunks) {
    let { code, map } = this.wrapModules(chunks)
    code = `(${code}, {})`

    return { code, map }
  }

  /**
   * 模块化所有代码块
   *
   * @param {Array[Chunk]} chunks
   * @return {String} 包裹后的代码块
   */
  wrapModules (chunks) {
    let codes = []
    let maps = []

    chunks.forEach((chunk) => {
      let { code, map } = this.wrapModule(chunk)

      codes.push(code)
      maps.push(map)
    })

    let openWrapper = '{'
    let closeWrapper = '}'
    let code = openWrapper + trimEnd(codes.join('\n'), ',') + closeWrapper

    let map = null
    return { code, map }
  }

  /**
   * 模块化代码, 用代码块包裹原生代码
   * 这里与 `wrapCode` 方法不同点为将依赖名称转换成32进制唯一标识ID
   *
   * @param {Chunk} chunk 代码片段
   * @return {String} 包裹后的名称
   */
  wrapModule (chunk) {
    let id = this._remember(chunk.destination)
    let code = chunk.content.toString()
    let dependencies = {}

    forEach(chunk.dependencies, (item) => {
      let { dependency, required, destination } = item

      if (findIndex(this.chunks, (chunk) => chunk.file === dependency) !== -1) {
        let id = this._remember(destination)
        dependencies[required] = id
      }
    })

    return this.wrapCode(id, code, dependencies, chunk.sourceMap)
  }

  /**
   * 模块化代码, 用代码块包裹原生代码
   * 包裹的代码块位对象中的属性名称对应包裹后的代码片段 [block name]: "block code",
   *
   * @param {String} name 模块名称
   * @param {String} code 原生代码
   * @param {Array[String]} dependencies 依赖集合, 这里的集合是32进制的标识ID, 非原生依赖路径名称
   * @return {String} 包裹后的代码块
   */
  wrapCode (name, code, dependencies, map) {
    let openWrapper = `${this.wrapQuote(name)}: [function(require,module,exports) {\n`
    let closeWrapper = `\n}, ${JSON.stringify(dependencies)}],`
    code = openWrapper + code + closeWrapper

    return { code, map }
  }

  /**
   * 用双引号包裹字符串
   *
   * @param {String} str 字符串
   * @return {String} 包裹后的字符串
   */
  wrapQuote (str) {
    return `"${str}"`
  }
}
