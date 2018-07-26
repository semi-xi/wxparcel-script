import { JsonResolver } from './json-resolver'
import { JsResolver } from './js-resolver'
import { WxmlResolver } from './wxml-resolver'
import { WxssResolver } from './wxss-resolver'
import OptionManager from '../option-manager'

export class Resolver {
  constructor (options = OptionManager) {
    this.options = options
    this.jsonResolver = new JsonResolver(this.options)
    this.jsResolver = new JsResolver(this.options)
    this.wxmlResolver = new WxmlResolver(this.options)
    this.wxssResolver = new WxssResolver(this.options)
  }

  resolve (source, file, instance) {
    source = source.toString()

    if (/\.json$/.test(file)) {
      return this.jsonResolver.resolve(source, file, instance)
    }

    if (/\.js$/.test(file)) {
      return this.jsResolver.resolve(source, file, instance)
    }

    if (/\.wxss$/.test(file)) {
      return this.wxssResolver.resolve(source, file, instance)
    }

    if (/\.wxml$/.test(file)) {
      return this.wxmlResolver.resolve(source, file, instance)
    }

    source = Buffer.from(source)
    return { file, source, dependencies: [] }
  }
}

export default new Resolver()
