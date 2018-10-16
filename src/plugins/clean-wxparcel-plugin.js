import fs from 'fs-extra'
import template from 'lodash/template'
import defaultsDeep from 'lodash/defaultsDeep'

const remove = fs.remove.bind(fs)

/**
 * 清除插件
 *
 * @export
 * @class CleanPlugin
 */
export default class CleanPlugin {
  /**
   * Creates an instance of CleanPlugin.
   * @param {Object} [options={}] 配置
   */
  constructor (options = {}) {
    /**
     * 配置管理器
     *
     * @type {OptionManager}
     */
    this.options = options || {}
  }

  /**
   * 编译器运行
   *
   * @param {Object} options 配置
   * @param {Array} options.alisas 别名文件, 例如 srcDir, rootDir, outDir 可以通过 OptionManager 获取到
   */
  async applyBefore (options) {
    options = defaultsDeep(options, this.options)

    let alisas = options.alisas || []
    let files = []

    alisas.forEach((alisa) => {
      let renderer = template(`<%= ${alisa} %>`)
      let file = renderer(options)
      file && files.push(file)
    })

    let tasks = files.map((file) => remove(file))
    await Promise.all(tasks)
  }
}
