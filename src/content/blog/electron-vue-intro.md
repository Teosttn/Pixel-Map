---
title: "浅谈Electron+vue"
slug: "electron-vue-intro"
date: "2023-09-11"
summary: "引言 我接触到Electron是由于暑期接到的一个项目 认为Electron对于有一定前段基础的人blush 具有以下优点 学习成本低，不需要桌面开发经历 构建快速，功能强大 满足制作个人软件的需求 具有跨平台功能 生态强大，API众多"
tags: ["Electron", "Vue", "desktop"]
category: "Desktop"
published: true
---

# 引言

![](https://ts1.cn.mm.bing.net/th/id/R-C.d9889a7179104fcf7d6e5af9aed0d716?rik=o1ACtbNQris4Gw&riu=http%3a%2f%2fhackernews.cc%2fwp-content%2fuploads%2f2018%2f01%2fElectron-600x218.png&ehk=88F0wv97vGUXG%2bIU4txqeNLjF%2bt%2fQEmuxU5mBbs3%2bO4%3d&risl=&pid=ImgRaw&r=0)

:::primary no-icon
我接触到Electron是由于暑期接到的一个项目 
认为Electron对于有一定前段基础的人:blush: 
具有以下优点:
* 学习成本低，不需要桌面开发经历
* 构建快速，功能强大
* 满足制作个人软件的需求
* 具有跨平台功能
* 生态强大，API众多
:::

[Electron]{.blue}是由Github团队开发的一个`桌面开发框架`
建立在Chromium和Node.js之上
许多常用软件也是基于Electron开发的:+1:

> * VS Code
> * Typora
> * Draw.io
> * 迅雷
> * QQ(新版桌面端)

![](https://pic2.zhimg.com/v2-0f871af8f2a6fa17f9a24b1e053f9599_r.jpg)

> 虽然好像还是有不少人在吐槽Electron
> 说它体积大，运行占用内存多
> VS Code貌似也要用[WebView2]{.wavy}来更换框架

但是对于小白开发软件++还是挺不错的++:v:

# Electron快速上手

## Electron安装

> 确保nodejs和npm安装成功之后

```bash
# 通过npm直接安装electron
npm install electron

# 检查是否安装成功
electron -v
```
## 初始化Electron项目

先初始化项目

```bash
npm init
```

此时进入到`package.json`文件就可以看到

```json
{
  "name": "XXX",
  "version": "1.0.0",
  "description": "XXX",
  "main": "main.js",
  "author": "XXX",
  "license": "XXX"
}
```
这之后`npm install electron`完成之后 
需要更改`package.json`里面的内容才可以正式启动项目

```json
{
    "scripts":{
        "start":"electron ."
    }
}
```
启动[electron项目]{.pink}的代码为

```bash
npm run start
```

## Electron的多进程模型

由于[Electron]{.blue}是基于[Chromium]{.pink}和[Nodejs]{.green}开发的 
所以它继承了[Chromium]{.pink}的`多进程架构` 

![](https://www.electronjs.org/zh/assets/images/chrome-processes-0506d3984ec81aa39985a95e7a29fbb8.png)

> 由于是多进程
> 这就意味着[单一进程的崩溃]{.red}，不会影响整个应用:heart_eyes:

### 主进程
每个 Electron应用都有一个`单一的主进程`
作为应用程序的`入口点` 
主进程在[Node.js环境]{.yellow}中运行 
这意味着它具有[require模块]{.purple}和使用所有[Node.js-API]{.red}的能力

> require模块： 
> 指的是NodeJs遵循CommonJS规范  
> 通过require来加载其他依赖的模块 

> 每一个文件就是一个模块， 
> 拥有自己独立的作用域，变量，以及方法等， 
> 对其他的模块都不可见， 
> CommonJS 规范规定，每个模块内部，module 变量代表当前模块。 
> 这个变量是一个对象，它的exports 属性（即module.exports）是对外的接口。 

这个主进程就是`main.js`

### BrowserWindow

主进程使用BrowserWindow管理应用窗口的各模块

> Electron应用中会有许多的[窗口]{.red}
> [窗口]{.red}会展示界面，即本地的HTML界面或者URL

```js main.js
//引入BrowserWindow
const { BrowserWindow } = require('electron')

//新建窗口类
const win = new BrowserWindow({ width: 800, height: 1500 })

//加载界面（也可以是vue中的界面）
win.loadURL('https://github.com')

const contents = win.webContents
console.log(contents)

```
> 当然这些内容也不一定要写在`main.js`中
> 可以单独封装到windows文件中去，需要这个窗口的时候再调用

### 渲染进程 

每个[BrowserWindow]{.pink}都会挂载一个界面 
而[Electron]{.blue}应用会为每个打开的[BrowserWindow]{.red}生成一个`单独的渲染器进程`

## 进程通信

要谈及进程通信(IPC) 
就离不开IPC通道中的两个模块
> * `ipcMain` (主进程)
> * `ipcRenderer` (渲染器进程) 

通道之间是++任意++和++双向++的

### 渲染器进程到主进程（单向）

IPC信息从渲染器进程单向发送到主进程 
* 使用`ipcRenderer.send`发送IPC消息 
* 使用`ipcMain.on`接收信息并做出反应 

### 主进程到渲染器进程

IPC信息从主进程发送到渲染器进程
* 使用`webContents`模块发送消息
* 使用`ipcRenderer.on`接收主进程发送的消息

### 渲染器进程到主进程(双向)

IPC信息从渲染器进程发送到主进程
* 使用`ipcMain.handle`监听事件并调用一个通道
* 使用`ipcRenderer.invoke`接收这个通道的信息，然后调用

### 渲染器进程到渲染器进程

通过向主进程发送信息，主进程再与另一个渲染器进程通信即可实现

### 一个简单的通信例子

举个例子:satisfied:


```js renderer.js

//获取数据列表
function getDataList(){
    //向主进程发送ipc信息
    ipcRenderer.send("getDataList");
    console.log('渲染进程发送信息');
}

//监听主进程发送过来的数据
function getDataListListener(){
    ipcRenderer.on("getDataListReply",(event,args) => {
        console.log('渲染进程收到信息',args);
        //接下来对args进行处理
        //......
    })
}

```

```js main.js

//监听渲染进程
ipcMain.on("getDataList",async(event) => {
    console.log('主进程收到渲染器进程信息');
    //主进程发送数据
    mainWindow.webContents.send("getDataListReply",args);
})

```

# Electron+vue

> `Electron`可以方便的构建桌面应用 
> 当然也可以结合`vue`来构建

可以在`vue项目`中安装[Electron]{.red} 
然后通过[BrowserWindow]{.aqua}挂载[vue]{.green}的界面 
然后使用进程通讯 
就可以++愉快地制作自己的应用了喵:stuck_out_tongue_winking_eye:++

# 总结

从上面的描述看来 
`Electron`具有上手难度低、使用方便等一系列优点 
利用它来制作自己的桌面应用看起来非常吸引人:yum:

:::warning
不过我上面提到的只是Electron的一小部分 
还有诸如`预加载`，`消息端口`，`打包`等众多内容
:::

> 参考链接：
> * https://www.electronjs.org/zh/docs/latest/
> * https://juejin.cn/post/7015476516196712462
> * https://zhuanlan.zhihu.com/p/379637956#%E6%A6%82%E8%A7%88
> * https://zhuanlan.zhihu.com/p/625409105
> * https://zhuanlan.zhihu.com/p/428560381
> 如有问题欢迎指正！
