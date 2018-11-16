import path from 'path'
import defaults from 'lodash/defaults'
import trimEnd from 'lodash/trimEnd'
import trimStart from 'lodash/trimStart'
import findIndex from 'lodash/findIndex'
import OptionManager from '../option-manager'
import { genFileSync } from '../share'

/**
 * 解析器
 *
 * @export
 * @class Resolver
 */
export class Resolver {
  /**
   * Creates an instance of JSResolver.
   *
   * @param {Object} asset 资源对象
   * @param {OptionManager} [options=OptionManager] 配置管理器
   */
  constructor (asset = {}, options = OptionManager) {
    /**
     * 代码
     *
     * @type {Buffer}
     */
    this.source = asset.content

    /**
     * 文件路径
     *
     * @type {String}
     */
    this.file = asset.file

    /**
     * 配置管理器
     *
     * @type {OptionManager}
     */
    this.options = options
  }

  /**
   * 解析, 并返回文件,代码,依赖等信息
   *
   * @return {Object} 包括文件, 代码, 依赖
   */
  resolve () {
    return { file: this.file, content: this.source, dependencies: this.dependencies }
  }

  /**
   * 修正信息
   *
   * @param {Array} [source, dependencies] 信息
   * @param {Regexp} pattern 匹配正则
   * @param {Object} [options={}] 配置
   * @param {Function} [options.convertDependency=this.convertDependency] 转换依赖路径
   * @param {Function} [options.convertDestination=this.convertDestination] 转换目标路径
   * @param {Function} [options.convertFinallyState=this.convertFinallyState] 转换最终信息
   * @return {Array} [source, dependencies]
   */
  revise ([source, dependencies], pattern, options = {}) {
    if (Array.isArray(pattern)) {
      pattern.forEach((pattern) => {
        [source, dependencies] = this.revise([source, dependencies], pattern, options)
      })

      return [source, dependencies]
    }

    options = defaults({}, options, {
      convertDependency: this.convertDependency.bind(this),
      convertDestination: this.convertDestination.bind(this),
      convertFinallyState: this.convertFinallyState.bind(this)
    })

    let { convertDependency, convertDestination, convertFinallyState } = options
    let code = source

    while (true) {
      let match = pattern.exec(code)
      if (!match) {
        break
      }

      let [all, ...required] = match
      required = required.find((item) => typeof item !== 'undefined')
      code = code.replace(all, '')

      let dependency = convertDependency(required)
      if (dependency === false) {
        break
      }

      let props = { file: this.file, dependency, required }
      if (findIndex(dependencies, props) === -1) {
        let destination = convertDestination(dependency, this.options)
        let dependence = { ...props, type: options.type, destination }

        ;[source, dependence] = convertFinallyState(source, { ...dependence, code: all })
        dependencies.push(dependence)
      }
    }

    return [source, dependencies]
  }

  /**
   * 转换依赖路径
   *
   * @param {String} required 依赖文件路径
   * @param {String} relativeTo 相对引用文件路径
   * @return {String} 依赖路径
   */
  convertDependency (required, relativeTo = path.dirname(this.file)) {
    const { srcDir, rootDir } = this.options
    switch (required.charAt(0)) {
      case '~':
        return path.join(srcDir, required.substr(1))
      case '/':
        return path.join(rootDir, required.substr(1))
      case '.':
      default:
        return path.join(relativeTo, required)
    }
  }

  /**
   * 转换目标路径
   *
   * @param {String} file 文件路径
   * @return {String} 目标路径
   */
  convertDestination (file) {
    let { rootDir, srcDir, outDir } = this.options

    /**
     * windows 下 path 存在多个反斜杠
     * 因此需要 escape 才能进行 search
     * 这里可以直接使用 indexOf 进行查询
     */
    return file.indexOf(srcDir) !== -1
      ? file.replace(srcDir, outDir)
      : file.replace(rootDir, outDir)
  }

  /**
   * 转换最终信息
   *
   * @param {String} source 代码
   * @param {Object} dependence 依赖
   * @param {String} dependence.code 匹配到的代码
   * @param {String} dependence.type 类型
   * @param {String} dependence.file 文件名路径
   * @param {String} dependence.dependency 依赖文件路径
   * @param {String} dependence.required 依赖匹配, 指代路径
   * @param {String} dependence.destination 目标路径
   * @return {Array} [source, dependence] 其中 dependence 不包含 code 属性
   */
  convertFinallyState (source, { code, ...dependence }) {
    return [source, dependence]
  }

  /**
   * 转换静态目标路径
   *
   * @param {String} file 文件路径
   * @return {String} 静态目标路径
   */
  convertAssetsDestination (file) {
    let { staticDir } = this.options

    let extname = path.extname(file)
    let basename = path.basename(file).replace(extname, '')
    let filename = basename + '.' + genFileSync(file) + extname
    return path.join(staticDir, filename)
  }

  /**
   * 转换公共路径
   *
   * @param {String} file 文件路径
   * @return {String} 公共路径
   */
  convertPublicPath (file) {
    const { staticDir, pubPath } = this.options

    /**
     * 这里使用 `/` 而非 `path.sep`, 但必须要过滤 `path.sep`
     * 以防 windows 路径与 web 路径不统一
     */
    let relativePath = file.replace(staticDir, '')
    return trimEnd(pubPath, path.sep) + '/' + trimStart(relativePath, path.sep)
  }
}
