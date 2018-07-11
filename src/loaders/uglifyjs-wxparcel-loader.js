import UglifyJS from 'uglify-js'

export default function uglifyjsLoader (source, options) {
  return new Promise((resolve, reject) => {
    let { rule } = options
    let { error, code } = UglifyJS.minify(source, rule.options || {})
    error ? reject(error) : resolve(code)
  })
}
