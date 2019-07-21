import fs from 'fs-extra'
import * as path from 'path'
import minimatch from 'minimatch'
import omit from 'lodash/omit'
import find from 'lodash/find'
import filter from 'lodash/filter'
import isEmpty from 'lodash/isEmpty'
import flattenDeep from 'lodash/flattenDeep'
import waterfall from 'promise-waterfall'
import OptionManager from './OptionManager'
import Chunk from './Chunk'
import GlobalResolver from '../services/resolver'
import GlobalAssets from '../services/assets'
import { SCATTER } from '../constants/chunk-type'
import { inMatches, isSameOutPath } from '../share/utils'
import * as Typings from '../typings'

/**
 * 编译器
 * 主要用于编译文件内容, 通过配置 rule loader 等信息对
 * 内容进行编译
 *
 * @class
 */
export default class Parser {
  /**
   * 配置
   */
  public options: OptionManager

  constructor (options: OptionManager) {
    this.options = options
  }

  /**
   * 编译多个文件
   * @param files 需要编译的文件
   */
  public multiCompile (files: string[]): Promise<Chunk[]> {
    if (!Array.isArray(files) || files.length === 0) {
      return Promise.resolve([])
    }

    let promises = files.map((file) => this.compile(file))
    return Promise.all(promises).then((chunks: any) => {
      chunks = flattenDeep(chunks).filter((chunk) => chunk)
      return chunks
    })
  }

  /**
   * 编译文件
   * @param file 文件位置
   */
  public async compile (file: string | { file: string }): Promise<Chunk[]> {
    let chunk = await this.convert(file)

    /**
     * 筛选 loader 类型, 只有不指定 loader.for
     * 或者独立类型 (SCATTER) 才能操作代码片段
     * 因为某些 loader 只操作打包后的文件, 例如
     * uglify 只操作 打包类型 (BUNDLER)
     */
    const { rule } = chunk
    const loaders = filter(rule.loaders, (loader) => {
      if (!loader.hasOwnProperty('for')) {
        return true
      }

      if (Array.isArray(loader.for)) {
        return loader.for.indexOf(SCATTER) !== -1
      }

      return loader.for === SCATTER
    })

    chunk = await this.transform(chunk, rule, loaders)
    let chunks = await this.resolve(chunk)
    return chunks
  }

  /**
   * 将 file 转化成 chunk
   * @param file 文件
   * @param chunkOptions 配置
   */
  public convert (file: string | { file: string }, chunkOptions: Typings.ParcelChunkState = {}): Promise<Chunk> {
    if (typeof file === 'object') {
      chunkOptions = isEmpty(chunkOptions) ? omit(file, 'file') : chunkOptions
      file = file.file
    }

    if (GlobalAssets.exists(file)) {
      let chunk = GlobalAssets.get(file)
      let { outDir, staticDir } = this.options

      if (typeof chunkOptions.destination === 'string') {
        let destinations = Array.isArray(chunk.destination)
          ? chunk.destination
          : typeof chunk.destination === 'string'
            ? [chunk.destination]
            : []

        for (let i = 0; i < destinations.length; i++) {
          let destination = destinations[i]
          if (isSameOutPath(destination, chunkOptions.destination, [outDir, staticDir])) {
            return Promise.resolve(chunk)
          }
        }

        chunk.destination = [].concat(destinations, chunkOptions.destination)
      }

      return Promise.resolve(chunk)
    }

    const { rules } = this.options
    const rule = this.matchRule(file, rules) || {}
    const chunk = GlobalAssets.add(file, Object.assign({}, chunkOptions, { rule }))

    return fs.readFile(file).then((content) => {
      chunk.update({ content })
      return chunk
    })
  }

  /**
   * 编译代码
   * @param chunk 代码片段
   * @param rule 规则
   * @param loeaders 加载器
   */
  public transform (chunk: Chunk, rule: Typings.ParcelOptionRule, loaders: Typings.ParcelOptionRuleLoader[]): Promise<Chunk> {
    const { file } = chunk

    /**
     * 没有 loader 不需要编译
     */
    if (loaders.length === 0) {
      return Promise.resolve(chunk)
    }

    /**
     * 过滤不需要编译的文件
     * 顾虑文件实用 minimatch, 具体参考: https://github.com/isaacs/minimatch
     *
     * 例如: 不编译 JS 文件
     * exclude: ['./**\/*.js']
     */
    let exclude = rule.exclude || []
    for (let i = exclude.length; i--;) {
      let pattern = exclude[i]

      if (pattern instanceof RegExp) {
        if (pattern.test(file)) {
          return Promise.resolve(chunk)
        }
      } else {
        const { rootDir } = this.options
        pattern = path.join(rootDir, pattern)

        if (minimatch(file, pattern)) {
          return Promise.resolve(chunk)
        }
      }
    }

    /**
     * 通过配置的 loader 集合, 逐个轮询并编译;
     * 这一过程是异步串行的, 每个 loader 都需要验证
     * 属性
     *
     * 例如: 没有通过 `npm install` 安装包的情况下
     * loader: {
     *  use: require.resolve('wxparcel-xxx-loader'),
     *  options: {}
     * }
     *
     * 使用 `npm install` 安装在本地的情况下
     * loader: {
     *  use: 'wxparcel-xxx-loader',
     *  options: {}
     * }
     */
    let queue = loaders.map((loader) => () => {
      if (!loader.hasOwnProperty('use')) {
        return Promise.reject(new Error('Params use is not provided from loader'))
      }

      let transform: Typings.ParcelLoader = loader.use as any
      if (typeof transform === 'string') {
        /**
         * 读取模块, 若模块为 es6 模块则通过 default 形式去获取.
         * 所有 loader 都通过 default 形式暴露接口给编译器
         */
        let module = require(transform)
        transform = module.default || module
      }

      if (typeof transform !== 'function') {
        return Promise.reject(new Error('Params use is invalid, make sure use is a file path or class'))
      }

      /**
       * 因为 loader 为外部包, 因此这里为了不给外部包改变配置
       * 这里使用 connect 来创建一个新的配置, 且不能修改
       */
      let loaderOptions = loader.options || {}
      let options = this.options.connect({ file, rule, options: loaderOptions })

      return transform(chunk.metadata, options).then((result) => {
        let { code: content, map: sourceMap, dependencies } = result
        return chunk.update({ content, sourceMap, dependencies })
      })
    })

    return waterfall(queue).then(() => chunk)
  }

  /**
   * 解析代码
   * @param chunk 代码片段
   */
  public async resolve (chunk): Promise<Chunk[]> {
    let result = GlobalResolver.resolve(chunk.metadata)
    let { file, content, dependencies, map: sourceMap } = result
    let { outDir, staticDir } = this.options

    dependencies = chunk.dependencies.concat(dependencies)
    chunk.update({ file, content, dependencies, sourceMap })

    if (!Array.isArray(dependencies) || dependencies.length === 0) {
      return chunk
    }

    let newFiles = []
    let affectedExistsChunks = []

    dependencies.forEach((item) => {
      if (GlobalAssets.exists(item.dependency)) {
        let existsChunk = GlobalAssets.get(item.dependency)
        let destinations = Array.isArray(existsChunk.destination)
          ? existsChunk.destination
          : typeof existsChunk.destination === 'string'
            ? [existsChunk.destination]
            : []

        if (typeof existsChunk.destination === 'string' && typeof item.destination === 'string') {
          for (let i = 0; i < destinations.length; i++) {
            let destination = destinations[i]
            if (isSameOutPath(destination, item.destination, [outDir, staticDir])) {
              return
            }
          }

          let destination = [].concat(destinations, item.destination)
          existsChunk.update({ destination })
          affectedExistsChunks.push(existsChunk)
        }

        return
      }

      let { type, dependency, destination } = item
      destination && newFiles.push({ type, file: dependency, destination })
    })

    if (newFiles.length === 0 && affectedExistsChunks.length === 0) {
      return chunk
    }

    let chunks = await this.multiCompile(newFiles)
    return [chunk].concat(chunks, affectedExistsChunks)
  }

  /**
   * 匹配规则
   * @description
   * 根据文件名与 test 来进行规则匹配
   * 这里通过配置 rule.test 来进行匹配
   * {
   *   test: /regexp/
   * }
   * @param file 文件
   * @param rules 规则
   * @returns 匹配到的规则
   */
  public matchRule (file: string, rules: Typings.ParcelOptionRule[] = []) {
    let handleFind = (rule) => {
      let { test: pattern, ignore } = rule
      if (pattern.test(file)) {
        if (ignore && inMatches(file, ignore)) {
          return null
        }

        return file
      }
    }

    return find(rules, handleFind) || null
  }
}
