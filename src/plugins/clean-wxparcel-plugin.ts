import fs from 'fs-extra'
import template from 'lodash/template'
import defaultsDeep from 'lodash/defaultsDeep'
import OptionManager from '../libs/OptionManager'
import * as Typings from '../typings'

const remove = fs.remove.bind(fs)

export interface CleanPluginOptions {
  /**
   * 别名
   */
  alisas?: string[]
}

/**
 * 清除插件
 */
export default class CleanPlugin implements Typings.ParcelPlugin {
  /**
   * 配置
   */
  public options: CleanPluginOptions

  constructor (options: any) {
    this.options = defaultsDeep({}, options)
  }

  /**
   * 编译器运行
   * @param options 配置
   * @param options.alisas 别名文件, 例如 srcDir, rootDir, outDir 可以通过 OptionManager 获取到
   */
  public async applyBefore (options: OptionManager) {
    let conf: CleanPluginOptions & OptionManager = defaultsDeep({}, options, this.options)
    let alisas = conf.alisas || []
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
