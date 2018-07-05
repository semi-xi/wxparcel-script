import fs from 'fs-extra'
import path from 'path'
import { Transform } from 'stream'
import OptionManager from './option-manager'
import { resolveDependencies } from './share/resolveDependencies'

class Transformer extends Transform {
  constructor (handle) {
    super()

    this._source = new Buffer('')
    this._handle = handle
  }

  _transform (buffer, encodeType, done) {
    this._source = Buffer.concat([this._source, buffer])
    done()
  }

  _flush (done) {
    if (typeof this._handle === 'function') {
      let source = this._handle(this._source)
      this.push(source || this._source)
    }

    done()
  }
}

export class Parser {
  parse (file, rule = {}) {
    return new Promise((resolve, reject) => {
      let { loaders } = rule
      let stream = fs.createReadStream(file)

      let handleStreamFinish = this.transform((source) => {
        let relativeTo = path.dirname(file)
        if (/\.js$/.test(path.extname(file))) {
          let dependencies = resolveDependencies(source.toString(), file, relativeTo, OptionManager)
          resolve({ file, stream, dependencies })
          return
        }

        resolve({ file, stream, dependencies: [] })
      })

      stream = stream.pipe(handleStreamFinish)
      stream.on('finish', resolve.bind(null, this))
      stream.on('error', reject.bind(null))
    })
  }

  transform (callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback is not a fucntion')
    }

    return new Transformer(callback)
  }
}

export default new Parser()
