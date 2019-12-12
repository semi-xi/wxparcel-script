import * as Typings from '../typings'
const imagemin = require('imagemin')
const imageminJpegtran = require('imagemin-jpegtran')
const imageminPngquant = require('imagemin-pngquant')

/**
 * 代码替换加载器
 * @param asset 资源对象
 * @param options 配置
 */
const ImageLoader: Typings.ParcelLoader = async (asset) => {

  let { content } = asset

  const code: Buffer = await imagemin.buffer(content, {
    plugins: [
      imageminJpegtran(),
      imageminPngquant({
        quality: [0.6, 0.8]
      })
    ]
  })
  const originSize: number = (content as Buffer).byteLength
  const compressedSize: number = code.byteLength
  return originSize > compressedSize ? { code } : { code: content }
}

export default ImageLoader
