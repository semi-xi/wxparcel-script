import * as path from 'path'
import defaultsDeep from 'lodash/defaultsDeep'
import OptionManager from '../libs/OptionManager'
import Assets from '../libs/assets'
import Chunk from '../libs/Chunk'
import GlobalAssets from '../services/assets'
import * as Typings from '../typings'

export interface QQPluginOptions {
  /**
   * 输出路径
   */
  outDir: string
}

/**
 * QQ小程序生成插件
 */
export default class QQPlugin implements Typings.ParcelPlugin {
  /**
   * 微信小程序与QQ文件对照表
   */
  static COMPARISONS_MAP = { wxs: 'qs', wxss: 'qss', wxml: 'qml' }

  /**
   * 依赖替换查找对照表
   */
  static DEPENDENCY_REPLACEMENT = {
    wxs: /require\(['"]([@~\w\d_\-./]+?)['"]\)/,
    wxss: /@import\s*['"]([@~\w\d_\-./]+?)['"];/,
    wxml: /<(wxml|wxs|wxss) .*?(src=["']([@~\w\d_\-./]*?)["']).*?(\/>|>.*?<\/(wxml|wxs|wxss)>)/
  }

  /**
   * 配置
   */
  public options: QQPluginOptions

  constructor (options?: QQPluginOptions) {
    const outDir = 'qqapp'
    this.options = defaultsDeep({ outDir }, options)
  }

  /**
   * 在编译过程中异步执行
   * @param assets 静态集合
   * @param options 配置
   */
  public async applyBeforeFlush (assets: Assets, options: NonFunctionProperties<OptionManager>) {
    this.filerAppChunks(GlobalAssets.chunks, options).forEach((chunk) => {
      const content = this.replaceContent(chunk)
      const destination = this.replaceDestinations(chunk, options)

      // 添加资源文件
      const state = {
        content: content,
        destination: destination,
        dependencies: chunk.dependencies
      }

      assets.add(chunk.file, state)
    })
  }

  protected replaceDestinations (chunk: Chunk, options: NonFunctionProperties<OptionManager>) {
    let destination = chunk.destination as string[]
    if (!Array.isArray(destination)) {
      destination = destination ? [destination] : []
    }

    destination = destination.filter((output) => output.search(options.outDir) !== -1)
    destination = destination.map((output) => this.replaceDestination(output, options))
    return destination
  }

  protected replaceContent (chunk: Chunk): Buffer {
    let destination = chunk.destination as string[]
    if (!Array.isArray(destination)) {
      destination = destination ? [destination] : []
    }

    const file = destination[0]
    if (!this.isStaticFile(file)) {
      const extname = path.extname(file).substr(1)

      switch (extname) {
        case 'wxs':
          return this.replaceWXS(chunk.content)
        case 'wxss':
          return this.replaceWXSS(chunk.content)
        case 'wxml':
          return this.replaceWXML(chunk.content)
      }
    }

    return chunk.content as Buffer
  }

  /**
   * 替换 WXS 内容
   * @param content 内容
   * @returns 替换后的内容
   * @description
   * 主要修改依赖名称
   */
  protected replaceWXS (content: string | Buffer): Buffer {
    const { wxs: regexp } = QQPlugin.DEPENDENCY_REPLACEMENT

    content = content instanceof Buffer ? content.toString('utf-8') : content
    content = content.replace(regexp, (content, file) => {
      return content.replace(file, this.replaceFileName(file))
    })

    return Buffer.from(content)
  }

  /**
   * 替换 WXSS 内容
   * @param content 内容
   * @returns 替换后的内容
   * @description
   * 主要修改依赖名称
   */
  protected replaceWXSS (content: string | Buffer): Buffer {
    const { wxss: regexp } = QQPlugin.DEPENDENCY_REPLACEMENT

    content = content instanceof Buffer ? content.toString('utf-8') : content
    content = content.replace(regexp, (content, file) => {
      return content.replace(file, this.replaceFileName(file))
    })

    return Buffer.from(content)
  }

  /**
   * 替换 WXML 内容
   * @param content 内容
   * @returns 替换后的内容
   * @description
   * 主要修改依赖名称
   */
  protected replaceWXML (content: string | Buffer): Buffer {
    const { wxml: regexp } = QQPlugin.DEPENDENCY_REPLACEMENT

    content = content instanceof Buffer ? content.toString('utf-8') : content
    content = content.replace(regexp, (_content, tagName, src, file) => {
      tagName = QQPlugin.COMPARISONS_MAP[tagName] || tagName

      const require = src.replace(file, this.replaceFileName(file))
      return `<${tagName} ${require} />`
    })

    return Buffer.from(content)
  }

  /**
   * 是否为静态文件
   * @param file 文件名
   */
  protected isStaticFile (file: string): boolean {
    const extname = path.extname(file)
    return -1 === ['.js', '.wxml', '.wxss', '.wxs'].indexOf(extname)
  }

  /**
   * 筛选文件
   * @param chunks 文件集合
   * @param options 配置
   * @returns 筛选后的文件集合
   * @description
   * 因为只有核心文件才需要上传, 因此这里可以
   * 使用同一个静态服务文件, 而生成两份独立的小程序文件
   */
  protected filerAppChunks (chunks: Chunk[], options: NonFunctionProperties<OptionManager>): Chunk[] {
    return chunks.filter((chunk) => {
      let destination = chunk.destination
      if (!Array.isArray(destination)) {
        destination = [destination]
      }

      return -1 !== destination.findIndex((item) => item.search(options.outDir) !== -1)
    })
  }

  /**
   * 替换文件路径
   * @param file 文件路径
   * @param options 配置
   */
  protected replaceDestination (file: string, options: NonFunctionProperties<OptionManager>): string {
    file = this.replaceFileName(file)

    const outDir = path.join(options.rootDir, this.options.outDir)
    return file.replace(options.outDir, outDir)
  }

  /**
   * 名称替换
   * @param filename 文件名称
   * @returns 新的文件名称
   * @description
   * 主要是用于替换名称后缀
   */
  protected replaceFileName (filename: string): string {
    const extname = path.extname(filename).substr(1)
    const replacemenet: string = QQPlugin.COMPARISONS_MAP[extname]
    if (replacemenet) {
      return filename.replace(extname, replacemenet)
    }

    return filename
  }
}
