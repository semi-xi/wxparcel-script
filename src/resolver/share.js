import fs from 'fs-extra'
import crypto from 'crypto'

/**
 * 反斜杠转义
 *
 * @param {String} source 代码
 * @return {String} 代码
 */
export const escapeRegExp = function (source) {
  return source.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
}

/**
 * 替换
 *
 * @param {String} source 代码
 * @param {String} string 需要修改的字符串
 * @param {String} url 路径
 * @param {RegExp} regexp 正则
 * @return {String}
 */
export const replacement = function (source, string, url, regexp) {
  source = source.replace(new RegExp(escapeRegExp(string), 'g'), () => {
    return string.replace(regexp, (string, file) => {
      return string.replace(file, url)
    })
  })

  return source
}

/**
 * 生成 hash
 *
 * @param {String} source 原字符串
 * @return {String} 哈希
 */
export const gen = function (source) {
  return crypto.createHash('md5').update(source).digest('hex')
}

/**
 * 根据文件内容生成 hash
 *
 * @param {String} file 文件名
 * @return {String} 哈希
 */
export const genFileSync = function (file) {
  let source = fs.readFileSync(file)
  return gen(source)
}
