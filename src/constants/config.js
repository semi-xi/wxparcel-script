import map from 'lodash/map'
import flatten from 'lodash/flatten'
import forEach from 'lodash/forEach'
import mapKeys from 'lodash/mapKeys'
import CleanerPlugin from '../plugins/clean-wxparcel-plugin'
import DevServerPlugin from '../plugins/dev-server-wxparcel-plugin'

const JSRules = {
  common: [
    {
      test: /\.js$/,
      extname: '.js',
      loaders: [
        {
          use: require.resolve('../loaders/babel-wxparcel-loader')
        },
        {
          use: require.resolve('../loaders/envify-wxparcel-loader'),
          options: {
            env: {
              NODE_ENV: process.env.NODE_ENV
            }
          }
        }
      ]
    }
  ],
  prerelease: [
    {
      use: require.resolve('../loaders/uglifyjs-wxparcel-loader'),
      options: {}
    }
  ],
  production: [
    {
      use: require.resolve('../loaders/uglifyjs-wxparcel-loader'),
      options: {}
    }
  ]
}

const WXSSRules = {
  common: [
    {
      test: /\.scss$/,
      extname: '.wxss',
      loaders: [
        {
          use: require.resolve('../loaders/sass-wxparcel-loader'),
          options: {}
        }
      ]
    }
  ]
}

const Plugins = {
  common: [
    new CleanerPlugin({
      alisas: ['outDir', 'staticDir', 'tmplDir']
    })
  ],
  development: [
    new DevServerPlugin()
  ]
}

const names = ['common', 'development', 'prerelease', 'production']
const rules = genReference(names, JSRules, WXSSRules)
const plugins = genReference(names, Plugins)

export default { rules, plugins, setRule, addPlugin, delPlugin }

function setRule (name, callback, env = 'common') {
  switch (name) {
    case 'js': {
      let rules = JSRules[env] || {}
      JSRules[env] = callback(rules)
      break
    }

    case 'wxss': {
      let rules = WXSSRules[env] || {}
      WXSSRules[env] = callback(rules)
      break
    }
  }
}

function addPlugin (plugin, env = 'common') {
  let plugins = Plugins[env] || []
  plugins.push(plugin)
}

function delPlugin (plugin, env = 'common') {
  let plugins = Plugins[env] || []
  let index = plugins.findIndex((item) => item.constructor === plugin.constructor)
  index !== -1 && plugins.splice(index, 1)
}

function genGetter (names, references) {
  let getters = {}

  forEach(names, (name) => {
    let get = () => {
      let collection = map(references, name).filter(item => item)
      return flatten(collection)
    }

    getters[name] = { get }
  })

  return getters
}

function genReference (names, ...references) {
  let output = mapKeys(names, (name) => name)
  let getter = genGetter(names, references)
  return Object.defineProperties(output, getter)
}
