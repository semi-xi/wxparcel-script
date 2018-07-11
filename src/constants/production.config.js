import Config, { JSRule } from './common.config'

JSRule.loaders.push({
  use: require.resolve('../loaders/uglifyjs-wxparcel-loader'),
  options: {}
})

export default Config
