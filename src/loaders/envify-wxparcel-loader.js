import envifyReplace from 'loose-envify/replace'

/**
 * 代码替换加载器
 *
 * @export
 * @param {Object} asset 资源对象
 * @param {Object} [options={}] 配置
 * @param {Object} options.env 可以替换的全局变量
 * @return {Promise}
 */
export default function EnvifyLoader (asset, options = {}) {
  return new Promise((resolve) => {
    let { content } = asset
    let { options: envifyOptions } = options

    content = content.toString()
    let env = Object.assign({}, process.env, envifyOptions.env)
    let code = envifyReplace(content, [env || process.env])

    code = Buffer.from(code)
    resolve({ code })
  })
}
