import fs from 'fs-extra'
import path from 'path'
import map from 'lodash/map'
import filter from 'lodash/filter'
import forEach from 'lodash/forEach'
import trimEnd from 'lodash/trimEnd'
import findIndex from 'lodash/findIndex'
import { SourceNode } from 'source-map'
import { getSourceNode } from '../../share/source-map'
import Chunk from '../Chunk'
import Bundler from './Bundler'
import OptionManager from '../OptionManager'
import GlobalParser from '../../services/parser'
import { BUNDLER, BUNDLE, ENTRY } from '../../constants/chunk-type'

/**
 * JS 合并类
 *
 * @description
 * 主要负责所有引入的 js chunks 进行合并,
 * 合并后每个模块将有属于自己的作用于作为模块,
 * 并将其内部执行代码包裹
 */
export default class JSBundler extends Bundler {
  /**
   * 唯一ID
   */
  private uid: number

  /**
   * 文件映射Map
   */
  private fileMap: Map<string, any>

  constructor (chunks: Chunk[], options: OptionManager) {
    super(chunks, options)

    this.uid = 0
    this.fileMap = new Map()
  }

  /**
   * 生成唯一标识
   * @description 每个模块的独立标识, 通过递增数字进行标记
   * @returns 32进制的数字字符串
   */
  private genUid (): string {
    let uid = this.uid.toString(32)
    this.uid++
    return uid
  }

  /**
   * 标识文件
   * @description 通过唯一ID标识一个文件, 若文件已标识, 则返回该唯一ID
   * @param file 文件路径
   * @returns 32进制的唯一ID标识
   */
  private remember (file): string {
    if (typeof file !== 'string') {
      throw new Error('File is a invalid string or not be provided')
    }

    let id = this.fileMap.get(file)
    if (!id) {
      id = this.genUid()
      this.fileMap.set(file, id)
    }

    return id
  }

  /**
   * 打包代码
   * @description
   * 因为入口文件为每一个 page,
   * 因此这里除了打包所有 chunk 之外还需要建立新的
   * 入口 chunk 来 require bundler 文件
   * @returns 新的代码片段实例集合
   */
  public async bundle (): Promise<Chunk[]> {
    let { execDir, outDir, rules, sourceMap: useSourceMap } = this.options
    let bundleFilename = 'bundler.js'

    let { code, sourceMapNode: node } = await this.wrapBundler(this.chunks, bundleFilename)
    let PreludeCode = fs.readFileSync(path.join(execDir, './builtins/prelude.js'))
    let loaderCode = PreludeCode.toString()
    code = loaderCode + code

    let sourceMap = null
    let srouceMapResult = null
    if (useSourceMap !== false) {
      node.prepend(loaderCode)
      sourceMap = node.toStringWithSourceMap({ file: bundleFilename })
      srouceMapResult = sourceMap.map.toString()
    }

    let bundleContent = Buffer.from(code)
    let bundleDestination = path.join(outDir, bundleFilename)
    let bundlerChunk = this.assets.add(bundleFilename, {
      type: BUNDLER,
      content: bundleContent,
      destination: bundleDestination,
      rule: GlobalParser.matchRule(bundleDestination, rules),
      sourceMap: srouceMapResult
    })

    /**
     * 因为这里传入的 chunks 已经过滤了出JS代码块与独立类型代码块
     * 因此这里只有通过 JSResolver 查找依赖 (dependencies) 的
     * 代码块, 并且类型一定为 BUNDLE; 因此将 BUNDLE 去除以外的
     * 代码块就为入口代码块
     */
    let bundleChunks = filter(this.chunks, (chunk) => chunk.type !== BUNDLE)
    let entryChunks = map(bundleChunks, ({ file, content, destination, ...otherProps }) => {
      /**
       * 这里可以忽略其他目标文件
       */
      if (Array.isArray(destination)) {
        destination = destination[0]
      }

      let id = this.remember(destination)
      let destFolder = path.dirname(destination)
      let relativePath = path.relative(destFolder, bundleDestination)
      let requiredPath = relativePath.replace(/\\/g, '/')
      let required = requiredPath.replace(path.extname(requiredPath), '')

      let code = `require(${this.wrapQuote(required)})(${this.wrapQuote(id)})`
      let entryContent = Buffer.from(code)

      let params = {
        ...otherProps,
        type: ENTRY as any,
        content: entryContent,
        rule: GlobalParser.matchRule(file, rules)
      }

      return this.assets.add(file, params)
    })

    return [bundlerChunk].concat(entryChunks)
  }

  /**
   * 打包模块
   * @param chunks
   * @returns 包裹后的代码块
   */
  public async wrapBundler (chunks: Chunk[], file: string): Promise<{ code: string, sourceMapNode: SourceNode }> {
    let { sourceMap: useSourceMap } = this.options
    let { code, sourceMapNode: node } = await this.wrapModules(chunks, file)

    let openCode = '('
    let closeCode = ', {})'

    code = openCode + code + closeCode

    if (useSourceMap !== false && node) {
      node.prepend(openCode)
      node.add(closeCode)
    }

    return { code, sourceMapNode: node }
  }

  /**
   * 模块化所有代码块
   * @param chunks
   * @returns 包裹后的代码块
   */
  public async wrapModules (chunks: Chunk[], file: string): Promise<{ code: string, sourceMapNode: SourceNode }> {
    let { sourceMap: useSourceMap } = this.options

    let codes = []
    let nodes = []

    let tasks = chunks.map((chunk) => this.wrapModule(chunk))
    await Promise.all(tasks).then((response) => {
      response.forEach(({ code, sourceMapNode: node }) => {
        codes.push(code)
        node && nodes.push(node)
      })
    })

    let openCode = '{'
    let closeCode = '}'
    let code = openCode + trimEnd(codes.join(''), ',') + closeCode

    let node = null
    if (useSourceMap !== false) {
      node = new SourceNode(null, null, file, nodes)
      node.prepend(openCode)
      node.add(closeCode)
    }

    return { code, sourceMapNode: node }
  }

  /**
   * 模块化代码, 用代码块包裹原生代码
   * @description 这里与 `wrapCode` 方法不同点为将依赖名称转换成32进制唯一标识ID
   * @param chunk 代码片段
   * @returns 包裹后的名称
   */
  public async wrapModule (chunk: Chunk): Promise<{ code: string, sourceMapNode: SourceNode }> {
    let id = this.remember(chunk.destination)
    let code = chunk.content.toString()
    let dependencies = {}

    forEach(chunk.dependencies, (item) => {
      let { dependency, required, destination } = item

      if (findIndex(this.chunks, (chunk) => chunk.file === dependency) !== -1) {
        let id = this.remember(destination)
        dependencies[required] = id
      }
    })

    let result = await this.wrapCode(id, code, dependencies, chunk.sourceMap)
    return result
  }

  /**
   * 模块化代码, 用代码块包裹原生代码
   * 包裹的代码块位对象中的属性名称对应包裹后的代码片段 [block name]: "block code",
   *
   * @param name 模块名称
   * @param code 原生代码
   * @param dependencies 依赖集合, 这里的集合是32进制的标识ID, 非原生依赖路径名称
   * @returns 包裹后的代码块
   */
  public async wrapCode (name: string, code: string, dependencies: { [key: string]: string }, map: string | { [key: string]: string }): Promise<{ code: string, sourceMapNode: SourceNode }> {
    let { sourceMap: useSourceMap } = this.options
    let openCode = `${this.wrapQuote(name)}: [function(require,module,exports) {\n`
    let closeCode = `\n}, ${JSON.stringify(dependencies)}],\n`

    let node = null
    if (useSourceMap !== false && map) {
      node = await getSourceNode(code, map)
      node.prepend(openCode)
      node.add(closeCode)
    }

    code = openCode + code + closeCode
    return { code, sourceMapNode: node }
  }

  /**
   * 用双引号包裹字符串
   * @param str 字符串
   * @returns 包裹后的字符串
   */
  public wrapQuote (str: string): string {
    return `"${str}"`
  }
}
