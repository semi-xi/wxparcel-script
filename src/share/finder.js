import fs from 'fs-extra'
import path from 'path'

export const find = function (directory, pattern) {
  let results = []
  if (!fs.statSync(directory).isDirectory()) {
    results.push(pattern.test(directory))
    return results
  }

  let files = fs.readdirSync(directory)
  files.forEach((filename) => {
    let file = path.join(directory, filename)
    if (fs.statSync(file).isDirectory()) {
      let sub = find(file, pattern)
      results = results.concat(sub)
      return
    }

    if (pattern.test(file)) {
      results.push(file)
    }
  })

  return results
}

export const findForMatchRules = function (directory, rules = []) {
  let assets = {}
  if (!fs.statSync(directory).isDirectory()) {
    let matches = rules.filter(({ test: pattern }) => pattern.test(directory))
    if (matches.length > 0) {
      assets[directory] = matches
    }

    return assets
  }

  let files = fs.readdirSync(directory)
  files.forEach((filename) => {
    let file = path.join(directory, filename)
    if (fs.statSync(file).isDirectory()) {
      let subAssets = findForMatchRules(file, rules)
      assets = Object.assign(assets, subAssets)
      return
    }

    let matches = rules.filter(({ test: pattern }) => pattern.test(file))
    if (matches.length > 0) {
      assets[file] = matches
    }
  })

  return assets
}
