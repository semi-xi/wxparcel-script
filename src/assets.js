import findIndex from 'lodash/findIndex'
import { Chunk } from './chunk'

export default class Assets {
  constructor () {
    this.assets = []
  }

  index (file) {
    return findIndex(this.assets, { file })
  }

  add (file, options = {}) {
    let chunk = new Chunk(file, options)
    let assets = { file, chunk }

    this.assets.push(assets)
    return assets
  }

  update (file, options = {}) {
    let { chunk } = this.get(file) || {}
    chunk && chunk.update(options)
  }

  get (file) {
    let index = this.index(file)
    return index !== -1 ? this.assets[index] : null
  }

  getChunk (file) {
    let assets = this.get(file) || {}
    return assets.chunk
  }

  del (file) {
    let index = this.index(file)
    index !== -1 && this.splice(index, 1)
  }

  exists (file) {
    return this.index(file) !== -1
  }

  output (file) {
    let chunk = this.getChunk(file) || {}
    return chunk.destination
  }

  reset () {
    this.assets.splice(0).forEach(({ chunk }) => chunk.destory())
    this.assets = []
  }
}
