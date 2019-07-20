import fs from 'fs-extra'
import path from 'path'
import uniqBy from 'lodash/uniqBy'
import flatten from 'lodash/flatten'
import flattenDeep from 'lodash/flattenDeep'
import chokidar from 'chokidar'
import waterfall from 'async/waterfall'
import promisifyWaterfall from 'promise-waterfall'
import minimatch from 'minimatch'
import OptionManager from './OptionManager'
import Chunk from './Chunk'
import Assets from './Assets'
import JSONResolver from '../resolver/json-resolver'
import GlobalAssets from '../services/assets'
import GlobalLogger from '../services/logger'
import GlobalBundler from '../services/bundler'
import GlobalParser from '../services/parser'
import { BUNDLER, SCATTER } from '../constants/chunk-type'
import IgnoreFiles from '../constants/ingore-files'
import HOOK_TYPES from '../constants/hooks'
import { readFileAsync, stripBOM } from '../share'
import * as Typings from '../typings'

/**
 * Parcel
 * 构建工具入口
 *
 * @export
 * @class Parcel
 */
export default class Parcel {
  /**
   * 配置
   */
  public options: OptionManager

  /**
   * 是否在运行
   */
  public running: boolean

  /**
   * 阻塞的任务队列
   */
  public paddingTask: () => Array<Promise<any>>

  constructor (options: OptionManager) {
    this.options = options
    this.running = false
    this.paddingTask = null
  }

  /**
   * 运行
   */
  public async run (): Promise<void> {
    if (this.running === true) {
      return Promise.reject(new Error('WXParcel is running'))
    }

    try {
      let startTime = Date.now()
      this.running = true

      this.hook('async')().catch(() => {
        // nothing todo...
      })

      await this.hook('before')()

      let instance = new Assets(this.options)
      await this.hook('beforeTransform')(instance)

      let { rootDir, bundle: useBundle } = this.options
      let entries = this.findEntries()

      let projectConfigFile = path.join(rootDir, './project.config.json')
      if (!fs.existsSync(projectConfigFile)) {
        throw new Error(`${projectConfigFile} is not provided`)
      }

      entries.unshift(projectConfigFile)

      await GlobalParser.multiCompile(entries)
      let { chunks } = GlobalAssets

      if (useBundle === true) {
        let bundles = await GlobalBundler.bundle(chunks)
        let stats = await this.flush(bundles) as any
        stats.spendTime = Date.now() - startTime
        return stats
      }

      let stats = await this.flush(chunks) as any
      stats.spendTime = Date.now() - startTime
      return stats

    } catch (error) {
      GlobalLogger.error(error)

    } finally {
      this.running = false
    }
  }

  /**
   * 监听文件
   */
  public watch (options: Typings.ParcelWatchOptions = {}) {
    const { appConfigFile, bundle: useBundle } = this.options

    // 判断是否为被忽略文件
    const ignoreFile = (file) => {
      return IgnoreFiles.findIndex((pattern) => minimatch(file, pattern)) !== -1
    }

    // 编译并输出文件
    const transform = async (files) => {
      files = Array.isArray(files) ? files : [files]

      let chunks = await GlobalParser.multiCompile(files)
      if (useBundle === true) {
        /**
         * 找出对应的打包器, 这样就能简单直接地进行
         * 相应文件类型的打包, 若找不到对应的打包器
         * 则说明该文件可能不需要打包, 则直接进行输
         * 出即可
         */
        let bundlers = GlobalBundler.matchBundler(chunks)
        if (bundlers.length > 0) {
          let promises = bundlers.map((item) => {
            let { regexp, bundler: MatchedBundler } = item

            let chunks = GlobalAssets.chunks.filter((chunk) => {
              let { destination } = chunk
              if (Array.isArray(destination)) {
                return -1 !== destination.findIndex((item) => regexp.test(item))
              }

              return regexp.test(destination)
            })

            if (chunks.length === 0) {
              return Promise.resolve()
            }

            let bundler = new MatchedBundler(chunks, this.options)
            return bundler.bundle()
          })

          chunks = await Promise.all(promises as any)
        }
      }

      chunks = flattenDeep(chunks)
      chunks = chunks.filter((chunk) => chunk)
      chunks = uniqBy(chunks, 'file')

      return chunks
    }

    // 开始执行
    const start = async (file, involvedFiles = []) => {
      try {
        let startTime = Date.now()
        this.running = true

        let instance = new Assets(this.options)
        await this.hook('beforeTransform')(instance)

        if (GlobalAssets.exists(file)) {
          let chunk = GlobalAssets.get(file)
          let source = await readFileAsync(chunk.file)
          chunk.update({ content: source })
        }

        // 包含编译与打包
        let chunks = await transform(involvedFiles.length > 0 ? involvedFiles : file)
        chunks = [].concat(chunks, instance.chunks)

        let stats = await this.flush(chunks) as any
        stats.spendTime = Date.now() - startTime

        typeof options.complete === 'function' && options.complete(stats)

      } catch (error) {
        GlobalLogger.error(error)

      } finally {
        this.running = false
        this.excutePaddingTask()
      }
    }

    // 处理文件改变事件
    const handleFileChanged = (file) => {
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
        start(file).catch(() => {
          // nothing todo...
        })
        return
      }

      /**
       * 判断变更的文件是否本来就在 assets 列表中
       * 如果是则直接重新编译该文件即可
       */
      if (GlobalAssets.exists(file)) {
        typeof options.change === 'function' && options.change(file, true)
        start(file).catch(() => {
          // nothing todo...
        })
        return
      }

      /**
       * 查找该文件是否为被依赖文件, 若该文件被依赖, 则找出
       * 依赖该文件的 chunks, 将它们的文件进行重新编译
       */
      let chunks = GlobalAssets.findChunkByDependent(file)
      if (chunks.length) {
        let involvedFiles = chunks.map((chunk) => chunk.file)
        start(file, involvedFiles).catch(() => {
          // nothing todo...
        })
        return
      }

      typeof options.change === 'function' && options.change(file, false)
    }

    // 处理删除文件事件
    const handleFileUnlink = (file) => {
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
      if (GlobalAssets.exists(file)) {
        typeof options.unlink === 'function' && options.unlink(file, false)
        GlobalAssets.del(file)
      }
    }

    /**
     * 监听文件变化
     * @link https://github.com/paulmillr/chokidar#api
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
   * @param chunks Chunk 集合
   * @returns {Promise}
   */
  public flush (chunks: Chunk[]): Promise<Array<{ assets: string[], size: number }>> {
    const { sourceMap: useSourceMap } = this.options

    if (!Array.isArray(chunks) || chunks.length === 0) {
      return Promise.reject(new TypeError('Chunks is not a array or not be provided or be empty'))
    }

    let promises = chunks.map((chunk) => {
      let { destination, content: buffer, sourceMap } = chunk.flush()
      let content: string = stripBOM(buffer).toString()

      /**
       * 只有打包文件(BUNDLER) 与 独立文件(SCATTER) 才需要 sourceMap
       */
      if (useSourceMap !== false && (chunk.type === BUNDLER || chunk.type === SCATTER) && sourceMap) {
        sourceMap = JSON.stringify(sourceMap)

        let base64SourceMap = '//# sourceMappingURL=data:application/json;base64,' + Buffer.from(sourceMap).toString('base64')
        content = content + '\n' + base64SourceMap
      }

      let destinations = Array.isArray(destination) ? destination : [destination]
      let promises = destinations.map((destination) => new Promise((resolve, reject) => {
        let taskQueue = [
          fs.ensureFile.bind(fs, destination),
          fs.writeFile.bind(fs, destination, content, 'utf8')
        ]

        taskQueue = flatten(taskQueue)
        waterfall(taskQueue, (error) => {
          if (error) {
            reject(error)
            return
          }

          resolve({ assets: destination, size: content.length })
        })
      }))

      return Promise.all(promises)
    })

    return Promise.all(promises).then((stats: any) => flatten(stats))
  }

  /**
   * 触发钩子
   * @param type 钩子类型 ['async', 'before', 'beforeTransform']
   */
  public hook (type: 'async' | 'before' | 'beforeTransform'): (instance?: Assets) => Promise<any> {
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
        return (assets = new Assets(this.options)) => {
          if (!(assets instanceof Assets)) {
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

              assets.size > 0 && GlobalAssets.chunks.push(...assets.chunks)
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
   */
  public excutePaddingTask (): void {
    if (typeof this.paddingTask === 'function') {
      this.paddingTask()
      this.paddingTask = undefined
    }
  }

  /**
   * 查找入口
   * @description
   * 微信入口都是通过 `app.json` 文件配置,
   * 因此可以通过读取该文件找到对应的入口文件
   * @returns 文件集合
   */
  public findEntries (): string[] {
    let { miniprogramRoot, pluginRoot } = this.options
    let resolver = new JSONResolver({}, this.options)

    let entryModule = resolver.findModule('app', miniprogramRoot)
    let entries = entryModule.files || []

    if (pluginRoot) {
      entries.push(path.join(pluginRoot, 'plugin.json'))
      entries.push(path.join(pluginRoot, 'index.js'))
    }

    return entries
  }
}
