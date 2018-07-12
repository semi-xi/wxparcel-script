import http from 'http'
import colors from 'colors'
import ip from 'ip'
import Finalhandler from 'finalhandler'
import ServeStatic from 'serve-static'
import defaultsDeep from 'lodash/defaultsDeep'

export default class DevServerPlugin {
  constructor (options = {}) {
    this.options = Object.assign({ port: 3000 }, options)
  }

  async applyAsync (options, printer) {
    options = defaultsDeep(options, this.options)
    let { staticDir, pubPath, port } = options

    let serve = ServeStatic(staticDir)
    let server = http.createServer((request, response) => {
      serve(request, response, Finalhandler(request, response))
    })

    server.listen(port, '0.0.0.0')

    printer.layze(`Static server is running at ${colors.cyan.bold(`${ip.address()}:${port}`)}`)
    printer.layze(`Static output is served from ${colors.cyan.bold(pubPath)}`)
    printer.layze('')
  }
}
