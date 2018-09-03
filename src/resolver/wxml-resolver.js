import path from 'path'
import trimEnd from 'lodash/trimEnd'
import trimStart from 'lodash/trimStart'
import stripComments from 'strip-comment'
import { Resolver } from './resolver'
import { replacement } from './share'

const WXS_REGEPX = /<wxs\s*(?:.*?)\s*src=['"]([\w\d_\-./]+)['"]\s*(?:.*?)\s*(?:\/>|>(?:.*?)<\/wxs>)/
const TEMPLATE_REGEPX = /<import\s*(?:.*?)\s*src=['"]([\w\d_\-./]+)['"]\s*(?:\/>|>(?:.*?)<\/import>)/
const IMAGE_REGEXP = /<image(?:.*?)src=['"]([\w\d_\-./]+)['"](?:.*?)(?:\/>|>(?:.*?)<\/image>)/

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

    this.source = this.source.toString()
    this.source = stripComments(this.source)

    let wxsDeps = this.resolveDependencies(WXS_REGEPX)
    let templateDeps = this.resolveDependencies(TEMPLATE_REGEPX)
    let imageDeps = this.resolveDependencies(IMAGE_REGEXP, {
      convertDestination: this.convertAssetsDestination.bind(this)
    })

    let dependencies = [].concat(wxsDeps, templateDeps, imageDeps)
    dependencies = dependencies.map((item) => {
      let { file, destination, dependency, required, code } = item
      let relativePath = destination.replace(staticDir, '')
      let url = trimEnd(pubPath, path.sep) + '/' + trimStart(relativePath, path.sep)

      this.source = replacement(this.source, code, url, IMAGE_REGEXP)
      this.instance.emitFile(file, destination, dependency, required)

      return { file, destination, dependency, required }
    })

    this.source = Buffer.from(this.source)
    return { file: this.file, source: this.source, dependencies }
  }
}
