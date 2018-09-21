import forEach from 'lodash/forEach'
import cloneDeep from 'lodash/cloneDeep'
import CleanerPlugin from '../plugins/clean-wxparcel-plugin'

let jsRule = {
  test: /\.js$/,
  extname: '.js',
  loaders: [
    {
      use: require.resolve('../loaders/babel-wxparcel-loader')
    }
  ]
}

let wxssRule = {
  test: /\.scss$/,
  extname: '.wxss',
  loaders: [
    {
      use: require.resolve('../loaders/sass-wxparcel-loader'),
      options: {}
    }
  ]
}

let rules = [jsRule, wxssRule]

let plugins = [
  new CleanerPlugin({
    alisas: ['outDir', 'staticDir', 'tmplDir']
  })
]

export default {
  rules,
  plugins,
  _setRule (rule, callback) {
    let names = Object.keys(rule)
    let newRule = cloneDeep(callback(rule))
    
    forEach(names, (name) => {
      rule[name] = undefined
    })

    Object.assign(rule, newRule)
  },
  setRule (name, callback) {
    switch (name) {
      case 'js': {
        this._setRule(jsRule, callback)
        break
      }

      case 'wxss': {
        this._setRule(wxssRule, callback)
        break
      }
    }
  },
  addPlugin (plugin) {
    plugins.push(plugin)
  }
}
