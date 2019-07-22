/**
 * 队列类
 */
export default class Queue {
  private queue: Promise<any>[]

  /**
   * 队列大小
   */
  public get size (): number {
    return this.queue.length
  }

  constructor () {
    this.queue = []
  }

  /**
   * 管道化函数
   * @description 并发多次执行都会根据队列来执行
   * @param fn 方法
   */
  public pipefy (fn: (...args: any[]) => Promise<any>): (...args: any[]) => Promise<any> {
    return (...args: any[]) => {
      const currents = [].concat(this.queue)
      const queuePromise = Promise.all(currents).then(() => {
        return fn(...args).then((response: any) => {
          let index = this.queue.indexOf(queuePromise)
          index !== -1 && this.queue.splice(index, 1)
          return response
        })
      })

      this.queue.push(queuePromise)
      return Promise.all(currents.concat([queuePromise]))
    }
  }

  /**
   * 注销
   */
  public destory (): void {
    this.queue.splice(0)
    this.queue = undefined
    this.destory = Function.prototype as any
  }
}
