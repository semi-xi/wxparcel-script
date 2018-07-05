import fs from 'fs-extra'
import path from 'path'
import optionManager from './option-manager'

export class Chunk {
  constructor (file, options = {}) {
    if (!file) {
      throw new TypeError('File is invalid or not be provied')
    }

    if (!fs.existsSync(file)) {
      throw new Error(`File ${file} is not found`)
    }

    this.file = file
    this.stream = options.stream || null
    this.dependencies = options.dependencies || []

    let { rootDir, srcDir, outDir, npmDir, staticDir } = optionManager
    let { rule, destination } = this.options = options

    rule = rule || {}
    destination = destination || ''

    if (destination) {
      if (rule.extname) {
        let dirname = path.dirname(destination)
        let filename = path.basename(destination)
        let extname = path.extname(file)

        filename = filename.replace(extname, rule.extname)
        this.destination = path.join(dirname, filename)
      }
      else {
        this.destination = destination
      }
    } else {
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
      if (rule.extname) {
        let extname = path.extname(file)
        filename = filename.replace(extname, rule.extname)
      }

      this.destination = path.join(rule.type === 'static' ? staticDir : outDir, relativePath, filename)
    }
  }

  pipe (transform) {
    return new Promise((resolve, reject) => {
      this.stream = this.stream.pipe(transform)
      this.stream.on('finish', resolve.bind(null, this))
      this.stream.on('error', reject.bind(null))
    })
  }
}
