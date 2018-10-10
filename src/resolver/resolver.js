import path from 'path'
import defaults from 'lodash/defaults'
import trimEnd from 'lodash/trimEnd'
import trimStart from 'lodash/trimStart'
import findIndex from 'lodash/findIndex'
import OptionManager from '../option-manager'
import { genFileSync } from './share'

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
  constructor (asset, options = OptionManager) {
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
    return { file: this.file, content: this.source, dependencies: [] }
  }

  /**
   * 查找依赖
   *
   * @param {RegExp} regexp 查找正则
   * @param {Object} options 配置
   * @param {Function} [options.convertDependencyPath=this.convertDependencyPath] 转换依赖路径
   * @param {Function} [options.convertDestination=this.convertDestination] 转换目标路径
   * @return {Array} 依赖
   */
  resolveDependencies (source, regexp, options = {}) {
    options = defaults({}, options, {
      convertDependencyPath: this.convertDependencyPath.bind(this),
      convertDestination: this.convertDestination.bind(this)
    })

    let relativeTo = path.dirname(this.file)
    let { convertDependencyPath, convertDestination } = options

    let code = source
    let dependencies = []
    while (true) {
      let match = regexp.exec(code)
      if (!match) {
        break
      }

      let [all, required] = match
      code = code.replace(all, '')

      let dependency = convertDependencyPath(required, relativeTo)
      if (dependency === false) {
        break
      }

      if (findIndex(dependencies, { file: this.file, dependency, required, code: all }) === -1) {
        let destination = convertDestination(dependency, this.options)
        let item = { type: 'bundler', file: this.file, dependency, destination, required, code: all }
        dependencies.push(item)
      }
    }

    return dependencies
  }

  /**
   * 转换依赖路径
   *
   * @param {String} required 依赖文件路径
   * @param {String} relativeTo 相对引用文件路径
   * @return {String} 依赖路径
   */
  convertDependencyPath (required, relativeTo) {
    let { srcDir, rootDir } = this.options
    switch (required.charAt(0)) {
      case '~':
        return path.join(srcDir, required)
      case '/':
        return path.join(rootDir, required)
      case '.':
        return path.join(relativeTo, required)
      default:
        return false
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
    let { staticDir, pubPath } = this.options
    /**
     * 这里使用 `/` 而非 `path.sep`, 但必须要过滤 `path.sep`
     * 以防 windows 路径与 web 路径不统一
     */
    let originPath = file.replace(staticDir, '')
    return trimEnd(pubPath, path.sep) + '/' + trimStart(originPath, path.sep)
  }
}
