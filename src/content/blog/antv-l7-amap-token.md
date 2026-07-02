---
title: "Antv-l7-高德地图API的token问题"
slug: "antv-l7-amap-token"
date: "2024-03-14"
summary: "引言 之前用Antvl7vue做了一个很小的地图项目 主要是通过l7来调用高德地图的API 然后在地图上添加图层来实现一些简单的功能 但是后面项目需要更改的时候突然发现地图无法加载 BUG阐述 本来这样调用高德地图API就可以正常加载 "
tags: ["AntV L7", "AMap", "debugging", "vue"]
category: "Frontend"
published: true
---

# 引言
> 之前用Antv-l7+vue做了一个很小的地图项目
> 主要是通过l7来调用高德地图的API 
> 然后在地图上添加图层来实现一些简单的功能
> 但是后面项目需要更改的时候突然发现地图无法加载 

# BUG阐述
```js
// 这是原本的初始化代码
function initMap() {
  scene = new Scene({
    id: 'map-content',
    logoVisible: false,
    map: new GaodeMap({
      style: 'dark', // 样式URL
      center: [122.1, 37.5],
      zoom: 8,
    }),
  });

  //以下省略初始化
}
```
本来这样调用高德地图API就可以正常加载
但是控制台却报错 
![](https://s21.ax1x.com/2024/03/14/pFgPOFs.png)

# BUG的修复尝试
> 我尝试在网上搜索这个BUG的解决方法
> 针对INVALID_USER_DOMAIN

1. 更新Antv-l7
> 没用
2. 参考高德开放平台教程
![](https://s21.ax1x.com/2024/03/14/pFgiPw4.png)
> 也没用
3. 使用高德地图JSAPI
```js
import AMapLoader from '@amap/amap-jsapi-loader';
window._AMapSecurityConfig = {
  //填入了我注册的高德地图开发者平台上的API的key的token
  securityJsCode: "",
}
```
> 同样没用
4. 初始化添加key/token
```js
function initMap() {
  scene = new Scene({
    id: 'map-content',
    logoVisible: false,
    map: new GaodeMap({
      style: 'dark', // 样式URL
      center: [122.1, 37.5],
      zoom: 8,
      key: 'xxx',
      //token: 'xxx',
    }),
  });

}
```
> 仍未生效 
> 只是报错变成了 USERKEY_PLAT_NOMATCH

# 解决方案
:::warning no-icon
最后在一位学长和我的试错之下 
找到了正确的打开方式
:::
```js
// 先去高德开放平台创建一个应用
// 选择WebAPI
// 然后同时在key和token的后面都输入key
function initMap() {
  scene = new Scene({
    id: 'map-content',
    logoVisible: false,
    map: new GaodeMap({
      style: 'dark', // 样式URL
      center: [122.1, 37.5],
      zoom: 8,
      key: 'xxx',
      token: 'xxx',
    }),
  });

}
```
:::primary no-icon
我也不知道为什么需要这样
:::

> 参考链接：
> https://blog.csdn.net/m0_58960403/article/details/134592254
> https://lbs.amap.com/faq/js-api/map-js-api/create-project/46515
> https://lbs.amap.com/api/javascript-api/guide/abc/prepare
