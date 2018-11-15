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
const template = path.join(__dirname, 'sprite.scss.template.handlebars')

/**
 * 雪碧图插件
 *
 * @export
 * @class SpritesmithPlugin
 */
export default class SpritesmithPlugin {
  /**
   * Creates an instance of CleanPlugin.
   * @param {Object} [options={}] 配置
   */
  constructor (options = {}) {
    /**
     * 配置管理器
     *
     * @type {OptionManager}
     */
    this.options = Object.assign({ imageFile, styleFile, directory, template }, options)
  }

  /**
   * 编译器运行
   *
   * @param {Object} options 配置
   * @param {String} options.directory 图片目录(相对于 srcDir 路径, 也可以设置成绝对略经)
   * @param {String} options.imageFile 生成图片路径名称(相对于 staticDir, 也可以设置成绝对略经)
   * @param {String} options.imageFile 生成图片样式路径(相对于 tmplDir, 也可以设置成绝对略经)
   * @param {String} options.template 模板路径(相对于 srcDir 路径, 也可以设置成绝对略经)
   * @return {Promise}
   */
  applyBeforeTransform (assets, options) {
    options = defaultsDeep(options, this.options)

    const { srcDir, tmplDir, staticDir, pubPath } = options
    let { directory, imageFile, styleFile, template } = options

    if (!path.isAbsolute(directory)) {
      directory = path.join(srcDir, directory)
    }

    if (!path.isAbsolute(imageFile)) {
      imageFile = path.join(staticDir, imageFile)
    }

    if (!path.isAbsolute(styleFile)) {
      styleFile = path.join(tmplDir, styleFile)
    }

    if (!path.isAbsolute(template)) {
      template = path.join(srcDir, template)
    }

    if (!fs.existsSync(template)) {
      return Promise.reject(new Error(`Template ${template} is not found or not be provied`))
    }

    let source = fs.readFileSync(template, 'utf8')
    SpritesmithTemplate.addHandlebarsTemplate('spriteScssTemplate', source)

    // 寻找所有的图片
    return this.findSprites(directory, /\.(png|jpe?g)$/).then((files) => {
      // 生成精灵图
      return spritesmithAsync({ src: files }).then((result) => {
        let { image: buffer, coordinates, properties } = result

        // 获取精灵图的属性
        let sprites = []
        forEach(coordinates, (data, imageFile) => {
          let name = path.basename(imageFile).replace(path.extname(imageFile), '')
          let props = { name, total_width: properties.width, total_height: properties.height }

          props = Object.assign(props, data)
          sprites.push(props)
        })

        // 拼接哈希值
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

        // 生成样式文件
        let spritesheet = Object.assign({ image }, properties)
        let source = SpritesmithTemplate({ sprites, spritesheet }, { format: 'spriteScssTemplate' })

        // 写文件
        fs.ensureFileSync(styleFile)
        fs.writeFileSync(styleFile, source)

        // 添加资源文件
        let state = {
          content: buffer,
          destination: imageFile,
          dependencies: files
        }

        assets.add(imageFile, state)
      })
    })
  }

  /**
   * 查找所有精灵图图片
   *
   * @param {String} directory 目录
   * @param {RegExp} pattern 正则匹配
   * @returns {Promise} [file]
   */
  async findSprites (directory, pattern) {
    let results = []
    let stat = await statAsync(directory)

    if (!stat.isDirectory()) {
      results.push(pattern.test(directory))
      return results
    }

    let files = await readdirAsync(directory)
    let promises = files.map(async (filename) => {
      let file = path.join(directory, filename)
      let stat = await statAsync(file)

      if (stat.isDirectory()) {
        let sub = await this.findSprites(file, pattern)
        results = results.concat(sub)
        return
      }

      if (pattern.test(file)) {
        results.push(file)
      }
    })

    await Promise.all(promises)
    return results
  }
}

const gen = (source) => crypto.createHash('md5').update(source).digest('hex')
const promiseify = (asyncHandle) => (...args) => new Promise((resolve, reject) => asyncHandle(...args, (error, result) => error ? reject(error) : resolve(result)))
const statAsync = promiseify(fs.stat.bind(fs))
const readdirAsync = promiseify(fs.readdir.bind(fs))
const spritesmithAsync = promiseify(Spritesmith.run.bind(Spritesmith))
