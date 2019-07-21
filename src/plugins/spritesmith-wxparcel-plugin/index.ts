import fs from 'fs-extra'
import * as path from 'path'
import { promisify } from 'util'
import crypto from 'crypto'
import forEach from 'lodash/forEach'
import trimStart from 'lodash/trimStart'
import trimEnd from 'lodash/trimEnd'
import defaultsDeep from 'lodash/defaultsDeep'
import OptionManager from '../../libs/OptionManager'
import Assets from '../../libs/Assets'
import { localRequire } from '../../share/module'
import * as Typings from '../../typings'

const directory = 'sprites'
const imageFile = 'sprites/sprite.png'
const styleFile = 'sprites/sprite.scss'
const template = path.join(__dirname, 'sprite.scss.template.handlebars')

export interface SpritesmithOptions {
  /**
   * 图片根目录
   */
  directory?: string

  /**
   * 生成精灵图存放位置
   */
  imageFile?: string

  /**
   * 生成样式文件存放位置
   */
  styleFile?: string

  /**
   * 样式文件模板位置
   */
  template?: string
}

/**
 * 雪碧图插件
 *
 * @export
 * @class SpritesmithPlugin
 */
export default class SpritesmithPlugin implements Typings.ParcelPlugin {
  /**
   * 配置
   */
  public options: SpritesmithOptions

  constructor (options: SpritesmithOptions = {}) {
    this.options = Object.assign({ directory, imageFile, styleFile, template }, options)
  }

  /**
   * 编译器运行
   * @param options 配置
   * @param options.directory 图片目录(相对于 srcDir 路径, 也可以设置成绝对略经)
   * @param options.imageFile 生成图片路径名称(相对于 staticDir, 也可以设置成绝对略经)
   * @param options.styleFile 生成图片样式路径(相对于 tmplDir, 也可以设置成绝对略经)
   * @param options.template 模板路径(相对于 srcDir 路径, 也可以设置成绝对略经)
   */
  public async applyBeforeTransform (assets: Assets, options: NonFunctionProperties<OptionManager>) {
    let config: SpritesmithOptions & NonFunctionProperties<OptionManager> = defaultsDeep(options, this.options)

    const [Spritesmith, SpritesmithTemplate] = await localRequire(['spritesmith', 'spritesheet-templates'], options.rootDir, true)
    const spritesmithAsync = promisify(Spritesmith.run.bind(Spritesmith))

    const { srcDir, tmplDir, staticDir, pubPath } = config
    let { directory, imageFile, styleFile, template } = config

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
        let relativeImagefile = imageFile.replace(staticDir, '')
        let image = trimEnd(pubPath, '/') + '/' + trimStart(relativeImagefile, '/')
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
   * @param directory 目录
   * @param pattern 正则匹配
   * @returns {Promise<string[]>} 文件
   */
  public async findSprites (directory: string, pattern: RegExp): Promise<string[]> {
    let results = []
    let stat = await fs.stat(directory)

    if (!stat.isDirectory()) {
      results.push(pattern.test(directory))
      return results
    }

    let files = await fs.readdir(directory)
    let promises = files.map(async (filename) => {
      let file = path.join(directory, filename)
      let stat = await fs.stat(file)

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

const gen = (source: string) => crypto.createHash('md5').update(source).digest('hex').substr(0, 7)
