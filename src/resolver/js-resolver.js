import path from 'path'
import Module from 'module'
import trimEnd from 'lodash/trimEnd'
import trimStart from 'lodash/trimStart'
import stripComments from 'strip-comments'
import { Resolver } from './resolver'
import OptionManager from '../option-manager'

const REQUIRE_REGEXP = /require\(['"]([\w\d_\-./]+)['"]\)/
const WORKER_REQUIRE_REGEXP = /wx.createWorker\(['"]([\w\d_\-./]+)['"]\)/

/**
 * JS 解析器
 *
 * @export
 * @class JSResolver
 * @extends {Resolver}
 */
export default class JSResolver extends Resolver {
  /**
   * Creates an instance of JSResolver.
   * @param {String} source 代码
   * @param {String} file 文件名
   * @param {Object} instance 实例
   * @param {OptionManager} [options=OptionManager] 配置管理器
   * @memberof JSResolver
   */
  constructor (source, file, instance, options = OptionManager) {
    super(source, file, instance, options)

    /**
     * 模块集合
     *
     * @type {Object}
     */
    this.modules = {}
  }

  /**
   * 解析, 并返回文件,代码,依赖等信息
   *
   * @return {Object} 包括文件, 代码, 依赖
   */
  resolve () {
    const { staticDir, pubPath } = this.options

    this.source = this.source.toString()
    this.source = stripComments(this.source)

    let jsDependencies = this.resolveDependencies(REQUIRE_REGEXP, {
      convertDependencyPath: this.convertRelative.bind(this),
      convertDestination: this.convertDestination.bind(this)
    })

    let workerDependencies = this.resolveDependencies(WORKER_REQUIRE_REGEXP, {
      convertDependencyPath: this.convertWorkerRelative.bind(this)
    })

    let dependencies = [].concat(jsDependencies, workerDependencies)
    dependencies = this.filterDependencies(dependencies)
    dependencies = dependencies.map((item) => {
      let { file, destination, dependency, required, code } = item
      let extname = path.extname(destination)
      if (extname === '' || /\.(jsx?|babel|es6)/.test(extname)) {
        return item
      }

      let dependencyDestination = this.convertAssetsDestination(dependency)
      let relativePath = dependencyDestination.replace(staticDir, '')
      let url = trimEnd(pubPath, path.sep) + '/' + trimStart(relativePath, path.sep)

      this.source = this.source.replace(code, `"${url}"`)
      return { file, destination: dependencyDestination, dependency, required }
    })

    this.source = Buffer.from(this.source)
    return { file: this.file, source: this.source, dependencies }
  }

  /**
   * 转换路径
   * 根据路径往上查找依赖文件
   *
   * docs: https://developers.weixin.qq.com/miniprogram/dev/framework/workers.html
   *
   * @param {String} requested 请求路径
   * @param {String} relativeTo 被依赖文件所在文件夹路径
   * @return {String} 文件路径
   */
  convertWorkerRelative (requested) {
    const { srcDir, appConfig } = this.options || {}
    const { workers } = appConfig || {}
    const workerFolder = requested.split('/').shift()
    if (workers !== workerFolder) {
      throw new Error(`Worker folder ${workerFolder} is not defined in app.config.json. Please check config with docs https://developers.weixin.qq.com/miniprogram/dev/framework/workers.html`)
    }

    return path.join(srcDir, requested)
  }

  /**
   * 转换路径
   * 根据路径往上查找依赖文件
   *
   * @param {String} requested 请求路径
   * @param {String} relativeTo 被依赖文件所在文件夹路径
   * @return {String} 文件路径
   */
  convertRelative (requested, relativeTo) {
    /**
     * 兼容 require('not-a-system-dependency') 的情况
     * 若无法通过正常方式获取, 则尝试使用相对定位寻找该文件
     */
    try {
      let file = path.join(relativeTo, requested)
      return require.resolve(file)
    } catch (err) {
      try {
        let root = this.convertModule(relativeTo)
        return Module._resolveFilename(requested, root)
      } catch (error) {
        throw new Error(error)
      }
    }
  }

  /**
   * 转换存放的目的地路径
   *
   * @param {String} file 文件路径
   * @return {String} 目的地文件路径
   */
  convertDestination (file) {
    let { rootDir, srcDir, outDir, npmDir } = this.options

    /**
     * windows 下 path 存在多个反斜杠
     * 因此需要 escape 才能进行 search
     * 这里可以直接使用 indexOf 进行查询
     */
    let relativePath = file.indexOf(srcDir) !== -1
      ? path.dirname(file).replace(srcDir, '')
      : /[\\/]node_modules[\\/]/.test(file)
        ? path.dirname(file).replace(path.join(rootDir, 'node_modules'), npmDir)
        : path.dirname(file).replace(rootDir, '')

    let filename = path.basename(file)
    return path.join(outDir, relativePath, filename)
  }

  /**
   * 模块转换
   * 根据 NodeJS 的查找方式往上查找依赖, 直到根目录为止
   *
   * @param {String} directive 起始的查找路径
   * @return {String} 匹配到的路径
   */
  convertModule (directive) {
    let rootPath = directive ? path.resolve(directive) : process.cwd()
    let rootName = path.join(rootPath, '@root')
    let root = this.modules[rootName]

    if (!root) {
      root = new Module(rootName)
      root.filename = rootName
      root.paths = Module._nodeModulePaths(rootPath)
      this.modules[rootName] = root
    }

    return root
  }

  /**
   * 筛选系统依赖
   *
   * @param {Array} dependencies 依赖
   * @return {Array}
   */
  filterDependencies (dependencies) {
    return dependencies.filter(({ dependency }) => {
      /**
       * 过滤系统依赖
       */
      if (dependency === path.basename(dependency)) {
        return false
      }

      return true
    })
  }
}
