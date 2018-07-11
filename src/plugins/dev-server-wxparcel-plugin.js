import http from 'http'
import colors from 'colors'
import ip from 'ip'
import Finalhandler from 'finalhandler'
import ServeStatic from 'serve-static'

export default class DevServerPlugin {
  constructor (options = {}) {
    this.options = Object.assign({ port: 3000 }, options)
  }

  async apply (hook, options, printer) {
    if (hook === 'async') {
      return this.applyAsync(options, printer)
    }
  }

  async applyAsync (options, printer) {
    options = options.connect(this.options)
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
