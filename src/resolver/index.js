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

    return { file, source, dependencies: [] }
  }
}

export default new Resolver()
