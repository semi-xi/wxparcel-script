import { Chunk } from './chunk'

export class Assets {
  get size () {
    return this.chunks.length
  }

  constructor () {
    this.chunks = []
  }

  index (file) {
    return this.chunks.findIndex((chunk) => chunk.file === file)
  }

  add (file, options = {}) {
    let chunk = new Chunk(file, options)
    this.chunks.push(chunk)
    return chunk
  }

  update (file, options = {}) {
    let chunk = this.get(file)
    chunk && chunk.update(options)
  }

  get (file) {
    let index = this.index(file)
    return this.chunks[index] || null
  }

  del (file) {
    let index = this.index(file)
    index !== -1 && this.chunks.splice(index, 1)
  }

  exists (file) {
    return this.index(file) !== -1
  }

  clean () {
    let chunks = this.chunks.splice(0)
    this.chunks = []

    chunks.forEach((chunk) => chunk.destory())
  }
}

export default new Assets()
