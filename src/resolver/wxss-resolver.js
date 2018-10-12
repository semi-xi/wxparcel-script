import path from 'path'
import trimEnd from 'lodash/trimEnd'
import trimStart from 'lodash/trimStart'
import stripCssComments from 'strip-css-comments'
import { Resolver } from './resolver'
import { replacement } from './share'

const IMPORT_REGEXP = /@import\s*(?:.+?)\s*['"]([~\w\d_\-./]+?)['"];/
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
    let { staticDir, pubPath } = this.options

    let source = this.source.toString()
    source = stripCssComments(source)

    let importDeps = this.resolveDependencies(source, IMPORT_REGEXP)
    let imageDeps = this.resolveDependencies(source, IMAGE_REGEXP, {
      convertDestination: this.convertAssetsDestination.bind(this)
    })

    let dependencies = [].concat(importDeps, imageDeps)
    dependencies = dependencies.map((item) => {
      let { file, destination, dependency, required, code } = item
      let relativePath = destination.replace(staticDir, '')
      let url = trimEnd(pubPath, path.sep) + '/' + trimStart(relativePath, path.sep)

      source = replacement(source, code, url, IMAGE_REGEXP)
      return { file, destination, dependency, required }
    })

    this.source = Buffer.from(source)
    return { file: this.file, content: this.source, dependencies }
  }
}
