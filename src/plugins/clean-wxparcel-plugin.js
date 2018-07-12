import fs from 'fs-extra'
import colors from 'colors'
import template from 'lodash/template'
import defaultsDeep from 'lodash/defaultsDeep'

const remove = fs.remove.bind(fs)

export default class CleanPlugin {
  constructor (options = {}) {
    this.options = options || {}
  }

  async applyBefore (options, printer) {
    options = defaultsDeep(options, this.options)

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
