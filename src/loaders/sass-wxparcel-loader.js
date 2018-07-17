import { render } from 'node-sass'

const DEFAULTS_OPTIONS = {
  outputStyle: 'compressed',
  sourceComments: false,
  sourceMap: false
}

export default function sassLoader (source, options) {
  return new Promise((resolve, reject) => {
    let { file, options: SassOptions } = options
    let params = { file, data: source }
    options = Object.assign({}, DEFAULTS_OPTIONS, SassOptions, params)

    render(options, (error, source) => {
      if (error) {
        reject(error)
        return
      }

      let { css: code } = source
      resolve(code)
    })
  })
}
