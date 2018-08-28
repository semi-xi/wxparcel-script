import { JsonResolver } from './json-resolver'
import { JsResolver } from './js-resolver'
import { WxmlResolver } from './wxml-resolver'
import { WxssResolver } from './wxss-resolver'
import OptionManager from '../option-manager'

export class Resolver {
  constructor (options = OptionManager) {
    this.options = options
  }

  /**
   * 解析文件
   *
   * @param {Buffer} source 文件内容
   * @param {String} file 文件名称
   * @param {Object} instance 编译器实例
   */
  resolve (source, file, instance) {
    if (/\.(png|jpeg|jpg|gif)$/.test(file)) {
      return { file, source, dependencies: [] }
    }

    if (/\.json$/.test(file)) {
      let resolver = new JsonResolver(source, file, instance, this.options)
      return resolver.resolve()
    }

    if (/\.js$/.test(file)) {
      let resolver = new JsResolver(source, file, instance, this.options)
      return resolver.resolve()
    }

    if (/\.wxss$/.test(file)) {
      let resolver = new WxssResolver(source, file, instance, this.options)
      return resolver.resolve()
    }

    if (/\.wxml$/.test(file)) {
      let resolver = new WxmlResolver(source, file, instance, this.options)
      return resolver.resolve()
    }

    return { file, source, dependencies: [] }
  }
}

export default new Resolver()
