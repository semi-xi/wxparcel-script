import { render } from 'node-sass'

const DEFAULTS_OPTIONS = {
  outputStyle: 'compressed',
  sourceComments: false,
  sourceMap: false
}

/**
 * Sass 加载器
 *
 * @export
 * @param {String} source 代码块
 * @param {Object} [options={}] 配置, 可参考 require('node-sass').redner 中的配置: https://github.com/sass/node-sass#options
 * @return {Promise}
 */
export default function SassLoader (source, options) {
  source = source.toString()

  return new Promise((resolve, reject) => {
    let { file, options: SassOptions } = options
    let params = { file, data: source }
    options = Object.assign({}, DEFAULTS_OPTIONS, SassOptions, params)

    render(options, (error, source) => {
      if (error) {
        reject(error)
        return
      }

      let { css: code } = source
      resolve(Buffer.from(code))
    })
  })
}
