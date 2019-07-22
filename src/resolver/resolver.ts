import path from 'path'
import fs from 'fs-extra'
import defaults from 'lodash/defaults'
import trimEnd from 'lodash/trimEnd'
import trimStart from 'lodash/trimStart'
import findIndex from 'lodash/findIndex'
import OptionManager from '../libs/OptionManager'
import { genFileSync } from '../share/utils'
import * as Types from '../constants/chunk-type'
import * as Typings from '../typings'

interface ReviseOptions {
  type?: ValueOf<typeof Types>
  convertDependency?: Resolver['convertDependency']
  convertDestination?: (file: string, options?: OptionManager) => string
  convertFinallyState?: Resolver['convertFinallyState']
}

/**
 * 解析器
 */
export default class Resolver {
  /**
   * 代码
   */
  public source: string | Buffer

  /**
   * 文件路径
   */
  public file: string

  /**
   * 配置
   */
  public options: OptionManager

  /**
   * 依赖
   */
  public dependencies: Typings.ParcelChunkDependency[]

  constructor (asset: any, options: OptionManager) {
    this.source = asset.content
    this.file = asset.file
    this.options = options
  }

  /**
   * 解析, 并返回文件,代码,依赖等信息
   */
  public resolve (): { file: string, content: string | Buffer, dependencies: Typings.ParcelChunkDependency[], map?: string | object } {
    return { file: this.file, content: this.source, dependencies: this.dependencies }
  }

  /**
   * 修正信息
   * @param info 信息 [source, dependencies]
   * @param pattern 匹配正则
   * @param options 配置
   */
  public revise (info: any[], pattern: RegExp | RegExp[], options: ReviseOptions = {}) {
    let [source, dependencies] = info
    if (Array.isArray(pattern)) {
      pattern.forEach((pattern) => {
        [source, dependencies] = this.revise([source, dependencies], pattern, options)
      })

      return [source, dependencies]
    }

    options = defaults({}, options, {
      convertDependency: this.convertDependency.bind(this),
      convertDestination: this.convertDestination.bind(this),
      convertFinallyState: this.convertFinallyState.bind(this)
    })

    let { convertDependency, convertDestination, convertFinallyState } = options
    let code = source

    while (true) {
      let match = pattern.exec(code)
      if (!match) {
        break
      }

      let [all, ...required] = match
      let validRequired = required.find((item) => typeof item !== 'undefined')
      code = code.replace(all, '')

      let dependency = convertDependency(validRequired)
      if (dependency === false) {
        break
      }

      let props = { file: this.file, dependency, required: validRequired }
      if (!fs.existsSync(dependency as string)) {
        throw new Error(`Cannot found module ${validRequired} in ${this.file}`)
      }

      if (findIndex(dependencies, props) === -1) {
        let destination = convertDestination(dependency as string, this.options)
        let dependence = { ...props, type: options.type, destination }

        ;[source, dependence as any] = convertFinallyState(source, { ...dependence, code: all })
        dependencies.push(dependence)
      }
    }

    return [source, dependencies]
  }

  /**
   * 转换依赖路径
   *
   * @param required 依赖文件路径
   * @param relativePath 相对引用文件路径
   * @returns 依赖路径
   */
  public convertDependency (required: string, relativePath: string = path.dirname(this.file)): string | boolean {
    const { srcDir, rootDir } = this.options

    switch (required.charAt(0)) {
      case '@':
        required = required.substr(1)
        break
    }

    switch (required.charAt(0)) {
      case '~':
        return path.join(srcDir, required.substr(1))
      case '/':
        return path.join(rootDir, required.substr(1))
      case '.':
      default:
        return path.join(relativePath, required)
    }
  }

  /**
   * 转换 @ 标识的 require 路径
   * @param required 模块路径
   * @returns 转换后的模块路径
   */
  public convertAtRequired (required: string): string {
    const { srcDir } = this.options
    if (required.charAt(0) === '@') {
      required = required.substr(1)

      switch (required.charAt(0)) {
        case '~':
          return required.substr(1)
        case '/':
          let src = path.basename(srcDir)
          return required.replace(`/${src}`, '')
        default:
          return required
      }
    }

    return required
  }

  /**
   * 转换目标路径
   * @param file 文件路径
   * @returns 目标路径
   */
  public convertDestination (file: string): string {
    let { rootDir, srcDir, outDir } = this.options

    /**
     * windows 下 path 存在多个反斜杠
     * 因此需要 escape 才能进行 search
     * 这里可以直接使用 indexOf 进行查询
     */
    return file.indexOf(srcDir) !== -1
      ? file.replace(srcDir, outDir)
      : file.replace(rootDir, outDir)
  }

  /**
   * 转换最终信息
   *
   * @param source 代码
   * @param dependence 依赖
   * @param dependence.code 匹配到的代码
   * @param dependence.type 类型
   * @param dependence.file 文件名路径
   * @param dependence.dependency 依赖文件路径
   * @param dependence.required 依赖匹配, 指代路径
   * @param dependence.destination 目标路径
   * @returns [source, dependence] 其中 dependence 不包含 code 属性
   */
  public convertFinallyState (source: string, { code, ...dependence }) {
    return [source, dependence]
  }

  /**
   * 转换静态目标路径
   *
   * @param file 文件路径
   * @returns 静态目标路径
   */
  public convertAssetsDestination (file: string): string {
    let { staticDir } = this.options
    let extname = path.extname(file)
    let basename = path.basename(file).replace(extname, '')
    let filename = basename + '.' + genFileSync(file) + extname
    return path.join(staticDir, filename)
  }

  /**
   * 转换公共路径
   * @param file 文件路径
   * @returns 公共路径
   */
  public convertPublicPath (file: string): string {
    const { staticDir, pubPath } = this.options

    /**
     * 这里使用 `/` 而非 `path.sep`, 但必须要过滤 `path.sep`
     * 以防 windows 路径与 web 路径不统一
     */
    let relativePath = file.replace(staticDir, '')
    return trimEnd(pubPath, path.sep) + '/' + trimStart(relativePath, path.sep)
  }
}
