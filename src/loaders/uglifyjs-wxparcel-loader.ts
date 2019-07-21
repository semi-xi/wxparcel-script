import defaultsDeep from 'lodash/defaultsDeep'
import { localRequire } from '../share/module'
import { MinifyOptions } from 'uglify-es'
import * as Typings from '../typings'

interface UglifyjsOptions extends Typings.ParcelLoaderOptions {
  options: MinifyOptions
}

/**
 * Javascript 压缩加载器
 * @param asset 资源对象
 * @param options 配置, 可参考 require('uglify-js').minify 中的配置: https://github.com/mishoo/UglifyJS#usage
 */
const UglifyjsLoader: Typings.ParcelLoader = async (asset, options: UglifyjsOptions) => {
  const UglifyJS = await localRequire('uglify-es', options.rootDir, true)

  return new Promise((resolve, reject) => {
    let { file, content, sourceMap } = asset
    let { options: uglifyOptions, sourceMap: useSourceMap } = options

    content = content.toString()

    let defaultOptions: any = {}
    if (useSourceMap !== false && sourceMap) {
      defaultOptions.sourceMap = {
        content: sourceMap
      }
    }

    uglifyOptions = defaultsDeep({}, uglifyOptions, defaultOptions)

    let result = UglifyJS.minify({ [file]: content }, uglifyOptions)
    let { code, map } = result
    let error: any = result.error

    if (error) {
      let lines = content.split('\n')
      let line = lines[error.line - 1]
      let fragment = line.substr(error.col - 10, 10)
      fragment = `${fragment} ${line.substr(error.col, 100)}\n${new Array(fragment.length + 1).fill(' ').join('')}^`
      error.fragment = fragment

      reject(error)
      return
    }

    const buffer = Buffer.from(code)
    resolve({ code: buffer, map })
  })
}

export default UglifyjsLoader
