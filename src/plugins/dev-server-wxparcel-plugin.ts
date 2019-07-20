import http, { ServerResponse } from 'http'
import ipPortRegex from 'ip-port-regex'
import Finalhandler from 'finalhandler'
import ServeStatic, { ServeStaticOptions } from 'serve-static'
import defaultsDeep from 'lodash/defaultsDeep'
import OptionManager from '../libs/OptionManager'
import * as Typings from '../typings'

export interface DevServerOptions extends ServeStaticOptions {
  /**
   * 端口
   */
  port?: number
}

/**
 * 静态服务插件
 */
export default class DevServerPlugin implements Typings.ParcelPlugin {
  /**
   * 配置
   */
  public options: DevServerOptions

  constructor (options: DevServerOptions = {}) {
    this.options = defaultsDeep({}, options)
  }

  /**
   * 允许跨域
   * @param response 返回内容
   */
  public enableCors (response: ServerResponse) {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader(
      'Access-Control-Allow-Methods',
      'GET, HEAD, PUT, PATCH, POST, DELETE'
    )

    response.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Content-Type'
    )
  }

  /**
   * 设置头部
   *
   * @param response 返回内容
   */
  public setHeaders (response: ServerResponse) {
    this.enableCors(response)
  }

  /**
   * 在编译过程中异步执行
   *
   * @param options 配置
   */
  public async applyAsync (options: NonFunctionProperties<OptionManager>) {
    let config: DevServerOptions & NonFunctionProperties<OptionManager> = defaultsDeep({}, options, this.options)

    if (config.watching === false) {
      return Promise.resolve()
    }

    let { staticDir, pubPath } = config
    let settings = {
      index: false,
      setHeaders: this.setHeaders.bind(this)
    }

    let serverOptions = Object.assign(settings, config)
    let serve = ServeStatic(staticDir, serverOptions)
    let server = http.createServer((request, response) => {
      serve(request as any, response as any, Finalhandler(request, response))
    })

    let match = ipPortRegex.parts(pubPath) || {}
    let port = config.port || match.port
    server.listen(port, '0.0.0.0')

    server.on('error', (error) => console.error(error))
  }
}
