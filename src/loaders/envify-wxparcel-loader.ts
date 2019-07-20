import envifyReplace from 'loose-envify/replace'
import * as Typings from '../typings'

interface EnvifyOptions extends Typings.ParcelLoaderOptions {
  options: {
    env: any
  }
}

/**
 * 代码替换加载器
 * @param asset 资源对象
 * @param options 配置
 */
const EnvifyLoader: Typings.ParcelLoader = (asset, options: EnvifyOptions) => {
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

export default EnvifyLoader
