import UglifyJS from 'uglify-js'

export default function uglifyjsLoader (source, options) {
  return new Promise((resolve, reject) => {
    let { options: uglifyOptions } = options
    let { error, code } = UglifyJS.minify(source.toString(), uglifyOptions || {})
    error ? reject(error) : resolve(Buffer.from(code))
  })
}
