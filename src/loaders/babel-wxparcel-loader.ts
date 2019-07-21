import fs from 'fs'
import path from 'path'
import { localRequire } from '../share/module'
import { TransformOptions } from '@babel/core'
import * as Typings from '../typings'

interface BabelOptions extends Typings.ParcelLoaderOptions {
  options: TransformOptions
}

/**
 * Babel 加载器
 * @param asset 资源对象
 * @param options 配置, 配置参考 require('@babel/core').transform 中的配置, https://babeljs.io/docs/en/next/babel-core.html
 */
const BabelLoader: Typings.ParcelLoader = async (asset, options: BabelOptions) => {
  const { transform } = await localRequire('@babel/core', options.rootDir, true)

  return new Promise((resolve) => {
    let { file, content } = asset
    let { options: babelOptions, sourceMap: useSourceMap } = options
    let babelrc = path.join(options.rootDir, '.babelrc')

    content = content.toString()

    if (fs.existsSync(babelrc)) {
      let defaultOptions = {
        comments: false,
        sourceRoot: 'local',
        sourceFileName: file.replace(options.srcDir + path.sep, '').replace(/\\/g, '/'),
        sourceMaps: true,
        extends: babelrc,
        babelrc: true
      }

      if (useSourceMap !== false) {
        Object.assign(defaultOptions, {
          sourceRoot: 'local',
          sourceFileName: file.replace(options.srcDir + path.sep, '').replace(/\\/g, '/'),
          sourceMaps: true
        })
      }

      babelOptions = Object.assign({}, defaultOptions, babelOptions)
    }

    let { code, map } = transform(content, babelOptions)
    let regexp = /require\(["'\s]+(.+?)["'\s]+\)/g
    let surplus = code
    let match = null

    // tslint:disable-next-line:no-conditional-assignment
    while (match = regexp.exec(surplus)) {
      let [all, path] = match
      surplus = surplus.replace(all, '')
      code = code.replace(all, `require('${path.replace(/\\/g, '/')}')`)
    }

    resolve({ code, map })
  })
}

export default BabelLoader
