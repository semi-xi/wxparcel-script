import fs from 'fs'
import path from 'path'
import { transform } from 'babel-core'

export default function babelLoader (source, options) {
  return new Promise((resolve) => {
    let { options: babelOptions } = options
    let babelrc = path.join(options.rootDir, '.babelrc')

    if (fs.existsSync(babelrc)) {
      babelOptions = Object.assign({
        extends: babelrc,
        babelrc: true
      }, babelOptions)
    }

    let { code } = transform(source.toString(), babelOptions)
    let regexp = /require\(["'\s]+(.+?)["'\s]+\)/g
    let surplus = code
    let match = null

    // eslint-disable-next-line no-cond-assign
    while (match = regexp.exec(surplus)) {
      let [all, path] = match
      surplus = surplus.replace(all, '')
      code = code.replace(all, `require('${path.replace(/\\/g, '/')}')`)
    }

    resolve(Buffer.from(code))
  })
}
