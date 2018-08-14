import BabelLoader from './loaders/babel-wxparcel-loader'
import EnvifyLoader from './loaders/envify-wxparcel-loader'
import FileLoader from './loaders/file-wxparcel-loader'
import SASSLoader from './loaders/sass-wxparcel-loader'
import UglifyJSLoader from './loaders/uglifyjs-wxparcel-loader'

import CleanPlugin from './plugins/clean-wxparcel-plugin'
import DevServerPlugin from './plugins/dev-server-wxparcel-plugin'

import CommonConfig from './constants/common.config'
import DevelopConfig from './constants/development.config'
import ProductConfig from './constants/production.config'

import Parcel from './parcel'

export const Loaders = {
  BabelLoader,
  EnvifyLoader,
  FileLoader,
  SASSLoader,
  UglifyJSLoader
}

export const Plugins = {
  CleanPlugin,
  DevServerPlugin
}

export const Config = {
  CommonConfig,
  DevelopConfig,
  ProductConfig
}

export default Object.assign(Parcel, {
  Config,
  Loaders,
  Plugins
})
