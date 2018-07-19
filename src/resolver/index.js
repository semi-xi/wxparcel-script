import { AppConfResolver } from './app-conf-resolver'
import { JSResolver } from './js-resolver'
import OptionManager from '../option-manager'

export class Resolver {
  constructor (options = OptionManager) {
    this.options = options
    this.confResolver = new AppConfResolver(this.options)
    this.jsResolver = new JSResolver(this.options)
  }

  resolve (source, file, instance) {
    if (this.options.appConfigFile === file) {
      return this.confResolver.resolve(source, file, instance)
    }

    if (/\.js$/.test(file)) {
      return this.jsResolver.resolve(source, file, instance)
    }

    source = Buffer.from(source)
    return { file, source, dependencies: [] }
  }
}

export default new Resolver()
