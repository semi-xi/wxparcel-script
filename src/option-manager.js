import ip from 'ip'
import fs from 'fs-extra'
import path from 'path'
import isEmpty from 'lodash/isEmpty'
import mapValues from 'lodash/mapValues'
import { EventEmitter } from 'events'

export class OptionManager {
  constructor (options = {}) {
    this.emitter = new EventEmitter()
    this.rootDir = process.cwd()
    this.execDir = path.join(__dirname, '../')

    !isEmpty(options) && this.resolve(options)
  }

  resolve (options = {}) {
    this.srcDir = path.join(this.rootDir, options.src || 'src')
    this.outDir = path.join(this.rootDir, options.output || 'app')
    this.staticDir = path.join(this.rootDir, options.static || 'static')
    this.tmplDir = path.join(this.rootDir, options.tmpl || '.temporary')
    this.pubPath = options.publicPath || `http://${ip.address()}:3000`
    this.npmDir = options.nodeModuleDirectoryName || 'npm'
    this.rules = options.rules || []
    this.plugins = options.plugins || []
    this.watching = options.watch || false
    this.silence = options.silence || process.argv.indexOf('--quiet') !== -1
    this.projectConfig = {}
    this.appConfig = {}

    if (!/https?:\/\//.test(this.pubPath)) {
      throw new TypeError(`publicPath 为 ${this.pubPath}, 微信小程序并不能访问非远程的静态资源`)
    }

    let valid = this.checkRules(this.rules)
    if (valid !== true) {
      throw new TypeError(valid)
    }

    let wxConfFile = path.join(this.srcDir, './project.config.json')
    this.resolveWXProjectConf(wxConfFile)

    let wxAppConfFile = path.join(this.srcDir, './app.json')
    this.resolveWXAppConf(wxAppConfFile)

    if (!(Array.isArray(this.appConfig.pages) && this.appConfig.pages.length > 0)) {
      throw new Error('没有找到入口页面, 请检查 app.json 中的 pages 属性')
    }
  }

  checkRules (rules = []) {
    for (let i = rules.length; i--;) {
      let rule = rules[i]
      let mkTips = () => {
        let tmpRule = Object.assign({}, rule)
        tmpRule.test = String(tmpRule.test)
        return `please check this rule:\n${JSON.stringify({ rule: tmpRule }, null, 2)}`
      }

      if (!rule.hasOwnProperty('test') || !rule.test) {
        return `Option test is not provided, ${mkTips()}`
      }

      if (!(rule.test instanceof RegExp)) {
        return `Option test is not a regexp, ${mkTips()}`
      }

      if (!rule.hasOwnProperty('loaders') || !rule.loaders) {
        return `Option loaders is not provied, ${mkTips()}`
      }

      if (!Array.isArray(rule.loaders)) {
        return `Option loaders is not a array, ${mkTips()}`
      }

      for (let i = rule.loaders.length; i--;) {
        let loader = rule.loaders[i]
        if (!loader.hasOwnProperty('use') || !loader.use) {
          return `Options use is not a provided, ${mkTips()}`
        }
      }
    }

    return true
  }

  resolveWXProjectConf (file) {
    if (!fs.existsSync(file)) {
      throw new Error(`找不到微信小程序项目配置文件, 请检查文件 ${file}`)
    }

    try {
      this.projectConfig = fs.readJSONSync(file)
    } catch (error) {
      throw new Error(`微信小程序项目配置文件错误, 请检查配置文件 ${file};\n错误信息: ${error.message}`)
    }

    this.projectConfigFile = file
  }

  resolveWXAppConf (file) {
    if (!fs.existsSync(file)) {
      throw new Error(`找不到微信小程序项目入口配置文件, 请检查配置文件 ${file}`)
    }

    try {
      this.appConfig = fs.readJSONSync(file)
    } catch (error) {
      throw new Error(`微信小程序项目入口配置文件错误, 请检查配置文件 ${file};\n错误信息: ${error.message}`)
    }

    if (this.watcher) {
      this.watcher.unwatch(this.appConfigFile)
      this.watcher.add(file)
    }

    this.appConfigFile = file
    this.emitter.emit('appConfigFileChanged', {
      file: file,
      config: this.appConfig
    })
  }

  connect (options = {}) {
    let getter = mapValues(this, (_, name) => ({
      get: () => this[name]
    }))

    options = Object.assign({}, options)
    return Object.defineProperties(options, getter)
  }
}

export default new OptionManager()
