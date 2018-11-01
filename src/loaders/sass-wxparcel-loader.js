import { render } from 'node-sass'

/**
 * Sass 加载器
 *
 * @export
 * @param {Object} asset 资源对象
 * @param {Object} [options={}] 配置, 可参考 require('node-sass').redner 中的配置: https://github.com/sass/node-sass#options
 * @return {Promise}
 */
export default function SassLoader (asset, options = {}) {
  return new Promise((resolve, reject) => {
    let { content } = asset
    let { file, options: sassOptions } = options

    let data = content.toString()
    let params = { file, data }

    let defaultOptions = {
      outputStyle: 'compressed',
      sourceComments: false,
      sourceMap: true
    }

    options = Object.assign({}, defaultOptions, sassOptions, params)

    render(options, (error, result) => {
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
