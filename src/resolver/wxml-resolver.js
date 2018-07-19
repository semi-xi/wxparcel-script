import path from 'path'
import findIndex from 'lodash/findIndex'
import { Resolver } from './resolver'

const WXS_REGEPX = /<wxs\s*(?:.+?)\s*src=['"]([\w\d_\-./]+)['"]\s*(?:.+?)\s*(?:\/>|><\/wxs>)/
const TEMPLATE_REGEPX = /<import\s*(?:.+?)\s*src=['"]([\w\d_\-./]+)['"]\s*(?:\/>|><\/import>)/

export class WXMLResolver extends Resolver {
  resolve (source = '', file, instance) {
    let relativeTo = path.dirname(file)

    let wxsDeps = this.resolveDependencies(WXS_REGEPX, source, file, relativeTo)
    let tmplDeps = this.resolveDependencies(TEMPLATE_REGEPX, source, file, relativeTo)
    let dependencies = wxsDeps.concat(tmplDeps)

    dependencies.forEach((item) => {
      let { file, destination, dependency, required } = item
      instance.emitFile(file, destination, dependency, required)
    })

    source = Buffer.from(source)
    return { file, source, dependencies }
  }

  resolveDependencies (regexp, code, file, relativeTo) {
    if (code) {
      code = code.replace(/<!--[\s\S]*?(?:-->)/g, '')
    }

    let dependencies = []
    while (true) {
      let match = regexp.exec(code)
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
