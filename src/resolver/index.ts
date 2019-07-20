import path from 'path'
import minimatch from 'minimatch'
import BaseResolver from './resolver'
import JSONResolver from './json-resolver'
import JSResolver from './js-resolver'
import WXSResolver from './wxs-resolver'
import WXMLResolver from './wxml-resolver'
import WXSSResolver from './wxss-resolver'
import OptionManager from '../libs/OptionManager'
import Chunk from '../libs/Chunk'

/**
 * 解析器
 * @description 通过注册的解析器解析各种文件, 并修改其中内容或者
 */
export default class Resolver {
  /**
   * 配置管理器
   */
  public options: OptionManager

  /**
   * 解析器集合
   */
  public resolvers: Array<{ regexp: RegExp, resolver: { new(asset: Chunk['metadata'], options: OptionManager): BaseResolver } }>

  constructor (options: OptionManager) {
    this.options = options
    this.resolvers = []

    /**
     * 这里的正则匹配为结果文件的后缀
     */
    this.register(/\.json$/, JSONResolver)
    this.register(/\.js$/, JSResolver)
    this.register(/\.wxs$/, WXSResolver)
    this.register(/\.wxss$/, WXSSResolver)
    this.register(/\.wxml$/, WXMLResolver)
  }

  /**
   * 注册解析器
   * @param regexp 匹配正则
   * @param resolver 解析器类
   */
  public register (regexp: RegExp, resolver: any) {
    if (typeof resolver === 'string') {
      resolver = require(resolver)
    }

    this.resolvers.push({ regexp, resolver })
  }

  /**
   * 解析文件
   * @param asset 资源对象
   * @param options 配置
   * @returns 新的 Chunk 信息
   */
  public resolve (asset: Chunk['metadata'], options: OptionManager = this.options) {
    const { file, content, rule } = asset
    const extname = rule.extname || '.' + path.extname(file)

    /**
     * 过滤不需要编译的文件
     * 顾虑文件实用 minimatch, 具体参考: https://github.com/isaacs/minimatch
     *
     * 例如: 不编译 JS 文件
     * exclude: ['./**\/*.js']
     */
    let exclude = rule.exclude || []
    for (let i = exclude.length; i--;) {
      let pattern = exclude[i]
      if (pattern instanceof RegExp) {
        if (pattern.test(file)) {
          return { file, content, dependencies: [] }
        }
      } else {
        pattern = path.join(options.rootDir, pattern)

        if (minimatch(file, pattern)) {
          return { file, content, dependencies: [] }
        }
      }
    }

    let resolvers = this.resolvers || []
    for (let i = 0; i < resolvers.length; i++) {
      let { regexp, resolver: Resolver } = resolvers[i]

      if (regexp.test(extname)) {
        let resolver = new Resolver(asset, options)
        return resolver.resolve()
      }
    }

    return { file, content, dependencies: [] }
  }
}
