import fs from 'fs'
import path from 'path'
import { transform } from 'babel-core'

export default function loader (source, options) {
  return new Promise((resolve) => {
    let babelRcFile = path.join(options.rootDir, '.babelrc')
    let babelOptions = {}

    if (fs.existsSync(babelRcFile)) {
      babelOptions = Object.assign({}, babelOptions, {
        extends: babelRcFile,
        babelrc: true
      })
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
