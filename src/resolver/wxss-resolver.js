import stripCssComments from 'strip-css-comments'
import { Resolver } from './resolver'

const IMPORT_REGEXP = /@import\s*(?:.+?)\s*['"]([\w\d_\-./]+)['"];/

export class WxssResolver extends Resolver {
  resolve () {
    this.source = this.source.toString()
    this.source = stripCssComments(this.source)

    let dependencies = this.resolveDependencies(IMPORT_REGEXP)
    dependencies = dependencies.map((item) => {
      let { file, destination, dependency, required } = item
      this.instance.emitFile(file, destination, dependency, required)
      return { file, destination, dependency, required }
    })

    this.source = Buffer.from(this.source)
    return { file: this.file, source: this.source, dependencies }
  }
}
