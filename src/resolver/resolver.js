import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'
import defaults from 'lodash/defaults'
import trimEnd from 'lodash/trimEnd'
import trimStart from 'lodash/trimStart'
import findIndex from 'lodash/findIndex'
import OptionManager from '../option-manager'

export class Resolver {
  constructor (source, file, instance, options = OptionManager) {
    this.source = source
    this.file = file
    this.instance = instance
    this.options = options
  }

  resolveDependencies (regexp, options = {}) {
    options = defaults({}, options, {
      convertDependencyPath: this.convertDependencyPath.bind(this),
      convertDestination: this.convertDestination.bind(this)
    })

    const relativeTo = path.dirname(this.file)
    const { convertDependencyPath, convertDestination } = options

    let code = this.source.toString()
    let dependencies = []
    while (true) {
      let match = regexp.exec(code)
      if (!match) {
        break
      }

      let [holder, required] = match
      code = code.replace(holder, '')

      let dependency = convertDependencyPath(required, relativeTo)
      if (dependency === false) {
        break
      }

      if (findIndex(dependencies, { file: this.file, dependency, required }) === -1) {
        let destination = convertDestination(dependency, this.options)
        let item = { match, file: this.file, dependency, destination, required }
        dependencies.push(item)
      }
    }

    return dependencies
  }

  convertDependencyPath (required, relativeTo) {
    const { srcDir, rootDir } = this.options
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

  convertDestination (file) {
    const { rootDir, srcDir, outDir } = this.options

    /**
     * windows 下 path 存在多个反斜杠
     * 因此需要 escape 才能进行 search
     * 这里可以直接使用 indexOf 进行查询
     */
    return file.indexOf(srcDir) !== -1
      ? file.replace(srcDir, outDir)
      : file.replace(rootDir, outDir)
  }

  convertAssetsDestination (file) {
    const { staticDir } = this.options

    let extname = path.extname(file)
    let basename = path.basename(file).replace(extname, '')
    let filename = basename + '.' + genFileSync(file) + extname
    return path.join(staticDir, filename)
  }

  convertPublicPath (file) {
    const { staticDir, pubPath } = this.options
    /**
     * 这里使用 `/` 而非 `path.sep`, 但必须要过滤 `path.sep`
     * 以防 windows 路径与 web 路径不统一
     */
    let originPath = file.replace(staticDir, '')
    return trimEnd(pubPath, path.sep) + '/' + trimStart(originPath, path.sep)
  }
}

function gen (source) {
  return crypto.createHash('md5').update(source).digest('hex')
}

function genFileSync (file) {
  let source = fs.readFileSync(file)
  return gen(source)
}
