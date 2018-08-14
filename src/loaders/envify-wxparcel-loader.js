import envifyReplace from 'loose-envify/replace'

export default function envifyLoader (source, options = {}) {
  return new Promise((resolve) => {
    let { options: envifyOptions } = options
    let env = Object.assign({}, process.env, envifyOptions.env)
    let code = envifyReplace(source.toString(), [env || process.env])
    resolve(Buffer.from(code))
  })
}
