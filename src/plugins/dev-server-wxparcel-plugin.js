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

  setHeaders (response) {
    this.enableCors(response)
  }

  async applyAsync (options, printer) {
    options = defaultsDeep(options, this.options)
    let { staticDir, pubPath, port } = options

    let serve = ServeStatic(staticDir, {
      index: false,
      setHeaders: this.setHeaders.bind(this)
    })

    let server = http.createServer((request, response) => {
      serve(request, response, Finalhandler(request, response))
    })

    server.listen(port, '0.0.0.0')

    server.on('error', (error) => {
      printer.error(error)
    })

    server.once('listening', () => {
      printer.layze(`Static server is running at ${colors.cyan.bold(`${ip.address()}:${port}`)}`)
      printer.layze(`Static output is served from ${colors.cyan.bold(pubPath)}`)
      printer.layze('')
    })
  }
}
