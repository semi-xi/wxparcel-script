import fs from 'fs-extra'
import path from 'path'
import colors from 'colors'
import chokidar from 'chokidar'
import waterfall from 'async/waterfall'
import promisifyWaterfall from 'promise-waterfall'
import map from 'lodash/map'
import flatten from 'lodash/flatten'
import forEach from 'lodash/forEach'
import capitalize from 'lodash/capitalize'
import pathToRegexp from 'path-to-regexp'
import OptionManager from './option-manager'
import Assets, { Assets as AssetsInstance } from './assets'
import Parser from './parser'
import Printer from './printer'
import IgnoreFiles from './constants/ingore-files'
import Package from '../package.json'

const IGORE_FILES_REGEXP = IgnoreFiles.map((pattern) => pathToRegexp(pattern))
const JSON_REGEXP = /\.json$/
const JS_REGEXP = /\.js$/
const WXML_REGEXP = /\.wxml$/
const WXSS_REGEXP = /\.wxss$/

const HOOK_TYPES = {
  async: 'applyAsync',
  before: 'applyBefore',
  beforeTransform: 'applyBeforeTransform'
}

export default class Parcel {
  constructor () {
    this.running = false
    this.paddingTask = null
  }

  async run () {
    if (this.running === true) {
      Printer.warn(`WXParcel is running, you can enter ${colors.bold('Ctrl + C')} to exit.`)
      return Promise.resolve()
    }

    try {
      this.running = true
      Printer.time()

      this.hook('async')()
      await this.hook('before')()

      let instance = new AssetsInstance()
      await this.hook('beforeTransform')(instance)

      let { appConfigFile, projectConfigFile } = OptionManager
      let entries = this.findEntries()
      entries = entries.concat([appConfigFile, projectConfigFile])

      let chunks = await Parser.multiCompile(entries, OptionManager)
      chunks = instance.chunks.concat(chunks)

      let stats = await this.flush(chunks)
      stats.spendTime = Printer.timeEnd()
      this.printStats(stats)
    } catch (error) {
      Printer.error(error)
    } finally {
      this.running = false
    }
  }

  watch () {
    let { rootDir, appConfigFile, projectConfigFile } = OptionManager

    const ignoreFile = (file) => {
      return IGORE_FILES_REGEXP.findIndex((pattern) => pattern.test(file)) !== -1
    }

    const transform = async (file) => {
      try {
        this.running = true
        Printer.time()

        let instance = new AssetsInstance()
        await this.hook('beforeTransform')(instance)

        let rule = Parser.matchRule(file, OptionManager.rules)
        let chunk = Assets.exists(file) ? Assets.get(file) : Assets.add(file, { rule })
        let flowdata = await Parser.transform(file)
        let { source, dependencies } = flowdata
        chunk.update({ content: source, dependencies, rule })

        let entries = this.findEntries()
        let files = dependencies.map((item) => item.dependency)
        files = entries.concat(files)

        let chunks = await Parser.multiCompile(files)
        chunks = [chunk].concat(chunks)

        let stats = await this.flush(chunks)
        stats.spendTime = Printer.timeEnd()
        this.printStats(stats)
      } catch (error) {
        Printer.error(error)
      } finally {
        this.running = false
        this.excutePaddingTask()
      }
    }

    const handleFileChanged = (file) => {
      if (ignoreFile(file)) {
        return
      }

      let relativePath = file.replace(rootDir, '')
      let message = `File ${colors.bold(relativePath)} has been changed`

      if (appConfigFile === file) {
        Printer.info(`${message}, resolve and compile...`)

        OptionManager.resolveWXAppConf(file)
        transform(file)
        return
      }

      if (projectConfigFile === file) {
        Printer.info(`${message}, resolve and compile...`)

        OptionManager.resolveWXAppConf(file)
        transform(file)
        return
      }

      if (Assets.exists(file)) {
        Printer.info(`${message}, compile...`)
        transform(file)
        return
      }

      let entries = this.findEntries()
      if (entries.indexOf(file) !== -1) {
        Printer.info(`${message}, it's a entry-file, compile...`)
        transform(file)
        return
      }

      Printer.info(`${message}, but it's not be required, ignore...`)
    }

    const handleFileUnlink = (file) => {
      if (ignoreFile(file)) {
        return
      }

      let relativePath = file.replace(rootDir, '')
      let message = `File ${colors.bold(relativePath)} has been deleted`

      if (Assets.exists(file)) {
        Printer.warn(`${message}, it will be only delete from cache.`)
        Assets.del(file)
      }
    }

    /**
     * 监听文件变化
     * Docs: https://github.com/paulmillr/chokidar#api
     */
    let watcher = chokidar.watch(OptionManager.srcDir, {
      // 初始化不执行 add 事件
      ignoreInitial: true
    })

    watcher.on('add', handleFileChanged)
    watcher.on('change', handleFileChanged)
    watcher.on('unlink', handleFileUnlink)

    let handleProcessSigint = process.exit.bind(process)
    let handleProcessExit = function () {
      watcher && watcher.close()

      process.removeListener('exit', handleProcessExit)
      process.removeListener('SIGINT', handleProcessSigint)

      handleProcessExit = undefined
      handleProcessSigint = undefined
    }

    process.on('exit', handleProcessExit)
    process.on('SIGINT', handleProcessSigint)
  }

  flush (chunks) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return Promise.reject(new TypeError('Chunks is not a array or not be provided or be empty'))
    }

    let promises = chunks.map((chunk) => {
      let { destination, content } = chunk.flush()

      return new Promise((resolve, reject) => {
        let taskQueue = [
          fs.ensureFile.bind(fs, destination),
          fs.writeFile.bind(fs, destination, content),
          fs.stat.bind(fs, destination)
        ]

        waterfall(taskQueue, (error, stats) => {
          error
            ? reject(error)
            : resolve({ assets: destination, size: stats.size })
        })
      })
    })

    return Promise.all(promises)
  }

  /**
   * 触发钩子
   *
   * @param {Menu} type 钩子类型 ['async', 'before']
   * @return {Promise}
   */
  hook (type) {
    switch (type) {
      case 'async':
        return function () {
          let promises = []
          OptionManager.plugins.forEach((plugin) => {
            let fn = HOOK_TYPES[type]
            if (!(fn in plugin && typeof plugin[fn] === 'function')) {
              return
            }

            let options = OptionManager.connect({})
            let promise = plugin[fn](options, Printer)
            promises.push(promise)
          })

          return Promise.all(promises)
        }

      case 'before':
        return function () {
          let promises = []
          OptionManager.plugins.forEach((plugin) => {
            let fn = HOOK_TYPES[type]
            if (!(fn in plugin && typeof plugin[fn] === 'function')) {
              return
            }

            promises.push(async () => {
              await plugin[fn](OptionManager, Printer)
              return Promise.resolve()
            })
          })

          return promisifyWaterfall(promises)
        }

      case 'beforeTransform':
        return function (assets = new AssetsInstance()) {
          if (!(assets instanceof AssetsInstance)) {
            throw new TypeError('Params assets is not instanceof Assets')
          }

          let promises = []
          OptionManager.plugins.forEach((plugin) => {
            let fn = HOOK_TYPES[type]
            if (!(fn in plugin && typeof plugin[fn] === 'function')) {
              return
            }

            promises.push(async () => {
              let options = OptionManager.connect({})
              await plugin[fn](assets, options, Printer)

              assets.size > 0 && Assets.chunks.push(...assets.chunks)
              return Promise.resolve()
            })
          })

          return promisifyWaterfall(promises)
        }
    }
  }

  excutePaddingTask () {
    if (typeof this.paddingTask === 'function') {
      this.paddingTask()
      this.paddingTask = undefined
    }
  }

  findEntries () {
    let pages = this.findAllPages()
    let components = pages.map(({ files }) => {
      let file = files.find((file) => JSON_REGEXP.test(file))
      return this.findAllComponents(file)
    })

    components = flatten(components)

    let entries = [].concat(pages, components)
    let files = entries.map((entry) => entry.files)

    return flatten(files)
  }

  findAllPages () {
    let pages = OptionManager.appConfig.pages || []

    pages = pages.map((page) => {
      page = path.join(OptionManager.srcDir, page)

      let folder = path.dirname(page)
      if (!fs.existsSync(folder)) {
        throw new Error(`查找不到文件夹 ${folder}`)
      }

      let name = path.basename(page)
      return this.findModule(name, folder)
    })

    return pages
  }

  findAllComponents (file) {
    if (!fs.existsSync(file)) {
      throw new Error(`File ${file} is not found or not be provided`)
    }

    let relativePath = path.dirname(file)
    let config = fs.readJSONSync(file)
    let components = []

    forEach(config.usingComponents, (component) => {
      let folder = path.dirname(component)
      folder = this.resolveRelativePath(folder, [relativePath, OptionManager.srcDir])
      if (!folder) {
        return
      }

      let name = path.basename(component)
      components.push(this.findModule(name, folder))
    })

    return components
  }

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

      if (Array.isArray(OptionManager.rules)) {
        let index = OptionManager.rules.findIndex((rule) => rule.test.test(file))
        if (index !== -1) {
          return true
        }
      }
    })

    files = files.map((file) => path.join(folder, file))
    return { name, dir: folder, files }
  }

  resolveRelativePath (file, paths) {
    if (!Array.isArray(paths) || paths.length === 0) {
      throw new Error('Paths is not a array or not be provided')
    }

    for (let i = paths.length; i--;) {
      let dir = paths[i]
      let target = path.join(dir, file)

      if (fs.existsSync(target)) {
        return target
      }
    }

    return false
  }

  printStats (stats, watching = OptionManager.watching) {
    let { rootDir, srcDir } = OptionManager

    let statsFormatter = stats.map(({ assets, size }) => {
      assets = assets.replace(rootDir, '.')
      return { assets, size }
    })

    let warning = map(stats.conflict, (dependency, file) => {
      file = file.replace(rootDir, '')
      dependency = dependency.replace(rootDir, '')
      return `-> ${file} ${colors.gray('reqiured')} ${dependency}`
    })

    Printer.push('')
    Printer.push(`${capitalize(Package.name).replace(/-(\w)/g, (_, $1) => $1.toUpperCase())} Version at ${colors.cyan.bold(Package.version)}`)
    Printer.push(`${colors.gray('Time:')} ${colors.bold(colors.white(stats.spendTime))}ms\n`)
    Printer.push(Printer.formatStats(statsFormatter))
    Printer.push('')

    watching && Printer.push(`✨ Open your ${colors.magenta.bold('WeChat Develop Tool')} to serve`)
    watching && Printer.push(`✨ Watching folder ${colors.white.bold(srcDir)}, cancel at ${colors.white.bold('Ctrl + C')}`)
    Printer.push('')

    if (warning.length > 0) {
      Printer.push(colors.yellow.bold('Some below files required each other, it maybe occur circular reference error in WeChat Mini Program'))
      Printer.push(warning.join('\n'))
      Printer.push('')
    }

    Printer.flush()
  }
}
