import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'
import trimEnd from 'lodash/trimEnd'
import trimStart from 'lodash/trimStart'

const escapeRegExp = function (source) {
  return source.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
}

const gen = function (source) {
  return crypto
    .createHash('md5')
    .update(source)
    .digest('hex')
}

const genFileSync = function (file) {
  let source = fs.readFileSync(file)
  return gen(source)
}

const WXML_IMAGE_REGEXP = /<image[^>]+.*?src=["']?([^"'\s]+)["']?.*?\s*(\/>|><\/image>)/i
const WXSS_IMAGE_REGEXP = /url\(["']?([^"'\s]+)["']?\)/i
const REQUIRE_REGEXP = /require\(["']?([^"'\s]+)["']?\)/i
const FILE_REGEXPS = {
  '.html': WXML_IMAGE_REGEXP,
  '.wxml': WXML_IMAGE_REGEXP,
  '.wxss': WXSS_IMAGE_REGEXP,
  '.css': WXSS_IMAGE_REGEXP,
  '.scss': WXSS_IMAGE_REGEXP,
  '.js': REQUIRE_REGEXP,
  '.wxs': {
    regexp: REQUIRE_REGEXP,
    replace (source, string, url) {
      return source.replace(new RegExp(escapeRegExp(string), 'g'), `'${url}'`)
    }
  }
}

export default function fileLoader (source, options, instance) {
  return new Promise((resolve) => {
    let { file, fileOptions } = options
    let fileRegexp = Object.assign({}, FILE_REGEXPS, fileOptions)
    let extname = path.extname(file)
    let regexp = fileRegexp[extname]

    if (!regexp) {
      resolve(source)
      return
    }

    source = source.toString()

    let { srcDir, rootDir, pubPath, staticDir } = options
    let directory = path.dirname(file)
    let dependencies = []

    let replacement = function (source, string, url, regexp) {
      source = source.replace(new RegExp(escapeRegExp(string), 'g'), () => {
        return string.replace(regexp, (string, file) => {
          return string.replace(file, url)
        })
      })

      return source
    }

    if (!(regexp instanceof RegExp)) {
      replacement = regexp.replace
      regexp = regexp.regexp
    }

    let code = source
    // eslint-disable-next-line no-unmodified-loop-condition
    while (regexp instanceof RegExp) {
      let match = regexp.exec(code)
      if (!match) {
        break
      }

      let [string, relativePath] = match
      code = code.replace(new RegExp(escapeRegExp(string), 'g'), '')

      // base64 source
      if (/^data:([\w/]+?);base64,/.test(relativePath)) {
        continue
      }

      // remote source
      if (/^https?:\/\//.test(relativePath)) {
        continue
      }

      // alisa path source
      let dependency = ''
      switch (relativePath.charAt(0)) {
        case '~':
          dependency = path.join(srcDir, relativePath)
          break
        case '/':
          dependency = path.join(rootDir, relativePath)
          break
        case '.':
          dependency = path.join(directory, relativePath)
          break
        default:
          continue
      }

      // js source
      let filename = path.basename(dependency)
      let extname = path.extname(filename)

      // js extname source
      if (['.js', 'es6', ''].indexOf(extname) !== -1) {
        dependencies.push(dependency)
        continue
      }

      // ingore extname source and check the file exists
      if (extname && !fileRegexp.hasOwnProperty(extname)) {
        let truthyDependency = dependency + '.js'
        if (fs.existsSync(truthyDependency)) {
          dependencies.push(truthyDependency)
          continue
        }
      }

      // others valid files
      let basename = path.basename(filename).replace(extname, '')
      filename = basename + '.' + genFileSync(dependency) + extname

      let destination = path.join(staticDir, filename)
      if (dependencies.indexOf(dependency) === -1) {
        dependencies.push(dependency)
        instance.emitFile(file, destination, dependency, match[1])
      }

      /**
       * 这里使用 `/` 而非 `path.sep`, 但必须要过滤 `path.sep`
       * 以防 windows 路径与 web 路径不统一
       */
      let url = trimEnd(pubPath, path.sep) + '/' + trimStart(destination.replace(staticDir, ''), path.sep)
      source = replacement(source, string, url, regexp)
    }

    resolve(Buffer.from(source))
  })
}
