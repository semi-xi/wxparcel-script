import ip from 'ip'
import fs from 'fs-extra'
import * as path from 'path'
import portscanner from 'portscanner'
import isEmpty from 'lodash/isEmpty'
import mapValues from 'lodash/mapValues'
import * as Typings from '../typings'

/**
 * 配置管理器
 */
export default class OptionManager {
  /**
   * 空闲端口
   */
  private idlePort: number

  /**
   * 根目录
   */
  public rootDir: string

  /**
   * 运行根目录
   */
  public execDir: string

  /**
   * 原文件存放目录
   */
  public srcDir: string

  /**
   * 输出文件存放目录
   */
  public outDir: string

  /**
   * 静态文件存放目录
   */
  public staticDir: string

  /**
   * 临时文件存放目录
   */
  public tmplDir: string

  /**
   * 公共服务路径
   */
  public pubPath: string

  /**
   * node_module 存放目录
   */
  public npmDir: string

  /**
   * 运行环境
   */
  public env: string

  /**
   * 日志类型
   */
  public logType: Array<'console' | 'file'> | 'console' | 'file'

  public rules: Typings.ParcelOptionRule[]

  /**
   * 是否生成 sourceMap
   */
  public sourceMap: string | boolean

  /**
   * 使用的插件
   */
  public plugins: any[]

  /**
   * 是否为监听状态
   */
  public watching: boolean

  /**
   * 是否打包模块
   *
   * @description
   * 打包的模块根据 `libs(src)/bundler/*` 文件定义
   * 可以通过 `libs(src)/bundler` 中的 `Bundler.register` 注册
   */
  public bundle: boolean

  /**
   * 是否为安静模式
   */
  public silence: boolean

  /**
   * 微信小程序 project.config.json 文件配置
   */
  public projectConfig: Typings.WXProjectConfig

  /**
   * project.config.json 文件位置
   */
  public projectConfigFile: string

  /**
   * 小程序代码根目录
   */
  public miniprogramRoot: string

  /**
   * 小程序插件根目录
   */
  public pluginRoot: string

  /**
   * 微信小程序 app.config.json 文件配置
   */
  public appConfig: any

  /**
   * 微信小程序 app.config.json 文件
   */
  public appConfigFile: string

  constructor (options: Typings.ParcelOptions = {}) {
    this.rootDir = process.cwd()
    this.execDir = path.join(__dirname, '../')
    !isEmpty(options) && this.resolve(options)
  }

  /**
   * 解析配置并保存起来
   * @param [options={}] 配置
   */
  public async resolve (options: Typings.ParcelOptions = {}): Promise<void> {
    if (!this.idlePort) {
      this.idlePort = await portscanner.findAPortNotInUse(3000, 8000)
    }

    this.srcDir = path.join(this.rootDir, options.src || 'src')
    this.outDir = path.join(this.rootDir, options.output || 'app')
    this.staticDir = path.join(this.rootDir, options.static || 'static')
    this.tmplDir = path.join(this.rootDir, options.tmpl || '.temporary')
    this.pubPath = options.publicPath || `http://${ip.address()}:${this.idlePort}`

    if (!/https?:\/\//.test(this.pubPath)) {
      throw new TypeError(`publicPath 为 ${this.pubPath}, 微信小程序并不能访问非远程的静态资源`)
    }

    this.npmDir = options.nodeModuleDirectoryName || 'npm'
    this.env = process.env.NODE_ENV || 'development'
    this.logType = options.hasOwnProperty('logType') ? options.logType : ['console']
    this.rules = options.rules || []

    let valid = this.checkRules(this.rules)
    if (valid !== true) {
      throw new TypeError(valid)
    }

    this.sourceMap = options.hasOwnProperty('sourceMap') ? options.sourceMap : process.env.NODE_ENV === 'development'
    this.plugins = Array.isArray(options.plugins) ? options.plugins : []
    this.watching = options.hasOwnProperty('watch') ? !!options.watch : false
    this.bundle = options.hasOwnProperty('bundle') ? !!options.bundle : false
    this.silence = options.silence || process.argv.indexOf('--quiet') !== -1
    this.projectConfig = {}
    this.projectConfigFile = ''
    this.miniprogramRoot = this.srcDir
    this.pluginRoot = ''

    let wxProjConfFile = path.join(this.rootDir, './project.config.json')
    this.resolveWXProjConf(wxProjConfFile)

    this.appConfig = {}
    this.appConfigFile = ''

    let wxAppConfFile = path.join(this.miniprogramRoot, './app.json')
    this.resolveWXAppConf(wxAppConfFile)

    if (!(Array.isArray(this.appConfig.pages) && this.appConfig.pages.length > 0)) {
      throw new Error('没有找到入口页面, 请检查 app.json 中的 pages 属性')
    }
  }

  /**
   * 验证规则是否符合规范
   * @param [rules=[]] 规则集合
   * @returns 是否通过验证
   */
  public checkRules (rules: Typings.ParcelOptionRule[] = []): true | string {
    for (let i = rules.length; i--;) {
      const rule = rules[i]
      const genMessage = () => {
        let tmpRule = Object.assign({}, rule) as any
        tmpRule.test = String(tmpRule.test)
        return `please check this rule:\n${JSON.stringify({ rule: tmpRule }, null, 2)}`
      }

      if (!rule.hasOwnProperty('test')) {
        return `Option test is not provided, ${genMessage()}`
      }

      if (!(rule.test instanceof RegExp)) {
        return `Option test is not a regexp, ${genMessage()}`
      }

      if (!rule.hasOwnProperty('loaders')) {
        return `Option loaders is not provied, ${genMessage()}`
      }

      if (!Array.isArray(rule.loaders) || !rule.loaders.length) {
        return `Option loaders is not a array or empty, ${genMessage()}`
      }

      for (let i = rule.loaders.length; i--;) {
        let loader = rule.loaders[i]
        if (!loader.hasOwnProperty('use') || !loader.use) {
          return `Options use is not a provided, ${genMessage()}`
        }
      }
    }

    return true
  }

  /**
   * 解析微信 project.config.js 文件
   * @param file 文件名
   */
  public resolveWXProjConf (file: string): void {
    if (!fs.existsSync(file)) {
      let message = `File ${file} is not found, please ensure ${file} is valid.`
      throw new Error(message)
    }

    try {
      this.projectConfig = fs.readJSONSync(file)

    } catch (error) {
      let message = `File ${file} is invalid json, please check the json corrected.\n${error}`
      throw new Error(message)
    }

    let { miniprogramRoot } = this.projectConfig
    if (miniprogramRoot) {
      let app = path.basename(this.outDir)
      miniprogramRoot = miniprogramRoot.replace(app, '')

      this.miniprogramRoot = path.join(this.srcDir, miniprogramRoot)
    }

    let { pluginRoot } = this.projectConfig
    if (pluginRoot) {
      let app = path.basename(this.outDir)
      pluginRoot = pluginRoot.replace(app, '')

      this.pluginRoot = path.join(this.srcDir, pluginRoot)
    }

    this.projectConfigFile = file
  }

  /**
   * 解析微信 app.config.js 文件
   * @param file 文件名
   */
  public resolveWXAppConf (file: string): void {
    if (!fs.existsSync(file)) {
      let message = `File ${file} is not found, please ensure ${file} is valid.`
      throw new Error(message)
    }

    try {
      this.appConfig = fs.readJSONSync(file)

    } catch (error) {
      let message = `File ${file} is invalid json, please check the json corrected.\n${error}`
      throw new Error(message)
    }

    this.appConfigFile = file
  }

  /**
   * 关联配置
   *
   * @description
   * 连接配置数据源到某一对象中
   * OptionManager 中的配置信息都会赋值到
   * 目标配置上, 且数据元都是只可读
   *
   * @param [options={}] 配置
   * @returns 返回该配置
   */
  public connect <T extends object> (options: T): T & NonFunctionProperties<OptionManager> {
    const getter = mapValues(this, (_, name) => ({ get: () => this[name] }))

    options = Object.assign({}, options)
    return Object.defineProperties(options, getter)
  }

  /**
   * 销毁对象
   */
  public destory (): void {
    Array.isArray(this.rules) && this.rules.splice(0)
    Array.isArray(this.plugins) && this.plugins.splice(0)

    this.idlePort = undefined
    this.rootDir = undefined
    this.execDir = undefined
    this.srcDir = undefined
    this.outDir = undefined
    this.staticDir = undefined
    this.tmplDir = undefined
    this.npmDir = undefined
    this.env = undefined
    this.rules = undefined
    this.sourceMap = undefined
    this.plugins = undefined
    this.watching = undefined
    this.projectConfig = undefined
    this.projectConfigFile = undefined
    this.miniprogramRoot = undefined
    this.pluginRoot = undefined
    this.appConfig = undefined
    this.appConfigFile = undefined
  }
}
