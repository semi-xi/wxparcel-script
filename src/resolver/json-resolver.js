import fs from 'fs-extra'
import path from 'path'
import get from 'lodash/get'
import uniq from 'lodash/uniq'
import flatten from 'lodash/flatten'
import forEach from 'lodash/forEach'
import isPlainObject from 'lodash/isPlainObject'
import { Resolver } from './resolver'

const JSON_REGEXP = /\.json$/
const JS_REGEXP = /\.js$/
const WXML_REGEXP = /\.wxml$/
const WXSS_REGEXP = /\.wxss$/

/**
 * JSON 解析器
 *
 * @export
 * @class JSONResolver
 * @extends {Resolver}
 */
export default class JSONResolver extends Resolver {
  /**
   * 解析, 并返回文件,代码,依赖等信息
   *
   * @return {Object} 包括文件, 代码, 依赖
   */
  resolve () {
    let config = {}

    if (isPlainObject(this.source)) {
      config = this.source
    } else {
      try {
        let source = this.source.toString()
        config = JSON.parse(source)
      } catch (error) {
        throw new Error(`File ${this.file} is invalid json, please check the json corrected.\n${error}`)
      }
    }

    /**
     * 小程序页面配置关键属性
     * docs: https://developers.weixin.qq.com/miniprogram/dev/framework/config.html#%E5%85%A8%E5%B1%80%E9%85%8D%E7%BD%AE
     */
    let pages = config.pages || []

    /**
     * 微信小程序分包加载配置关键属性
     * docs: https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages.html
     */
    let subPackages = config.subPackages || []
    let usingComponents = config.usingComponents || {}

    /**
     * 微信小程序插件配置关键属性
     * docs: https://developers.weixin.qq.com/miniprogram/dev/framework/plugin/development.html
     */
    let publicComponents = config.publicComponents || {}
    let tabs = get(config, 'tabBar.list', [])

    let subPages = subPackages.map((item) => item.pages || [])
    subPages = flatten(subPages)
    pages = pages.concat(subPages)

    let pageModules = this.resolvePages(pages)
    let usingComponentModules = this.resolveComponents(usingComponents)
    let publicComponentModules = this.resolveComponents(publicComponents)
    let tabImageFiles = this.resolveTabs(tabs)
    let confDependedFiles = this.resolveProjectConf(config)

    let files = pageModules.concat(usingComponentModules, publicComponentModules).map((item) => item.files)
    files = flatten(files)
    files = uniq(files).concat(tabImageFiles, confDependedFiles)

    let dependencies = files.map((dependency) => {
      let destination = this.convertDestination(dependency, this.options)
      return { file: this.file, dependency, destination, required: '' }
    })

    config = this.convertProjectConf(config)

    let source = JSON.stringify(config, null, 2)
    this.source = Buffer.from(source)

    return { file: this.file, source: this.source, dependencies }
  }

  /**
   * 解析项目配置
   *
   * @param {Object} [config={}] 配置
   * @return {Object} 配置
   */
  convertProjectConf (config = {}) {
    const { outDir } = this.options
    let name = path.basename(outDir)

    if (config.hasOwnProperty('miniprogramRoot')) {
      let folder = config.miniprogramRoot.replace(name, '')
      config.miniprogramRoot = path.join('.', folder).replace(/[\\/]+/g, '/')
    }

    if (config.hasOwnProperty('pluginRoot')) {
      let folder = config.pluginRoot.replace(name, '')
      config.pluginRoot = path.join('.', folder).replace(/[\\/]+/g, '/')
    }

    return config
  }

  resolveProjectConf (config) {
    const { srcDir } = this.options

    let files = []
    if (config.hasOwnProperty('pluginRoot')) {
      const { pluginRoot } = config
      const file = path.join(srcDir, pluginRoot, 'plugin.json')
      fs.existsSync(file) && files.push(file)
    }

    if (config.hasOwnProperty('main')) {
      const { projectConfig } = this.options
      if (projectConfig.hasOwnProperty('pluginRoot')) {
        const { pluginRoot } = projectConfig
        const file = path.join(srcDir, pluginRoot, config.main)
        fs.existsSync(file) && files.push(file)
      }
    }

    return files
  }

  /**
   * 解析页面配置
   *
   * @param {Object} [config={}] 配置
   * @return {Array} 页面集合
   */
  resolvePages (pages) {
    return pages.map((page) => {
      page = path.join(this.options.srcDir, page)

      let folder = path.dirname(page)
      if (!fs.existsSync(folder)) {
        throw new Error(`查找不到文件夹 ${folder}`)
      }

      let name = path.basename(page)
      return this.findModule(name, folder)
    })
  }

  /**
   * 解析组件配置
   *
   * @param {Object} [config={}] 配置
   * @return {Array} 组件集合
   */
  resolveComponents (components) {
    let relativePath = path.dirname(this.file)
    let outputs = []

    forEach(components, (component) => {
      let realtiveFolder = path.dirname(component)
      let folder = this.convertRelative(realtiveFolder, [relativePath, this.options.srcDir])

      if (folder) {
        let name = path.basename(component)
        outputs.push(this.findModule(name, folder))
      }
    })

    return outputs
  }

  /**
   * 解析配置需要的图片
   *
   * @param {Object} [config={}] 配置
   * @return {Array} 图片集合
   */
  resolveTabs (tabs) {
    let images = []
    let basePath = path.dirname(this.file)

    tabs.forEach(({ iconPath, selectedIconPath }) => {
      if (iconPath) {
        iconPath = path.join(basePath, iconPath)
        images.indexOf(iconPath) === -1 && images.push(iconPath)
      }

      if (selectedIconPath) {
        selectedIconPath = path.join(basePath, selectedIconPath)
        images.indexOf(selectedIconPath) === -1 && images.push(selectedIconPath)
      }
    })

    return images
  }

  /**
   * 转换相对路径, 用于查找文件是否存在
   * 通过传入路径 paths, 查找相对路径的 file
   * 在某一路径是否存在, 存在返回路径地址, 不存在返回  false
   *
   * @param {String} file 文件路径
   * @param {Array} paths 路径集合
   * @return {String|Boolean} 路径地址或 false
   */
  convertRelative (file, paths) {
    if (!Array.isArray(paths) || paths.length === 0) {
      throw new Error('Paths is not a array or not be provided')
    }

    for (let i = 0, l = paths.length; i < l; i++) {
      let dir = paths[i]
      let target = path.join(dir, file)

      if (fs.existsSync(target)) {
        return target
      }
    }

    return false
  }

  /**
   * 查找模块
   * 这里的模块是指 微信小程序 指定的 page, component 等
   * 拥有相对规范的一个组合; 通过此方法可以查找到配置对应的
   * Page, component 的路径与所包含对应的文件集合
   *
   * @param {String} name 模块名称
   * @param {String} folder 路径
   * @return {Options} 包括模块名称,模块路径,模块所包含符合要求的文件
   */
  findModule (name, folder) {
    if (!folder) {
      throw new TypeError('Folder is not provided')
    }

    if (!fs.statSync(folder).isDirectory()) {
      throw new Error(`Folder ${folder} is not found or not a folder`)
    }

    let files = fs.readdirSync(folder)
    let regexp = new RegExp(name)

    files = files.filter((file) => {
      if (!regexp.test(path.basename(file))) {
        return false
      }

      let tester = [JSON_REGEXP, JS_REGEXP, WXML_REGEXP, WXSS_REGEXP]
      let index = tester.findIndex((regexp) => regexp.test(file))
      if (index !== -1) {
        return true
      }

      let { rules } = this.options
      if (Array.isArray(rules)) {
        let index = rules.findIndex((rule) => rule.test.test(file))
        if (index !== -1) {
          return true
        }
      }
    })

    files = files.map((file) => path.join(folder, file))
    return { name, dir: folder, files }
  }
}
