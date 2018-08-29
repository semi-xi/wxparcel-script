import path from 'path'
import trimEnd from 'lodash/trimEnd'
import trimStart from 'lodash/trimStart'
import stripCssComments from 'strip-css-comments'
import { Resolver } from './resolver'
import { replacement } from './share'

const IMPORT_REGEXP = /@import\s*(?:.+?)\s*['"]([\w\d_\-./]+)['"];/
const IMAGE_REGEXP = /url\(["']?([^"'\s]+?)["']?\)/i

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
    const { staticDir, pubPath } = this.options

    this.source = this.source.toString()
    this.source = stripCssComments(this.source)

    let importDeps = this.resolveDependencies(IMPORT_REGEXP)
    let imageDeps = this.resolveDependencies(IMAGE_REGEXP, {
      convertDestination: this.convertAssetsDestination.bind(this)
    })

    let dependencies = [].concat(importDeps, imageDeps)
    dependencies = dependencies.map((item) => {
      let { match, file, destination, dependency, required } = item
      let [holder] = match

      let relativePath = destination.replace(staticDir, '')
      let url = trimEnd(pubPath, path.sep) + '/' + trimStart(relativePath, path.sep)

      this.source = replacement(this.source, holder, url, IMAGE_REGEXP)
      this.instance.emitFile(file, destination, dependency, required)

      return { file, destination, dependency, required }
    })

    this.source = Buffer.from(this.source)
    return { file: this.file, source: this.source, dependencies }
  }
}
