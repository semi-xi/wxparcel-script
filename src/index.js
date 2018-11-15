// Loaders
import BabelLoader from './loaders/babel-wxparcel-loader'
import EnvifyLoader from './loaders/envify-wxparcel-loader'
import SassLoader from './loaders/sass-wxparcel-loader'
import UglifyJSLoader from './loaders/uglifyjs-wxparcel-loader'

// Plugins
import CleanPlugin from './plugins/clean-wxparcel-plugin'
import DevServerPlugin from './plugins/dev-server-wxparcel-plugin'
import SpritesmithPlugin from './plugins/spritesmith-wxparcel-plugin'

// Resolver
import JSResolver from './resolver/js-resolver'
import JSONResolver from './resolver/json-resolver'
import WXMLResolver from './resolver/wxml-resolver'
import WXSResolver from './resolver/wxs-resolver'
import WXSSResolver from './resolver/wxss-resolver'

// Bundler
import JSBundler from './bundler/js-bundler'

// Main
import { Assets } from './assets'
import { Chunk } from './chunk'
import { OptionManager } from './option-manager'
import { Parser } from './parser'
import { Resolver } from './resolver'
import { Bundler } from './bundler'
import Parcel from './parcel'

// Constants
import * as chunkTypes from './constants/chunk-type'

// Runtime
import Runtime from './runtime'

// export all classes
export {
  BabelLoader,
  EnvifyLoader,
  SassLoader,
  UglifyJSLoader,

  CleanPlugin,
  DevServerPlugin,
  SpritesmithPlugin,

  JSResolver,
  JSONResolver,
  WXMLResolver,
  WXSResolver,
  WXSSResolver,

  JSBundler,

  Assets,
  Chunk,
  OptionManager,
  Parser,
  Resolver,
  Bundler,
  Parcel,

  chunkTypes,

  Runtime
}
