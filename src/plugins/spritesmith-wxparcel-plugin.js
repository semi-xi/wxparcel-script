import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'
import forEach from 'lodash/forEach'
import trimStart from 'lodash/trimStart'
import trimEnd from 'lodash/trimEnd'
import defaultsDeep from 'lodash/defaultsDeep'
import Spritesmith from 'spritesmith'
import SpritesmithTemplate from 'spritesheet-templates'

const directory = 'sprites'
const imageFile = 'sprites/sprite.png'
const styleFile = 'sprites/sprite.scss'
const template = 'sprite.scss.template.handlebars'

export default class SpritesmithPlugin {
  constructor (options = {}) {
    this.options = Object.assign({ imageFile, styleFile, directory, template }, options)
  }

  applyBeforeTransform (assets, options, printer) {
    options = defaultsDeep(options, this.options)

    let {
      execDir, srcDir, tmplDir, staticDir, pubPath,
      template, imageFile, styleFile, directory
    } = options

    directory = path.join(srcDir, directory)
    template = path.join(directory, template)

    if (!(template && fs.existsSync(template))) {
      template = path.join(execDir, 'sources/sprite.scss.template.handlebars')

      if (!fs.existsSync(template)) {
        return Promise.reject(new Error(`Template ${template} is not found or not be provied`))
      }
    }

    let source = fs.readFileSync(template, 'utf8')
    SpritesmithTemplate.addHandlebarsTemplate('spriteScssTemplate', source)

    return new Promise((resolve, reject) => {
      let files = this.findSprites(directory, /\.(png|jpe?g)$/)
      Spritesmith.run({ src: files }, function (error, result) {
        if (error) {
          if (error instanceof Error || error instanceof TypeError) {
            error = new Error(error)
          }

          reject(error)
          return
        }

        let { image: buffer, coordinates, properties } = result

        let sprites = []
        forEach(coordinates, (data, imageFile) => {
          let name = path.basename(imageFile).replace(path.extname(imageFile), '')
          let prop = { name, total_width: properties.width, total_height: properties.height }
          sprites.push(Object.assign(prop, data))
        })

        let filename = path.basename(imageFile)
        let extname = path.extname(imageFile)
        let basename = filename.replace(extname, '')
        imageFile = path.join(imageFile.replace(filename, ''), basename + '.' + gen(buffer) + extname)

        /**
         * windows 是使用反斜杠, 路径与 URL 路径不相同
         * 且反斜杠容易造成转义情况, 例如 \s, 因此这里
         * 需要做一下处理
         */
        let image = trimEnd(pubPath, '/') + '/' + trimStart(imageFile, '/')
        image = image.replace(/\\/g, '/')

        let spritesheet = Object.assign({ image }, properties)
        let source = SpritesmithTemplate({ sprites, spritesheet }, { format: 'spriteScssTemplate' })

        let StyleFile = path.join(tmplDir, styleFile)
        fs.ensureFileSync(StyleFile)
        fs.writeFileSync(StyleFile, source)

        let ImageFile = path.join(staticDir, imageFile)
        assets.add(ImageFile, {
          content: buffer,
          destination: ImageFile
        })

        resolve()
      })
    })
  }

  findSprites (directory, pattern) {
    let results = []
    if (!fs.statSync(directory).isDirectory()) {
      results.push(pattern.test(directory))
      return results
    }

    let files = fs.readdirSync(directory)
    files.forEach((filename) => {
      let file = path.join(directory, filename)
      if (fs.statSync(file).isDirectory()) {
        let sub = this.findSprites(file, pattern)
        results = results.concat(sub)
        return
      }

      if (pattern.test(file)) {
        results.push(file)
      }
    })

    return results
  }
}

const gen = function (source) {
  return crypto
    .createHash('md5')
    .update(source)
    .digest('hex')
}
