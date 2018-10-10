import UglifyJS from 'uglify-js'

/**
 * Javascript 压缩加载器
 *
 * @export
 * @param {Object} asset 资源对象
 * @param {Object} [options={}] 配置, 可参考 require('uglify-js').minify 中的配置: https://github.com/mishoo/UglifyJS#usage
 * @return {Promise}
 */
export default function UglifyjsLoader (asset, options = {}) {
  return new Promise((resolve, reject) => {
    let { file, content, map: assetMap } = asset
    let { options: uglifyOptions } = options

    content = content.toString()

    let defaultOptions = {}
    if (assetMap) {
      defaultOptions.sourceMap = {
        content: assetMap
      }
    }

    uglifyOptions = Object.assign({}, defaultOptions, uglifyOptions)

    let { error, code, map } = UglifyJS.minify({ [file]: content }, uglifyOptions)
    if (error) {
      reject(error)
      return
    }

    code = Buffer.from(code)
    resolve({ code, map })
  })
}
