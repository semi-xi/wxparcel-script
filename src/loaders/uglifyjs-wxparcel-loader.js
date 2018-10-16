import defaultsDeep from 'lodash/defaultsDeep'
import UglifyJS from 'uglify-es'
import colors from 'colors'

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
    let { file, content, sourceMap } = asset
    let { options: uglifyOptions, sourceMap: useSourceMap } = options

    content = content.toString()

    let defaultOptions = {}
    if (useSourceMap !== false && sourceMap) {
      defaultOptions.sourceMap = {
        content: sourceMap
      }
    }

    uglifyOptions = defaultsDeep({}, uglifyOptions, defaultOptions)

    let { error, code, map } = UglifyJS.minify({ [file]: content }, uglifyOptions)
    if (error) {
      let lines = content.split('\n')
      let line = lines[error.line - 1]
      let prevFragment = line.substr(error.col - 10, 10)
      let fragment = line.substr(error.col, 100)
      let message = `\n错误代码为: ${prevFragment}${colors.red('^')}${fragment}\n`
      error.detail = message

      reject(error)
      return
    }

    code = Buffer.from(code)
    resolve({ code, map })
  })
}
