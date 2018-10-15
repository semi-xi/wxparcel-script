import fs from 'fs'
import path from 'path'
import { transform } from 'babel-core'

/**
 * Babel 加载器
 *
 * @export
 * @param {Object} asset 资源对象
 * @param {Object} options 配置, 配置参考 require('babel-core').transform 中的配置, https://babeljs.io/docs/en/next/babel-core.html
 * @return {Promise}
 */
export default function BabelLoader (asset, options) {
  return new Promise((resolve) => {
    let { file, content } = asset
    let { options: babelOptions } = options
    let babelrc = path.join(options.rootDir, '.babelrc')

    content = content.toString()

    if (fs.existsSync(babelrc)) {
      let defaultOptions = {
        comments: false,
        sourceFileName: file.replace(options.srcDir + '/', ''),
        sourceMaps: true,
        extends: babelrc,
        babelrc: true
      }

      babelOptions = Object.assign({}, defaultOptions, babelOptions)
    }

    let { code, map } = transform(content, babelOptions)
    let regexp = /require\(["'\s]+(.+?)["'\s]+\)/g
    let surplus = code
    let match = null

    // eslint-disable-next-line no-cond-assign
    while (match = regexp.exec(surplus)) {
      let [all, path] = match
      surplus = surplus.replace(all, '')
      code = code.replace(all, `require('${path.replace(/\\/g, '/')}')`)
    }

    resolve({ code, map })
  })
}
