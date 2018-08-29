import fs from 'fs'
import path from 'path'
import { transform } from 'babel-core'

/**
 * Babel 加载器
 *
 * @export
 * @param {String|Buffer} source 代码片段
 * @param {Object} options 配置, 配置参考 require('babel-core').transform 中的配置, https://babeljs.io/docs/en/next/babel-core.html
 * @return {Promise}
 */
export default function BabelLoader (source, options) {
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
