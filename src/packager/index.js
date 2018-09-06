import JSPackager from './js-packager'

export class Packager {
  /**
   * Creates an instance of Packager.
   * @param {OptionManager} [options=OptionManager] 配置管理器
   */
  constructor (options = OptionManager) {
    /**
     * 配置管理器
     *
     * @type {OptionManager}
     */
    this.options = options

    /**
     * 打包器集合
     *
     * @type {Array}
     */
    this.packagers = []

    /**
     * 这里的正则匹配为结果文件的后缀
     */
    this.register(/\.js$/, JSPackager)
  }

  /**
   * 注册打包器
   *
   * @param {RegExp} regexp 匹配正则
   * @param {Packager} packager 解析器类
   */
  register (regexp, packager) {
    if (typeof packager === 'string') {
      packager = require(packager)
    }

    this.packagers.push({ regexp, packager })
  }
}

export default new Packager()
