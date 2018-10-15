import CleanerPlugin from '../plugins/clean-wxparcel-plugin'
import DevServerPlugin from '../plugins/dev-server-wxparcel-plugin'

let jsRules = [
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
]

let wxssRules = [
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

let plugins = [
  new CleanerPlugin({
    alisas: ['outDir', 'staticDir', 'tmplDir']
  })
]

let config = Object.defineProperties({ setRule, addPlugin, delPlugin }, {
  rules: {
    get: () => [...jsRules, ...wxssRules]
  },
  plugins: {
    get: () => [...plugins]
  }
})

if (process.env.NODE_ENV === 'development') {
  plugins.push(new DevServerPlugin())
}

if (process.env.NODE_ENV === 'prerelease' || process.env.NODE_ENV === 'production') {
  jsRules[0].loaders.push({
    use: require.resolve('../loaders/uglifyjs-wxparcel-loader'),
    for: 'bundler',
    options: {}
  })
}

export default config

function setRule (name, callback) {
  switch (name) {
    case 'js': {
      let rules = jsRules || {}
      jsRules = callback(rules)
      break
    }

    case 'wxss': {
      let rules = wxssRules || {}
      wxssRules = callback(rules)
      break
    }
  }
}

function addPlugin (plugin) {
  plugins.push(plugin)
}

function delPlugin (plugin) {
  let index = plugins.findIndex((item) => item.constructor === plugin.constructor)
  index !== -1 && plugins.splice(index, 1)
}
