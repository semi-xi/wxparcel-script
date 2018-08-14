import path from 'path'
import findIndex from 'lodash/findIndex'
import stripCssComments from 'strip-css-comments'
import { Resolver } from './resolver'

const IMPORT_REGEXP = /@import\s*(?:.+?)\s*['"]([\w\d_\-./]+)['"];/

export class WxssResolver extends Resolver {
  resolve (source, file, instance) {
    source = source.toString()

    let relativeTo = path.dirname(file)
    let dependencies = this.resolveDependencies(source, file, relativeTo)

    dependencies.forEach((item) => {
      let { file, destination, dependency, required } = item
      instance.emitFile(file, destination, dependency, required)
    })

    return { file, source: Buffer.from(source), dependencies }
  }

  resolveDependencies (code, file, relativeTo) {
    if (code) {
      code = stripCssComments(code)
    }

    let dependencies = []
    while (true) {
      let match = IMPORT_REGEXP.exec(code)
      if (!match) {
        break
      }

      let [all, required] = match
      code = code.replace(all, '')

      let dependency = path.join(relativeTo, required)
      if (findIndex(dependencies, { file, dependency, required }) === -1) {
        let destination = this.resolveDestination(dependency, this.options)
        dependencies.push({ file, dependency, destination, required })
      }
    }

    return dependencies
  }
}
