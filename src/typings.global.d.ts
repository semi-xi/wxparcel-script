/**
 * 所有值
 */
type ValueOf<T> = T[keyof T]

/**
 * 所有属性, 排除方法
 */
type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]
type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>
