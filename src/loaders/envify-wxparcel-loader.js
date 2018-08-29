import envifyReplace from 'loose-envify/replace'

/**
 * 代码替换加载器
 *
 * @export
 * @param {String} source 代码块
 * @param {Object} [options={}] 配置
 * @param {Object} options.env 可以替换的全局变量
 * @return {Promise}
 */
export default function EnvifyLoader (source, options = {}) {
  return new Promise((resolve) => {
    let { options: envifyOptions } = options
    let env = Object.assign({}, process.env, envifyOptions.env)
    let code = envifyReplace(source.toString(), [env || process.env])
    resolve(Buffer.from(code))
  })
}
