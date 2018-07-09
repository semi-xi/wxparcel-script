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

const WXML_IMAGE_REGEXP = /<image[^>]+.*?src=["']?([^"'\s]+)["']?.*?\s*(\/>|><\/image>)/ig
const WXSS_IMAGE_REGEXP = /url\(["']?([^"'\s]+)["']?\)/ig
const REQUIRE_REGEXP = /require\(["']?([^"'\s]+)["']?\)/ig
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

export default function fileLoader (source, options) {
  return new Promise((resolve) => {
    let { file, rules } = options
    let fileRegexp = Object.assign({}, rules, FILE_REGEXPS)
    let extname = path.extname(file)
    let regexp = fileRegexp[extname]

    if (!regexp) {
      resolve(source)
      return
    }

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

      if (/^data:([\w/]+?);base64,/.test(relativePath)) {
        continue
      }

      if (/^https?:\/\//.test(relativePath)) {
        continue
      }

      let filename = path.basename(relativePath)
      let extname = path.extname(filename)
      if (!extname || fileRegexp.hasOwnProperty(extname)) {
        continue
      }

      let file = ''
      switch (relativePath.charAt(0)) {
        case '~':
          file = path.join(srcDir, relativePath)
          break
        case '/':
          file = path.join(rootDir, relativePath)
          break
        case '.':
          file = path.join(directory, relativePath)
          break
        default:
          continue
      }

      let basename = path.basename(filename).replace(extname, '')
      filename = basename + '.' + genFileSync(file) + extname

      let destination = path.join(staticDir, filename)
      if (dependencies.findIndex((item) => item.file === file) === -1) {
        dependencies.push({ file, destination })
        this.emitFile({ file, destination })
      }

      let url = trimEnd(pubPath, '/') + '/' + trimStart(destination.replace(staticDir, ''), '/')
      source = replacement(source, string, url, regexp)
    }

    resolve(source)
  })
}
