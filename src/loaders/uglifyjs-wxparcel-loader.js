import UglifyJS from 'uglify-js'

/**
 * Javascript 压缩加载器
 *
 * @export
 * @param {String} source 代码块
 * @param {Object} [options={}] 配置, 可参考 require('uglify-js').minify 中的配置: https://github.com/mishoo/UglifyJS#usage
 * @return {Promise}
 */
export default function UglifyjsLoader (source, options) {
  return new Promise((resolve, reject) => {
    let { options: uglifyOptions } = options
    let { error, code } = UglifyJS.minify(source.toString(), uglifyOptions || {})
    error ? reject(error) : resolve(Buffer.from(code))
  })
}
