import fs from 'fs-extra'
import colors from 'colors'
import template from 'lodash/template'

const remove = fs.remove.bind(fs)

export default class CleanPlugin {
  constructor (options = {}) {
    this.options = options || {}
  }

  async apply (hook, options, printer) {
    if (hook === 'before') {
      return this.applyBefore(options, printer)
    }
  }

  async applyBefore (options, printer) {
    options = options.connect(this.options)

    let alisas = options.alisas || []
    let files = []

    alisas.forEach((alisa) => {
      let renderer = template(`<%= ${alisa} %>`)
      let file = renderer(options)
      file && files.push(file)
    })

    let tasks = files.map((file) => remove(file))
    await Promise.all(tasks)

    files.forEach((file) => {
      printer.trace(`${colors.cyan.bold(file)} has been removed`)
    })
  }
}
