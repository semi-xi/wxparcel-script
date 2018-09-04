import JSONResolver from './json-resolver'
import JSResolver from './js-resolver'
import WXMLResolver from './wxml-resolver'
import WXSSResolver from './wxss-resolver'
import OptionManager from '../option-manager'

/**
 * 解析器
 * 通过注册的解析器解析各种文件, 并修改其中内容或者
 * 添加依赖
 *
 * @export
 * @class Resolver
 */
export class Resolver {
  /**
   * Creates an instance of Resolver.
   * @param {OptionManager} [options=OptionManager] 配置管理器
   * @memberof Resolver
   */
  constructor (options = OptionManager) {
    /**
     * 配置管理器
     *
     * @type {OptionManager}
     */
    this.options = options

    /**
     * 解析器结合
     *
     * @type {Array}
     */
    this.resolvers = []

    /**
     * resolver 比 loader 要延后,
     * 因此这里后缀为未编译的文件都是编译后
     * 才 resolve 的
     */
    this.register(/\.json$/, JSONResolver)
    this.register(/\.(jsx?|babel|es6)$/, JSResolver)
    this.register(/\.(wxss|css|scss|sass)$/, WXSSResolver)
    this.register(/\.(wxml|html)$/, WXMLResolver)
  }

  /**
   * 注册解析器
   *
   * @param {RegExp} regexp 匹配正则
   * @param {Resolver} resolver 解析器类
   * @memberof Resolver
   */
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
    for (let i = 0, l = resolvers.length; i < l; i ++) {
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
