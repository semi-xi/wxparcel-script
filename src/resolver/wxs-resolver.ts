import * as path from 'path'
import stripComments from 'strip-css-comments'
import Resolver from './resolver'
import { escapeRegExp } from '../share/utils'
import * as Typings from '../typings'

const IMAGE_REGEXP = /require\(['"]([@~\w\d_\-./]+?)['"]\)/

/**
 * WXSS解析器
 */
export default class WXSResolver extends Resolver {
  /**
   * 解析, 并返回文件,代码,依赖等信息
   * @returns 包括文件, 代码, 依赖
   */
  public resolve () {
    let source = this.source.toString()
    let dependencies: Typings.ParcelChunkDependency[] = []

    source = stripComments(source)

    ;[source, dependencies] = this.revise([source, dependencies], IMAGE_REGEXP, {
      convertDestination: this.convertAssetsDestination.bind(this),
      convertFinallyState: this.convertFinallyState.bind(this)
    })

    source = source.trim()

    const buffer = Buffer.from(source)
    return { file: this.file, content: buffer, dependencies }
  }

  /**
   * 转换最终信息
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
  public convertFinallyState (source: string, { code, destination, required, ...props }) {
    if (required.charAt(0) === '@') {
      let url = this.convertAtRequired(required)
      source = source.replace(new RegExp(escapeRegExp(code), 'ig'), `"${url}"`)

      let dependence = { destination, required, ...props }
      return [source, dependence]
    }

    let url = this.convertPublicPath(destination)
    source = source.replace(new RegExp(escapeRegExp(code), 'ig'), `"${url}"`)

    let dependence = { destination, required, ...props }
    return [source, dependence]
  }
}
