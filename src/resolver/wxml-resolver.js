import path from 'path'
import trimEnd from 'lodash/trimEnd'
import trimStart from 'lodash/trimStart'
import stripComments from 'strip-comment'
import { Resolver } from './resolver'

const WXS_REGEPX = /<wxs\s*(?:.*?)\s*src=['"]([\w\d_\-./]+)['"]\s*(?:.*?)\s*(?:\/>|>(?:.*?)<\/wxs>)/
const TEMPLATE_REGEPX = /<import\s*(?:.*?)\s*src=['"]([\w\d_\-./]+)['"]\s*(?:\/>|>(?:.*?)<\/import>)/
const IMAGE_REGEXP = /<image(?:.*?)src=['"]([\w\d_\-./]+)['"](?:.*?)(?:\/>|>(?:.*?)<\/image>)/

export default class WXMLResolver extends Resolver {
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

function escapeRegExp (source) {
  return source.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
}

function replacement (source, string, url, regexp) {
  source = source.replace(new RegExp(escapeRegExp(string), 'g'), () => {
    return string.replace(regexp, (string, file) => {
      return string.replace(file, url)
    })
  })

  return source
}
