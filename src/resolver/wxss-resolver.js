import stripComments from 'strip-css-comments'
import { Resolver } from './resolver'
import { replacement } from '../share'

const IMPORT_REGEXP = /@import\s*['"]([~\w\d_\-./]+?)['"];/
const IMAGE_REGEXP = /url\(["']?([~\w\d_\-./]+?)["']?\)/i

/**
 * WXSS解析器
 *
 * @export
 * @class WXSSResolver
 * @extends {Resolver}
 */
export default class WXSSResolver extends Resolver {
  /**
   * 解析, 并返回文件,代码,依赖等信息
   *
   * @return {Object} 包括文件, 代码, 依赖
   */
  resolve () {
    let source = this.source.toString()
    let dependencies = []

    source = stripComments(source)

    ;[source, dependencies] = this.revise([source, dependencies], IMPORT_REGEXP)
    ;[source, dependencies] = this.revise([source, dependencies], IMAGE_REGEXP, {
      convertDestination: this.convertAssetsDestination.bind(this),
      convertFinallyState: this.convertFinallyState.bind(this)
    })

    source = source.trim()
    source = Buffer.from(source)

    return { file: this.file, content: source, dependencies: dependencies }
  }

  /**
   * 转换最终信息
   *
   * @param {String} source 代码
   * @param {Object} dependence 依赖
   * @param {String} dependence.code 匹配到的代码
   * @param {String} dependence.type 类型
   * @param {String} dependence.file 文件名路径
   * @param {String} dependence.dependency 依赖文件路径
   * @param {String} dependence.required 依赖匹配, 指代路径
   * @param {String} dependence.destination 目标路径
   * @return {Array} [source, dependence] 其中 dependence 不包含 code 属性
   */
  convertFinallyState (source, { code, destination, ...props }) {
    let url = this.convertPublicPath(destination)
    source = replacement(source, code, url, IMAGE_REGEXP)

    let dependence = { destination, ...props }
    return [source, dependence]
  }
}
