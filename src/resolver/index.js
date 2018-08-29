import JSONResolver from './json-resolver'
import JSResolver from './js-resolver'
import WXMLResolver from './wxml-resolver'
import WXSSResolver from './wxss-resolver'
import OptionManager from '../option-manager'

export class Resolver {
  constructor (options = OptionManager) {
    this.options = options
    this.resolvers = []

    this.register(/\.json$/, JSONResolver)
    this.register(/\.(jsx?|babel|es6)$/, JSResolver)
    this.register(/\.(wxss|scss|sass)$/, WXSSResolver)
    this.register(/\.(wxml|html)$/, WXMLResolver)
  }

  register (regexp, resolver) {
    if (typeof resolver === 'string') {
      resolver = require(resolver)
    }

    this.resolvers.push({ regexp, resolver })
  }

  /**
   * 解析文件
   *
   * @param {Buffer} source 文件内容
   * @param {String} file 文件名称
   * @param {Object} instance 编译器实例
   */
  resolve (source, file, instance) {
    let { resolvers } = this

    for (let i = 0, l = resolvers.length; i < l; i++) {
      let { regexp, resolver: Resolver } = resolvers[i]

      if (regexp.test(file)) {
        let resolver = new Resolver(source, file, instance, this.options)
        return resolver.resolve()
      }
    }

    return { file, source, dependencies: [] }
  }
}

export default new Resolver()
