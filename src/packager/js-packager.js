import fs from 'fs-extra'
import path from 'path'
import map from 'lodash/map'
import filter from 'lodash/filter'
import trimEnd from 'lodash/trimEnd'
import Packager from './packager'

const PreludeCode = fs.readFileSync(path.join(__dirname, './prelude.js'))

export default class JSPackager extends Packager {
  constructor (chunks, options) {
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
    const { outDir } = this.options
    let code = PreludeCode + this.wrapBundle(this.chunks)
    let bundleContent = Buffer.from(code)
    let bundleDestination = path.join(outDir, 'bundle.js')
    
    let bundledChunk = this.assets.add('bundle.js', {
      type: 'bundle',
      content: bundleContent,
      destination: bundleDestination
    })
    
    let entryChunks = filter(this.chunks, (chunk) => chunk.type === 'entry')
    entryChunks = map(entryChunks, ({ file, content, destination, ...otherProps }) => {
      console.log(destination)
      let id = this._remember(destination)

      let relativeFile = path.relative(destination, bundleDestination)
      let relativePath = relativeFile.replace(path.extname(relativeFile), '')

      let code = `require(${JSON.stringify(relativePath)})(${JSON.stringify(id)})`
      let entryContent = Buffer.from(code)

      return this.assets.add(file, { ...otherProps, content: entryContent })
    })

    return [bundledChunk].concat(entryChunks)
  }

  wrapBundle (chunks) {
    let modules = this.wrapModules(chunks)
    return `([${modules}, {}])`
  }

  wrapModules (chunks) {
    let modules = map(chunks, (chunk) => this.wrapModule(chunk))
    return `{${trimEnd(modules.join('\n'), ',')}}`
  }

  wrapModule (chunk) {
    let id = this._remember(chunk.destination)
    let code = chunk.content.toString()
    let dependencies = map(chunk.dependencies, ({ required, destination }) => {
      let id = this._remember(destination)
      return { [required]: id }
    })

    return this.wrapCode(id, code, dependencies)
  }

  wrapCode (name, code, dependencies) {
    return `${JSON.stringify(name)}: [function(require,module,exports) {\n${code}\n}, ${JSON.stringify(dependencies)}],`
  }
}

