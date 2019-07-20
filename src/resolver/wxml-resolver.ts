import path from 'path'
import stripComments from 'strip-comment'
import Resolver from './resolver'
import { replacement } from '../share'
import * as Typings from '../typings'

const SRC_REGEXP = /src=["']([@~\w\d_\-./]*?)["']/

/**
 * WXML 解析器
 */
export default class WXMLResolver extends Resolver {
  /**
   * 解析, 并返回文件,代码,依赖等信息
   * @returns 包括文件, 代码, 依赖
   */
  public resolve () {
    let source = this.source.toString()
    let dependencies: Typings.ParcelChunkDependency[] = []

    source = stripComments(source)

    ;[source, dependencies] = this.revise([source, dependencies], SRC_REGEXP, {
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
  public convertFinallyState (source: string, { code, dependency, destination, required, ...props }) {
    let extname = path.extname(destination)
    if (required.charAt(0) === '@' || extname === '' || /\.(wxs|wxml)$/.test(extname)) {
      let dependence = { dependency, destination, required, ...props }
      return [source, dependence]
    }

    let dependencyDestination = this.convertAssetsDestination(dependency)
    let url = this.convertPublicPath(dependencyDestination)
    source = replacement(source, code, url, SRC_REGEXP)

    let dependence = { dependency, destination: dependencyDestination, required, ...props }
    return [source, dependence]
  }
}
