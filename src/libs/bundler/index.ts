import flatten from 'lodash/flatten'
import without from 'lodash/without'
import filter from 'lodash/filter'
import BaseBundler from './Bundler'
import JSBundler from './JSBundler'
import Chunk from '../Chunk'
import OptionManager from '../OptionManager'
import GlobalParser from '../../services/parser'
import { BUNDLER, SCATTER } from '../../constants/chunk-type'

export default class Bundler {
  /**
   * 配置管理器
   */
  public options: OptionManager

  /**
   * 打包器集合
   */
  public bundlers: Array<{ regexp: RegExp, bundler: { new(chunks: Chunk[], options: OptionManager): BaseBundler } }>

  constructor (options: OptionManager) {
    this.options = options
    this.bundlers = []

    /**
     * 这里的正则匹配为结果文件的后缀
     */
    this.register(/\.js$/, JSBundler)
  }

  /**
   * 注册打包器
   * @param regexp 匹配正则
   * @param bundler 解析器类
   */
  public register <T extends BaseBundler> (regexp: RegExp, bundler: { new(chunks: Chunk[], options: OptionManager): T }) {
    if (typeof bundler === 'string') {
      bundler = require(bundler)
    }

    this.bundlers.push({ regexp, bundler: bundler })
  }

  /**
   * 打包代码块
   * @param chunks chunk 集合
   * @returns 片段集合
   */
  public async bundle (chunks: Chunk[]): Promise<Chunk[]> {
    chunks = [].concat(chunks)

    let bundledChunks = []
    let bundleTasks = this.bundlers.map(({ regexp, bundler: Bundler }) => {
      /**
       * 过滤需要打包的文件, 这里先判断文件类型
       * 再判断结果文件是否与操作打包匹配的正则匹配到
       */
      let bundleChunks: Chunk[] = []
      chunks.forEach((chunk) => {
        if (chunk.type !== SCATTER) {
          if (Array.isArray(chunk.destination)) {
            for (let i = chunk.destination.length; i --;) {
              let destination = chunk.destination[i]
              if (regexp.test(destination)) {
                bundleChunks.push(chunk)
                break
              }
            }

          } else if (typeof chunk.destination === 'string') {
            if (regexp.test(chunk.destination)) {
              bundleChunks.push(chunk)
            }
          }
        }
      })

      /**
       * 已经确定的文件就不需要再次读取
       * 这里筛选掉已匹配过的 chunks
       */
      chunks = without(chunks, ...bundleChunks)

      let bundler = new Bundler(bundleChunks, this.options)
      return bundler.bundle()
    })

    bundledChunks = await Promise.all(bundleTasks)
    bundledChunks = flatten(bundledChunks)

    let transformTasks = bundledChunks.map((chunk) => {
      let rule = chunk.rule || {}
      let loaders = filter(rule.loaders, (loader) => {
        if (Array.isArray(loader.for)) {
          return loader.for.indexOf(BUNDLER) !== -1
        }

        return loader.for === BUNDLER
      })

      return GlobalParser.transform(chunk, rule, loaders)
    })

    bundledChunks = await Promise.all(transformTasks)
    return [].concat(chunks, bundledChunks)
  }

  /**
   * 获取适合 file 的 bulder
   *
   * @param chunks 代码片
   * @returns Bundler
   */
  public matchBundler (chunks): Bundler['bundlers'] {
    return this.bundlers.filter(({ regexp }) => {
      let index = chunks.findIndex((chunk) => regexp.test(chunk.file))
      return index !== -1
    })
  }
}
