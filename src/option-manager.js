import ip from 'ip'
import fs from 'fs-extra'
import path from 'path'
import isEmpty from 'lodash/isEmpty'
import chokidar from 'chokidar'
import Printer from './printer'
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
    this.silence = options.silence || -1 !== process.argv.indexOf('--quiet')
    this.projectConfig = {}
    this.appConfig = {}

    if (!/https?:\/\//.test(this.pubPath)) {
      throw new TypeError(`publicPath 为 ${this.pubPath}, 微信小程序并不能访问非远程的静态资源`)
    }

    let handleFileChange = (file) => {
      let { projectConfigFile, appConfigFile } = this

      switch (file) {
        case appConfigFile:
          this.resolveWXAppConf(file)
          return

        case projectConfigFile:
          this.resolveWXProjectConf(file)
          return
      }
    }

    let handleFileUnlink = (file) => {
      Printer.warn(`文件 ${file} 已删除, wxparcel 将使用缓存中的配置继续执行; 添加文件将读取新的配置文件`)
    }

    this.watcher = chokidar.watch()
    this.watcher.on('change', handleFileChange)
    this.watcher.on('unlink', handleFileUnlink)

    let handleProcessSigint = process.exit.bind(process)
    let handleProcessExit = () => {
      this.watcher && this.watcher.close()

      process.removeListener('exit', handleProcessExit)
      process.removeListener('SIGINT', handleProcessSigint)

      handleProcessExit = undefined
      handleProcessSigint = undefined

      this.watcher = undefined
    }

    process.on('exit', handleProcessExit)
    process.on('SIGINT', handleProcessSigint)

    let wxConfFile = path.join(this.srcDir, './project.config.json')
    this.resolveWXProjectConf(wxConfFile)

    let wxAppConfFile = path.join(this.srcDir, './app.json')
    this.resolveWXAppConf(wxAppConfFile)

    if (!(Array.isArray(this.appConfig.pages) && this.appConfig.pages.length > 0)) {
      throw new Error('没有找到入口页面, 请检查 app.json 中的 pages 属性')
    }
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

    if (this.watcher) {
      this.watcher.unwatch(this.projectConfigFile)
      this.watcher.add(file)
    }

    this.projectConfigFile = file
    this.emitter.emit('projectConfigFileChanged', {
      file: file,
      config: this.projectConfig
    })
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

  watchAppConfigChanged (callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('回调函数不存在或并没有提供')
    }

    this.emitter.addListener('appConfigFileChanged', callback)
    return this
  }

  watchProjectConfigChanged (callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('回调函数不存在或并没有提供')
    }

    this.emitter.addListener('projectConfigFileChanged', callback)
    return this
  }
}

export default new OptionManager()
