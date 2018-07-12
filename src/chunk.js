import fs from 'fs-extra'
import path from 'path'
import isPlainObject from 'lodash/isPlainObject'
import omit from 'lodash/omit'
import optionManager from './option-manager'

export class Chunk {
  constructor (file, options = {}) {
    if (!file) {
      throw new TypeError('File is invalid or not be provied')
    }

    if (!fs.existsSync(file)) {
      if (!options.content) {
        throw new Error(`File ${file} is not found`)
      }
    }

    this.flushed = false
    this.file = file
    this.dependencies = options.dependencies || []
    this.content = Buffer.from(options.content || '')

    let { rootDir, srcDir, outDir, npmDir, staticDir } = optionManager
    let { rule, destination } = this.options = options

    /**
     * 重置 rule 值再赋值
     * 下面 rule 需要默认值来使用
     */
    this.rule = rule = rule || {}
    this.destination = destination || ''

    if (destination) {
      if (rule.extname) {
        let dirname = path.dirname(destination)
        let filename = path.basename(destination)
        let extname = path.extname(file)

        filename = filename.replace(extname, rule.extname)
        this.destination = path.join(dirname, filename)
      } else {
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

  update (props = {}) {
    if (props.hasOwnProperty('file') && typeof props.file === 'string') {
      this.file = props.file
    }

    if (props.hasOwnProperty('dependencies') && Array.isArray(props.dependencies)) {
      this.dependencies = props.dependencies
    }

    if (props.hasOwnProperty('rule') && isPlainObject(props.rule)) {
      this.rule = props.rule
    }

    if (props.hasOwnProperty('destination') && typeof props.destination === 'string') {
      this.destination = props.destination
    }

    if (props.hasOwnProperty('content')) {
      if (typeof props.content === 'string') {
        this.content = Buffer.from(props.content)
      } else if (props.content instanceof Buffer) {
        this.content = props.content
      }
    }

    this.flushed = false
  }

  flush () {
    let metadata = omit(this, ['flush'])
    this.flushed = true
    return metadata
  }

  destory () {
    this.file = undefined
    this.dependencies = undefined
    this.options = undefined
    this.rule = undefined
    this.destination = undefined
  }
}
