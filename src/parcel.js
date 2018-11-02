import fs from 'fs-extra'
import path from 'path'
import flattenDeep from 'lodash/flattenDeep'
import chokidar from 'chokidar'
import waterfall from 'async/waterfall'
import promisifyWaterfall from 'promise-waterfall'
import minimatch from 'minimatch'
import OptionManager from './option-manager'
import Assets, { Assets as AssetsInstance } from './assets'
import { BUNDLER, SCATTER } from './constants/chunk-type'
import JSONResolver from './resolver/json-resolver'
import Parser from './parser'
import Bundler from './bundler'
import Logger from './logger'
import IgnoreFiles from './constants/ingore-files'
import HOOK_TYPES from './constants/hooks'
import { readFileAsync } from './share'

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
      return Promise.reject(new Error('WXParcel is running'))
    }

    try {
      let startTime = Date.now()
      this.running = true

      this.hook('async')()
      await this.hook('before')()

      let instance = new AssetsInstance()
      await this.hook('beforeTransform')(instance)

      let { rootDir } = this.options
      let entries = this.findEntries()

      let projectConfigFile = path.join(rootDir, './project.config.json')
      if (!fs.existsSync(projectConfigFile)) {
        throw new Error(`${projectConfigFile} is not provided`)
      }

      entries.unshift(projectConfigFile)

      let chunks = await Parser.multiCompile(entries)
      let bundles = await Bundler.bundle(chunks)
      let stats = await this.flush(bundles)
      stats.spendTime = Date.now() - startTime

      return stats
    } catch (error) {
      Logger.error(error)
    } finally {
      this.running = false
    }
  }

  /**
   * 监听文件
   *
   */
  watch (options = {}) {
    const { appConfigFile } = this.options

    // 判断是否为被忽略文件
    const ignoreFile = (file) => {
      return IgnoreFiles.findIndex((pattern) => minimatch(file, pattern)) !== -1
    }

    // 编译并输出文件
    const transform = async (files) => {
      files = Array.isArray(files) ? files : [files]

      let chunks = await Parser.multiCompile(files)
      return flattenDeep(chunks)
    }

    // 开始执行
    const run = async (file, involvedFiles = []) => {
      try {
        let startTime = Date.now()
        this.running = true

        let instance = new AssetsInstance()
        await this.hook('beforeTransform')(instance)

        if (Assets.exists(file)) {
          let chunk = Assets.get(file)
          let source = await readFileAsync(chunk.file)
          chunk.update({ content: source })
        }

        let chunks = await transform(involvedFiles.length > 0 ? involvedFiles : file)
        chunks = [].concat(chunks, instance.chunks)

        let bundles = await Bundler.bundle(chunks)
        let stats = await this.flush(bundles)

        stats.spendTime = Date.now() - startTime

        typeof options.complete === 'function' && options.complete(stats)
      } catch (error) {
        Logger.error(error)
      } finally {
        this.running = false
        this.excutePaddingTask()
      }
    }

    let handleFileChanged = (file) => {
      /**
       * 判断变更的文件是否被忽略,
       * 若被忽略则直接退出
       */
      if (ignoreFile(file)) {
        return
      }

      /**
       * 判断文件是否为入口配置文件
       * 若为入口配置文件则直接重新解析即可
       */
      if (appConfigFile === file) {
        typeof options.change === 'function' && options.change(file, true)

        this.options.resolveWXAppConf(file)
        run(file)
        return
      }

      /**
       * 判断变更的文件是否本来就在 assets 列表中
       * 如果是则直接重新编译该文件即可
       */
      if (Assets.exists(file)) {
        typeof options.change === 'function' && options.change(file, true)
        run(file)
        return
      }

      /**
       * 查找该文件是否为被依赖文件, 若该文件被依赖, 则找出
       * 依赖该文件的 chunks, 将它们的文件进行重新编译
       */
      let chunks = Assets.findChunkByDependent(file)
      if (chunks.length) {
        let involvedFiles = chunks.map((chunk) => chunk.file)
        run(file, involvedFiles)
        return
      }

      typeof options.change === 'function' && options.change(file, false)
    }

    let handleFileUnlink = (file) => {
      /**
       * 判断变更的文件是否被忽略,
       * 若被忽略则直接退出
       */
      if (ignoreFile(file)) {
        return
      }

      /**
       * 判断文件是否存在与 assets 中
       * 若存在则删除对应的 chunk
       */
      if (Assets.exists(file)) {
        typeof options.unlink === 'function' && options.unlink(file, false)
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

    /**
     * 处理各种 kill 程序情况
     * 若程序被 kill 则监听的子程序也被关闭
     */
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
    const { sourceMap: useSourceMap } = this.options
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return Promise.reject(new TypeError('Chunks is not a array or not be provided or be empty'))
    }

    let promises = chunks.map((chunk) => {
      let { destination, content, sourceMap } = chunk.flush()
      if (!destination) {
        return Promise.resolve()
      }

      content = stripBOM(content)

      /**
       * 只有打包文件(BUNDLER) 与 独立文件(SCATTER) 才需要 sourceMap
       */
      if (useSourceMap !== false && (chunk.type === BUNDLER || chunk.type === SCATTER) && sourceMap) {
        sourceMap = JSON.stringify(sourceMap)

        let base64SourceMap = '//# sourceMappingURL=data:application/json;base64,' + Buffer.from(sourceMap).toString('base64')
        content = content + '\n' + base64SourceMap
      }

      return new Promise((resolve, reject) => {
        let taskQueue = [
          fs.ensureFile.bind(fs, destination),
          fs.writeFile.bind(fs, destination, content, 'utf8')
        ]

        waterfall(taskQueue, (error) => {
          if (error) {
            reject(error)
            return
          }

          resolve({ assets: destination, size: content.length })
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
      case 'async': {
        return () => {
          let promises = []
          this.options.plugins.forEach((plugin) => {
            let fn = HOOK_TYPES[type]
            if (!(fn in plugin && typeof plugin[fn] === 'function')) {
              return
            }

            let options = this.options.connect({})
            let promise = plugin[fn](options)
            promises.push(promise)
          })

          return Promise.all(promises)
        }
      }

      case 'before': {
        return () => {
          let promises = []
          this.options.plugins.forEach((plugin) => {
            let fn = HOOK_TYPES[type]
            if (!(fn in plugin && typeof plugin[fn] === 'function')) {
              return
            }

            promises.push(async () => {
              await plugin[fn](this.options)
              return Promise.resolve()
            })
          })

          if (promises.length > 0) {
            return promisifyWaterfall(promises)
          }

          return Promise.resolve()
        }
      }

      case 'beforeTransform': {
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
              await plugin[fn](assets, options)

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
   * 微信入口都是通过 `app.json` 文件配置,
   * 因此可以通过读取该文件找到对应的入口文件
   *
   * @return {Array} 文件集合
   */
  findEntries () {
    let { miniprogramRoot, pluginRoot } = this.options
    let resolver = new JSONResolver({})

    let entryModule = resolver.findModule('app', miniprogramRoot)
    let entries = entryModule.files || []

    if (pluginRoot) {
      entries.push(path.join(pluginRoot, 'plugin.json'))
      entries.push(path.join(pluginRoot, 'index.js'))
    }

    return entries
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
