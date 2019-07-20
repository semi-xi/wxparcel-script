import path from 'path'
import Module from 'module'
import stripComments from 'decomment'
import Resolver from './resolver'
import { BUNDLE, SCATTER } from '../constants/chunk-type'
import OptionManager from '../libs/OptionManager'
import { escapeRegExp } from '../share'
import * as Typings from '../typings'

const IMPORT_REGEXP = /(?:ex|im)port(?:\s+(?:[\w\W]+?\s+from\s+)?['"]([@~\w\d_\-./]+?)['"]|\s*\(['"]([~\w\d_\-./]+?)['"]\))/
const REQUIRE_REGEXP = /require\s*\(['"]([@~\w\d_\-./]+?)['"]\)/
const WORKER_REQUIRE_REGEXP = /wx\.createWorker\s*\(['"]([@~\w\d_\-./]+?)['"]\)/

/**
 * JS 解析器
 */
export default class JSResolver extends Resolver {
  /**
   * 模块集合
   */
  public modules: { [key: string]: any }

  constructor (asset, options: OptionManager) {
    super(asset, options)
    this.modules = {}
  }

  /**
   * 解析, 并返回文件,代码,依赖等信息
   * @returns 包括文件, 代码, 依赖
   */
  public resolve () {
    let source = this.source.toString()
    let dependencies: Typings.ParcelChunkDependency[] = []

    try {
      source = stripComments(source)
    } catch (error) {
      throw new Error(`Some error occur when strip comments in ${this.file}\n${error.message}`)
    }

    [source, dependencies] = this.revise([source, dependencies], [IMPORT_REGEXP, REQUIRE_REGEXP], {
      type: BUNDLE,
      convertDependency: this.convertRelative.bind(this),
      convertDestination: this.convertDestination.bind(this),
      convertFinallyState: this.convertFinallyState.bind(this)
    })

    /**
     * worker 文件因为必须独立于 worker 目录, 因此这里使用 SCATTER 类型
     * worker 目录在 app.json 中定义
     */
    ;[source, dependencies] = this.revise([source, dependencies], WORKER_REQUIRE_REGEXP, {
      type: SCATTER,
      convertDependency: this.convertWorkerRelative.bind(this),
      convertFinallyState: this.convertFinallyState.bind(this)
    })

    source = source.trim()
    dependencies = this.filterDependencies(dependencies)

    const buffer = Buffer.from(source)
    return { file: this.file, content: buffer, dependencies }
  }

  /**
   * 转换最终信息
   * @param source 代码
   * @param dependence 依赖
   * @returns [source, dependence] 其中 dependence 不包含 code 属性
   */
  public convertFinallyState (source: string, { code, dependency, destination, required, ...props }) {
    let extname = path.extname(destination)
    if (extname === '' || /\.(jsx?|babel|es6)/.test(extname)) {
      let dependence = { dependency, destination, required, ...props }
      return [source, dependence]
    }

    if (required.charAt(0) === '@') {
      let dependence = { dependency, destination, required, ...props }
      let url = required.substr(1)
      source = source.replace(new RegExp(escapeRegExp(code), 'ig'), `"${url}"`)
      return [source, dependence]
    }

    let dependencyDestination = this.convertAssetsDestination(dependency)
    let url = this.convertPublicPath(dependencyDestination)

    source = source.replace(new RegExp(escapeRegExp(code), 'ig'), `"${url}"`)
    let dependence = { dependency, destination: dependencyDestination, required, ...props }
    return [source, dependence]
  }

  /**
   * 转换路径
   * 根据路径往上查找依赖文件
   * @link https://developers.weixin.qq.com/miniprogram/dev/framework/workers.html
   * @param requested 请求路径
   * @returns 文件路径
   */
  public convertWorkerRelative (requested: string): string {
    const { srcDir, appConfig } = this.options
    const { workers } = appConfig
    const workerFolder = requested.split('/').shift()
    if (workers !== workerFolder) {
      throw new Error(`Worker folder ${workerFolder} is not defined in app.config.json. Please check config with docs https://developers.weixin.qq.com/miniprogram/dev/framework/workers.html`)
    }

    return path.join(srcDir, requested)
  }

  /**
   * 转换路径
   * @description 根据路径往上查找依赖文件
   * @param requested 请求路径
   * @param relativeTo 被依赖文件所在文件夹路径
   * @returns 文件路径
   */
  public convertRelative (requested: string, relativeTo: string): string {
    /**
     * 兼容 require('not-a-system-dependency') 的情况
     * 若无法通过正常方式获取, 则尝试使用相对定位寻找该文件
     */
    try {
      let file = this.convertDependency(requested, relativeTo)
      return require.resolve(file as string)

    } catch (err) {
      try {
        let root = this.convertModule(relativeTo)
        return (Module as any)._resolveFilename(requested, root)

      } catch (error) {
        throw new Error(`Cannot found module ${requested} in ${this.file}`)
      }
    }
  }

  /**
   * 转换存放的目的地路径
   *
   * @param file 文件路径
   * @returns 目的地文件路径
   */
  public convertDestination (file: string): string {
    const { rootDir, srcDir, outDir, npmDir } = this.options

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
   * @description 根据 NodeJS 的查找方式往上查找依赖, 直到根目录为止
   * @param directive 起始的查找路径
   * @returns 匹配到的路径
   */
  public convertModule (directive: string): any {
    let rootPath = directive ? path.resolve(directive) : process.cwd()
    let rootName = path.join(rootPath, '@root')
    let root = this.modules[rootName]

    if (!root) {
      root = new Module(rootName)
      root.filename = rootName
      root.paths = (Module as any)._nodeModulePaths(rootPath)
      this.modules[rootName] = root
    }

    return root
  }

  /**
   * 筛选系统依赖
   * @param dependencies 依赖
   */
  public filterDependencies (dependencies: Array<{ dependency: any, [key: string]: any }>): Array<{ dependency: any, [key: string]: any }> {
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
