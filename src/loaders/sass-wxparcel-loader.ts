import { localRequire } from '../share/module'
import { Options as NodeSassOptions } from 'node-sass'
import * as Typings from '../typings'

interface SassOptions extends Typings.ParcelLoaderOptions {
  options: NodeSassOptions
}

/**
 * Sass 加载器
 * @param asset 资源对象
 * @param options 配置, 可参考 require('node-sass').redner 中的配置: https://github.com/sass/node-sass#options
 */
export const SassLoader: Typings.ParcelLoader = async (asset, options: SassOptions) => {
  const { render } = await localRequire('node-sass', options.rootDir, true)
  return new Promise((resolve, reject) => {
    const { content } = asset
    const { tmplDir, rootDir, srcDir } = options
    const { file, options: sassOptions } = options

    const data = content.toString()
    const params = { file, data }

    const defaultOptions = {
      includePaths: [tmplDir, rootDir, srcDir],
      outputStyle: 'compressed',
      sourceComments: false,
      sourceMap: true
    }

    render(Object.assign({}, defaultOptions, sassOptions, params), (error, result) => {
      if (error) {
        reject(error)
        return
      }

      let { css: code, map, stats } = result
      let dependencies = stats.includedFiles || []
      resolve({ code, map, dependencies })
    })
  })
}

export default SassLoader
