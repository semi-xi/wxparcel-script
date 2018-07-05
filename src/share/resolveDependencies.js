import findIndex from 'lodash/findIndex'
import stripComments from 'strip-comments'
import { resolve as relativeResolve } from './requireRelative'

export const resolveDestination = function (file, options) {
  let { rootDir, srcDir, outDir } = options

  /**
   * windows 下 path 存在多个反斜杠
   * 因此需要 escape 才能进行 search
   * 这里可以直接使用 indexOf 进行查询
   */
  return file.indexOf(srcDir) !== -1
    ? file.replace(srcDir, outDir)
    : file.replace(rootDir, outDir)
}

export const resolveDependencies = function (code, file, relativeTo, options) {
  if (code) {
    code = stripComments(code, { sourceType: 'module' })
  }

  let dependencies = []

  while (true) {
    let match = /require\(['"]([\w\d_\-./]+)['"]\)/.exec(code)
    if (!match) {
      break
    }

    let [all, required] = match
    code = code.replace(all, '')

    let dependency = relativeResolve(required, relativeTo)
    if (findIndex(dependencies, { file, dependency, required }) === -1) {
      let destination = resolveDestination(dependency, options)
      dependencies.push({ file, dependency, destination, required })
    }
  }

  return dependencies
}
