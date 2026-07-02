---
title: "TypeScript的浅显理解"
slug: "typescript-basic-understanding"
date: "2024-03-12"
summary: "引言 TypeScript是JavaScript的超集 可以被编译成纯净的JavaScript 与JS区分的就是强类型语言的特点 TypeScript基础 基本数据类型 1 boolean 布尔 2 number 数字 3 string"
tags: ["TypeScript", "JavaScript", "frontend"]
category: "Frontend"
published: true
---

# 引言
:::primary no-icon
TypeScript是JavaScript的超集 
可以被编译成纯净的JavaScript 
与JS区分的就是[强类型语言].{purple}的特点
:::

# TypeScript基础 

## 基本数据类型 
1. boolean 布尔
```ts
let flag: boolean = true;
```
2. number 数字
```ts 
let num: number = 5.20;
```

3. string 字符串
```ts 
let str: string = "Mayuri";
```
4. array 数组
```ts 
let arr1: number[] = [6,6,6,6,6,6];
let arr2: Array<string> = ['JavaScript','TypeScript'];
let arr3: string[] = ['js','ts']; 
```
5. tuple 元组
```ts 
// 元组类型可以指定元组类的每个元素的类型
let tup: [boolean, number, string] = [true, 1, 'Mua']
```

6. enum 枚举
```ts 
enum Color{
  Red = '红色',
  Yellow = '黄色',
  Blue = '蓝色'
}
let singleColor: Color = Color.Red;
```

7. any 任意类型
```ts 
// 不指定具体类型，类似js
let element1: any = 4;
let element2: any = 'string';
```

8. void 空类型
```ts 
// 常用于函数无返回值
function printLog(): void {
  console.log('this is a log');
}

let a: void = undefined;
let b: void = null;
```

9. Null/Undefined
```ts 
// 默认情况下该类型是所有类型的子类型 
// 可以赋值给其他类型 
let a: null = null;
let b: undefined = undefined;
``` 
10. Never 
```ts 
// never类型比较特殊 表示为永不存在 
// never也同样是所有类型的子类型

// 返回never的函数必须存在无法达到的终点
function error(message: string): never {
    throw new Error(message);
}

// 推断的返回值类型为never
function fail() {
    return error("Something failed");
}

// 返回never的函数必须存在无法达到的终点
function infiniteLoop(): never {
    while (true) {
    }
}
```
11. Object
```ts 
// 非原始类型
let obj: object = {
  name: 'Steve',
  age: 25
}
```
## 变量声明
> 不管是在JavaScript还是TypeScript里面
> 都不推荐使用`var`而是`let`

1. var声明 
> var声明的作用域非常奇怪 容易造成污染
```ts
function f(flag: boolean) {
    if (flag) {
        var x = 10;
    }

    return x;
}

f(true);  // returns '10'
f(false); // returns 'undefined'

```
:::warning no-icon
不仅如此 
var也不会限制一个变量的多次声明 
:::

2. let/const
> * 块级作用域
> * 重定义和屏蔽

## 接口
:::primary no-icon
接口是TypeScript的核心重点之一 
接口的作用是为各种类型自定义命名
:::

### 接口的基本使用
```ts
interface exampleElement{
  value: string;
}

function printValue(element: exampleElement){
  console.log(element.value);
}

let testObj: object = {
  value: 'thing',
  name: 'testObj'
};

printValue(testObj);
// 只要传入的element满足exampleElement的要求
// 这个操作就被类型选择器所允许
```

### 接口的属性定义
```ts
// 可选属性
// 对可能存在的属性进行预定义，可以捕获引用了不存在的属性时产生的错误
interface SquareConfig {
  color?: string;
  width?: number;
}

// 只读属性
// 该属性只能在对象刚刚创建的时候修改值
interface Point {
    readonly x: number;
    readonly y: number;
}
```
### 接口的函数类型
```ts
interface SearchFunc {
  (source: string, subString: string): boolean;
}

let mySearch: SearchFunc;
mySearch = function(source: string, subString: string): boolean {
  let result = source.search(subString);
  return result > -1;
}
```

:::info no-icon
 以上就是TypeScript的一些简单的使用
 可以满足日常小项目或者一些组件的阅读问题 
:::

> 参考链接：
> https://www.tslang.cn/docs/handbook/generics.html
> https://juejin.cn/post/7231804748092244023

> 如有问题欢迎指正
