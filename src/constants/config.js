import get from 'lodash/get'
import set from 'lodash/set'
import map from 'lodash/map'
import flatten from 'lodash/flatten'
import mapKeys from 'lodash/mapKeys'
import mapValues from 'lodash/mapValues'
import CleanerPlugin from '../plugins/clean-wxparcel-plugin'
import DevServerPlugin from '../plugins/dev-server-wxparcel-plugin'

const Rules = {
  js: {
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
  },
  wxss: {
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

const names = ['common', 'develop', 'release', 'product']
const rules = genReference(names, Rules)
const plugins = genReference(names, Plugins)

export default { rules, plugins, setRule, addPlugin, delPlugin }

function setRule (name, callback, env = 'common') {
  let path = `${name}.${env}`
  let rules = get(Rules, path, {})
  set(Rules, path, callback(rules))
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

function genGetter (name, reference) {
  let group = map(reference, name)
  group = group.filter((rule) => rule)
  return flatten(group)
}

function mapGetter (names, reference) {
  let props = mapKeys(names, (name) => name)
  return mapValues(props, (name) => {
    let get = () => genGetter(name, reference)
    return { get }
  })
}

function genReference (names, reference) {
  let ref = mapKeys(names, (name) => name)
  return Object.defineProperties(ref, mapGetter(names, reference))
}
