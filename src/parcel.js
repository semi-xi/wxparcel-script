import fs from 'fs-extra'
import path from 'path'
import filter from 'lodash/filter'
import colors from 'colors'
import chokidar from 'chokidar'
import waterfall from 'async/waterfall'
import promisifyWaterfall from 'promise-waterfall'
import minimatch from 'minimatch'
import map from 'lodash/map'
import capitalize from 'lodash/capitalize'
import OptionManager from './option-manager'
import Assets, { Assets as AssetsInstance } from './assets'
import JSONResolver from './resolver/json-resolver'
import Parser from './parser'
import Packager from './packager'
import Printer from './printer'
import IgnoreFiles from './constants/ingore-files'
import Package from '../package.json'
import HOOK_TYPES from './constants/hooks'

/**
 * Parcel
 * 构建工具入口
 *
 * @export
 * @class Parcel
 */
export default class Parcel {
  /**
   * Creates an instance of Parcel.
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
     * 是否在运行
     *
     * @type {Boolean}
     */
    this.running = false

    /**
     * 阻塞的任务队列
     *
     * @type {Array}
     */
    this.paddingTask = null
  }

  /**
   * 运行
   *
   * @return {Promise}
   */
  async run () {
    if (this.running === true) {
      Printer.warn(`WXParcel is running, you can enter ${colors.bold('Ctrl + C')} to exit.`)
      return Promise.resolve()
    }

    try {
      this.running = true
      const timer = Printer.timer()

      this.hook('async')()
      await this.hook('before')()

      let instance = new AssetsInstance()
      await this.hook('beforeTransform')(instance)

      let { rootDir, srcDir } = this.options
      let resolver = new JSONResolver()
      let module = resolver.findModule('app', srcDir)
      let entries = module.files
      let projectConfigFile = path.join(rootDir, './project.config.json')
      if (!fs.existsSync(projectConfigFile)) {
        throw new Error(`${projectConfigFile} is not provided`)
      }

      entries.unshift(projectConfigFile)
      
      let chunks = await Parser.multiCompile(entries)
      let bundles = await Packager.bundle(chunks)
      
      let stats = await this.flush(bundles)
      stats.spendTime = timer.end()

      this.printStats(stats)
    } catch (error) {
      Printer.error(error)
    } finally {
      this.running = false
    }
  }

  /**
   * 监听文件
   *
   */
  watch () {
    let { rootDir, appConfigFile } = this.options

    const ignoreFile = (file) => {
      return IgnoreFiles.findIndex((pattern) => minimatch(file, pattern)) !== -1
    }

    const transform = async (file) => {
      try {
        this.running = true
        const timer = Printer.timer()

        let instance = new AssetsInstance()
        await this.hook('beforeTransform')(instance)

        let rule = Parser.matchRule(file, this.options.rules)
        let chunk = Assets.exists(file) ? Assets.get(file) : Assets.add(file, { rule })
        let flowdata = await Parser.convert(file)
        let { source, dependencies } = flowdata
        chunk.update({ content: source, dependencies, rule })

        let files = dependencies.map((item) => item.dependency)
        let chunks = await Parser.multiCompile(files)
        
        let { regexp, packager: MatchedPackager } = Packager.matchPackager(chunk.destination) || {}
        if (MatchedPackager) {
          chunks = filter(Assets.chunks, ({ destination }) => regexp.test(destination))

          const packager = new MatchedPackager(chunks)
          chunks = packager.bundle()
        } else {
          chunks = [chunk].concat(chunks)
        }

        chunks = [].concat(chunks, instance.chunks)
        let stats = await this.flush(chunks)

        stats.spendTime = timer.end()
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

        this.options.resolveWXAppConf(file)
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
    let watcher = chokidar.watch(this.options.srcDir, {
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
      watcher = undefined
    }

    process.on('exit', handleProcessExit)
    process.on('SIGINT', handleProcessSigint)
  }

  /**
   * 释放/保存文件
   *
   * @param {Array} chunks Chunk 集合
   * @return {Promise}
   */
  flush (chunks) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return Promise.reject(new TypeError('Chunks is not a array or not be provided or be empty'))
    }

    let promises = chunks.map((chunk) => {
      let { destination, content } = chunk.flush()

      return new Promise((resolve, reject) => {
        let taskQueue = [
          fs.ensureFile.bind(fs, destination),
          fs.writeFile.bind(fs, destination, stripBOM(content), 'utf8'),
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
        return () => {
          let promises = []
          this.options.plugins.forEach((plugin) => {
            let fn = HOOK_TYPES[type]
            if (!(fn in plugin && typeof plugin[fn] === 'function')) {
              return
            }

            let options = this.options.connect({})
            let promise = plugin[fn](options, Printer)
            promises.push(promise)
          })

          return Promise.all(promises)
        }

      case 'before':
        return () => {
          let promises = []
          this.options.plugins.forEach((plugin) => {
            let fn = HOOK_TYPES[type]
            if (!(fn in plugin && typeof plugin[fn] === 'function')) {
              return
            }

            promises.push(async () => {
              await plugin[fn](this.options, Printer)
              return Promise.resolve()
            })
          })

          if (promises.length > 0) {
            return promisifyWaterfall(promises)
          }

          return Promise.resolve()
        }

      case 'beforeTransform':
        return (assets = new AssetsInstance()) => {
          if (!(assets instanceof AssetsInstance)) {
            throw new TypeError('Params assets is not instanceof Assets')
          }

          let promises = []
          this.options.plugins.forEach((plugin) => {
            let fn = HOOK_TYPES[type]
            if (!(fn in plugin && typeof plugin[fn] === 'function')) {
              return
            }

            promises.push(async () => {
              let options = this.options.connect({})
              await plugin[fn](assets, options, Printer)

              assets.size > 0 && Assets.chunks.push(...assets.chunks)
              return Promise.resolve()
            })
          })

          if (promises.length > 0) {
            return promisifyWaterfall(promises)
          }

          return Promise.resolve()
        }
    }
  }

  /**
   * 执行 padding 中的任务
   *
   */
  excutePaddingTask () {
    if (typeof this.paddingTask === 'function') {
      this.paddingTask()
      this.paddingTask = undefined
    }
  }

  /**
   * 查找入口
   * 微信入口都是通过 `app.config.json` 文件配置,
   * 因此可以通过读取该文件找到对应的入口文件
   *
   * @return {Array} 文件集合
   */
  findEntries () {
    let { appConfig, appConfigFile } = this.options
    let resolver = new JSONResolver(appConfig, appConfigFile)
    let chunk = resolver.resolve(appConfig, appConfigFile)
    let files = chunk.dependencies.map((item) => item.dependency)
    return [chunk.file].concat(files)
  }

  /**
   * 打印 stats
   *
   * @param {Object} stats 状态
   * @param {Boolean} [watching=this.options.watching] 是否在监听
   */
  printStats (stats, watching = this.options.watching) {
    let { rootDir, srcDir } = this.options

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

/**
 * strip utf-8 with BOM
 *
 * some editor or nodeJS in windows will prepend
 * 0xFEFF to the code it will change to utf8 BOM
 *
 * @param {String|Buffer} content
 * @return {String|Buffer}
 */
function stripBOM (content) {
  if (Buffer.isBuffer(content)) {
    if (content[0] === 0xEF && content[1] === 0xBB && content[2] === 0xBF) {
      return content.slice(3)
    }

    return content
  }

  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1)
  }

  return content
}
