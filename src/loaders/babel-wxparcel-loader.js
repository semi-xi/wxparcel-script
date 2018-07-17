import fs from 'fs'
import path from 'path'
import { transform } from 'babel-core'

export default function babelLoader (source, options) {
  return new Promise((resolve) => {
    let { options: babelOptions } = options
    let babelRcFile = path.join(options.rootDir, '.babelrc')

    if (fs.existsSync(babelRcFile)) {
      babelOptions = Object.assign({
        extends: babelRcFile,
        babelrc: true
      }, babelOptions)
    }

    let { code } = transform(source, babelOptions)
    let regexp = /require\(["'\s]+(.+?)["'\s]+\)/g
    let surplus = code
    let match = null

    // eslint-disable-next-line no-cond-assign
    while (match = regexp.exec(surplus)) {
      let [all, path] = match
      surplus = surplus.replace(all, '')
      code = code.replace(all, `require('${path.replace(/\\/g, '/')}')`)
    }

    resolve(code)
  })
}
