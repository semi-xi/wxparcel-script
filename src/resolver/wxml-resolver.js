import path from 'path'
import map from 'lodash/map'
import trimEnd from 'lodash/trimEnd'
import trimStart from 'lodash/trimStart'
import stripComments from 'strip-comment'
import { Resolver } from './resolver'
import { replacement } from './share'

const WXS_REGEPX = /<wxs\s*(?:.*?)\s*src=['"]([~\w\d_\-./]+)['"]\s*(?:.*?)\s*(?:\/>|>(?:.*?)<\/wxs>)/
const TEMPLATE_REGEPX = /<import\s*(?:.*?)\s*src=['"]([~\w\d_\-./]+)['"]\s*(?:\/>|>(?:.*?)<\/import>)/
const INCLUDE_REGEPX = /<include\s*(?:.*?)\s*src=['"]([~\w\d_\-./]+)['"]\s*(?:\/>|>(?:.*?)<\/include>)/
const IMAGE_REGEXP = /<image(?:.*?)src=['"]([~\w\d_\-./]+)['"](?:.*?)(?:\/>|>(?:.*?)<\/image>)/
const COVER_IMAGE_REGEXP = /<cover-image(?:.*?)src=['"]([~\w\d_\-./]+)['"](?:.*?)(?:\/>|>(?:.*?)<\/cover-image>)/

/**
 * WXML 解析器
 *
 * @export
 * @class WXMLResolver
 * @extends {Resolver}
 */
export default class WXMLResolver extends Resolver {
  /**
   * 解析, 并返回文件,代码,依赖等信息
   *
   * @return {Object} 包括文件, 代码, 依赖
   */
  resolve () {
    const { staticDir, pubPath } = this.options

    let source = this.source.toString()
    source = stripComments(source)

    let covertImageOptions = {
      convertDestination: this.convertAssetsDestination.bind(this)
    }

    const wxsDeps = this.resolveDependencies(WXS_REGEPX)
    const templateDeps = this.resolveDependencies(TEMPLATE_REGEPX)
    const includeDeps = this.resolveDependencies(INCLUDE_REGEPX)
    const imageDeps = this.resolveDependencies(IMAGE_REGEXP, covertImageOptions)
    const coverImageDeps = this.resolveDependencies(COVER_IMAGE_REGEXP, covertImageOptions)

    let dependencies = [].concat(wxsDeps, templateDeps, includeDeps, imageDeps, coverImageDeps)
    dependencies = map(dependencies, (item) => {
      let { file, destination, dependency, required, code } = item
      let relativePath = destination.replace(staticDir, '')
      let url = trimEnd(pubPath, path.sep) + '/' + trimStart(relativePath, path.sep)

      source = replacement(source, code, url, IMAGE_REGEXP)
      source = replacement(source, code, url, COVER_IMAGE_REGEXP)

      return { file, destination, dependency, required }
    })

    this.source = Buffer.from(source)
    return { file: this.file, content: this.source, dependencies }
  }
}
