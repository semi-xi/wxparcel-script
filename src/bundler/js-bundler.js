import fs from 'fs-extra'
import path from 'path'
import map from 'lodash/map'
import filter from 'lodash/filter'
import forEach from 'lodash/forEach'
import trimEnd from 'lodash/trimEnd'
import findIndex from 'lodash/findIndex'
import Bundler from './bundler'
import OptionManager from '../option-manager'
import Parser from '../parser'

const { execDir } = OptionManager
const PreludeCode = fs.readFileSync(path.join(execDir, './builtins/prelude.js'))

export default class JSBundler extends Bundler {
  constructor (chunks, options = OptionManager) {
    super(chunks, options)

    this._uid = 0
    this._fileMap = new Map()
  }

  _genUid () {
    let uid = this._uid.toString(32)
    this._uid ++
    return uid
  }

  _remember (file) {
    if (typeof file !== 'string') {
      throw new Error('File is a invalid string or not be provided')
    }

    let id = this._fileMap.get(file)
    if (!id) {
      id = this._genUid()
      this._fileMap.set(file, id)
    }

    return id
  }

  bundle () {
    const { outDir, rules } = this.options

    let code = PreludeCode.toString() + this.wrapBundle(this.chunks)
    let bundleContent = Buffer.from(code)
    let bundleFilename = 'bundler.js'
    let bundleDestination = path.join(outDir, bundleFilename)

    let bundledChunk = this.assets.add(bundleFilename, {
      type: 'bundler',
      content: bundleContent,
      destination: bundleDestination,
      rule: Parser.matchRule(bundleDestination, rules)
    })

    let entryChunks = filter(this.chunks, (chunk) => chunk.type === 'entry')
    entryChunks = map(entryChunks, ({ file, content, destination, ...otherProps }) => {
      let id = this._remember(destination)

      let destFolder = path.dirname(destination)
      let relativePath = path.relative(destFolder, bundleDestination)
      let requiredPath = relativePath.replace(/\\/g, '/')
      let required = requiredPath.replace(path.extname(requiredPath), '')

      let code = `require(${this.wrapQuote(required)})(${this.wrapQuote(id)})`
      let entryContent = Buffer.from(code)

      return this.assets.add(file, {
        ...otherProps,
        content: entryContent,
        rule: Parser.matchRule(file, rules)
      })
    })

    return [bundledChunk].concat(entryChunks)
  }

  wrapBundle (chunks) {
    let modules = this.wrapModules(chunks)
    return `(${modules}, {})`
  }

  wrapModules (chunks) {
    let modules = map(chunks, (chunk) => this.wrapModule(chunk))
    return `{${trimEnd(modules.join('\n'), ',')}}`
  }

  wrapModule (chunk) {
    let id = this._remember(chunk.destination)
    let code = chunk.content.toString()
    let dependencies = {}

    forEach(chunk.dependencies, (item) => {
      const { dependency, required, destination } = item
      if (-1 !== findIndex(this.chunks, (chunk) => chunk.file === dependency)) {
        let id = this._remember(destination)
        dependencies[required] = id
      }
    })

    return this.wrapCode(id, code, dependencies)
  }

  wrapCode (name, code, dependencies) {
    return `${this.wrapQuote(name)}: [function(require,module,exports) {\n${code}\n}, ${JSON.stringify(dependencies)}],`
  }

  wrapQuote (str) {
    return `"${str}"`
  }
}
