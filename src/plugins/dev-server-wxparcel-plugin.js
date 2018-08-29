import http from 'http'
import colors from 'colors'
import ip from 'ip'
import ipPortRegex from 'ip-port-regex'
import Finalhandler from 'finalhandler'
import ServeStatic from 'serve-static'
import defaultsDeep from 'lodash/defaultsDeep'

/**
 * 静态服务插件
 *
 * @export
 * @class DevServerPlugin
 */
export default class DevServerPlugin {
  /**
   * Creates an instance of DevServerPlugin.
   * @param {Object} [options={}] 配置, 参考 require('serve-static)(path, options) 中的配置: https://github.com/expressjs/serve-static#options
   */
  constructor (options = {}) {
    /**
     * 配置管理器
     *
     * @type {OptionManager}
     */
    this.options = Object.assign({}, options)
  }

  /**
   * 允许跨域
   *
   * @param {Object} response 返回内容
   */
  enableCors (response) {
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
   * @param {Object} response 返回内容
   */
  setHeaders (response) {
    this.enableCors(response)
  }

  /**
   * 在编译过程中异步执行
   *
   * @param {Object} options 配置
   * @param {Printer} printer 记录管理工具
   */
  async applyAsync (options, printer) {
    options = defaultsDeep(options, this.options)

    let { staticDir, pubPath } = options
    let serverOptions = Object.assign({
      index: false,
      setHeaders: this.setHeaders.bind(this)
    }, options)

    let serve = ServeStatic(staticDir, serverOptions)
    let server = http.createServer((request, response) => {
      serve(request, response, Finalhandler(request, response))
    })

    let match = ipPortRegex.parts(pubPath) || {}
    let port = options.port || match.port
    server.listen(port, '0.0.0.0')

    server.on('error', (error) => printer.error(error))

    server.once('listening', () => {
      printer.layze(`Static server is running at ${colors.cyan.bold(`${ip.address()}:${port}`)}`)
      printer.layze(`Static output is served from ${colors.cyan.bold(pubPath)}`)
      printer.layze('')
    })
  }
}
