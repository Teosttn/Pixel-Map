---
title: "AntV/l7-地图可视化入门"
slug: "antv-l7-map-visualization-intro"
date: "2023-09-15"
summary: "引言 最近接触的一个项目需要可视化地图 所以接触了AntV/l7 AntV/l7简介 AntV是由蚂蚁集团的数据可视化团队开发的一系列数据可视化解决方案 而AntV/l7则是注重于 高性能/高渲染质量的地理空间数据可视化框架 AntV/"
tags: ["AntV L7", "map", "visualization", "vue"]
category: "Frontend"
published: true
---

# 引言 
:::primary no-icon
最近接触的一个项目需要可视化地图 
所以接触了`AntV/l7`
:::

# AntV/l7简介
> AntV是由蚂蚁集团的数据可视化团队开发的一系列`数据可视化解决方案`

而AntV/l7则是注重于 
[高性能/高渲染质量]{.pink}的[地理空间数据可视化框架]{.blue}  

AntV/l7基于++WebGL++ 
是[开源大规模地理空间数据可视分析引擎]{.wavy} 

:::info no-icon
通过AntV/l7 
我们可以很轻松的实现在Web界面呈现地图界面 
并对地图进行一系列调用 
:::

# AntV/l7使用 

## AntV/l7的安装(npm) 
L7支持多种引入方式 
可以在[Vue]{.green}、[React]{.pink}或者原生HTML中使用 
这里介绍使用最多的npm方法 

```bash
# 安装L7依赖
npm install --save @antv/l7

# 安装第三方底图依赖 
npm install --save @antv/l7-maps
```
:::warning
`antv/l7-maps`可以让你能够使用高德地图等地图API 
但是一定要是++新版++的`antv/l7`才可以 

我在第一次部署`antv/l7`的时候 
引入GaodeMap创建地图实例时总是会报错 
原因就是只有新版的`antv/l7`才能支持这些API
:::

## Map-地图 

1. 创建DOM元素
```html
<div id="map"></div>
```
2. 初始化地图
> 这里使用高德地图的API 

```js
//引入依赖
import { Scene } from '@antv/l7'
import { GaodeMap } from '@antv/l7-maps';

//创建scene
const scene = new Scene({
    //通过id获取DOM元素
    id: 'map',
    //创建GaodeMap
    map: new GaodeMap({
        pitch: 35.210526315789465,
        style: 'dark',//地图风格
        center: [ 104.288144, 31.239692 ], //地图中心位置
        zoom: 4.4 //地图缩放
  })
})
```

> antv/l7同样也支持MapBox的地图API 
> 不过MapBox限制中国地图的使用 
> 这里就不介绍了 

## Component-组件

### Control-控件 
> 地图控件指的是++悬停在地图四周++ 
> 可以对地图以及图层等元素进行`信息呈现或交互的组件`

:::info no-icon
比如比例尺、标经纬显示、定位以及缩放等 
:::

#### 使用方法

```js
//引入控件
import { Scene, Zoom } from '@antv/l7';

//初始化地图实例
const scene = new Scene({
  // ...
});

//加载scene的时候初始化控件
scene.on('loaded', () => {
  // 实例化 Zoom 控件，可以在构造器中传入控件的配置
  const zoom = new Zoom({
    position: 'leftbottom',
    className: 'my-test-class',
  });

  // 将实例化的控件添加至 L7 中
  scene.addControl(zoom);
});
```
#### 控件配置
1. position
```js
//可以控制控件显示的位置
export type Position =
  | 'topleft'       // ↖ 左上角，纵向排列
  | 'lefttop'       // ↖ 左上角，横向排列
  | 'topright'      // ↗ 右上角，纵向排列
  | 'righttop'      // ↗ 右上角，横向排列
  | 'bottomleft'    // ↙ 左下角，纵向排列
  | 'leftbottom'    // ↙ 左下角，横向排列
  | 'bottomright'   // ↘ 右下角，纵向排列
  | 'rightbottom'   // ↘ 右下角，横向排列
  | 'topcenter'     // ↑ 上方中央，横向排列
  | 'bottomcenter'  // ↓ 下方中间，横向排列
  | 'leftcenter'    // ← 左边中间，纵向排列
  | 'rightcenter'   // → 右边中间，纵向排列
  | Element;        // 传入 DOM 作为当前控件的容器
```

2. style
可以控制控件的样式

3. className
可以给控件自定义样式名

#### 更新配置
> 一般我们在初始化地图实例的时候 
> 就会把控件也实例化 
> 但是如果我们需要更改控件的配置 
> 就可以调用`setOptions`方法

```js
const onPositionChange = () => {
  // 通过 setOptions 传入需要更新的配置对象
  zoom.setOptions({
    position: 'topright',
  });
};
```

### Marker-标记

#### 使用方法
```js
//创建Marker实例
const marker = new Marker(option)

//添加marker到scene上
scene.addMarker(marker)

```
marker的使用方法复杂 
可自定义化程度高 
详情请见 https://l7.antv.antgroup.com/api/component/marker/marker

### Popup-信息框
> Popup是用于在地图上指定经纬度位置 
> 展示自定义内容的气泡 

#### 使用方法 
```js
import { Popup } from '@antv/l7';

scene.on('loaded', () => {
  const popup = new Popup({
    // 初始锚点经纬度
    lngLat: {
      lng: 120,
      lat: 30,
    },
    // Popup 标题
    title: 'Popup Title',
    // Popup 内容
    html: 'Popup Content',
  });
  scene.addPopup(popup);

  // 更新 Popup 锚点经纬度
  popup.setLngLat({
    lng: 130,
    lat: 40,
  });

  // 更新 Popup 内容
  popup.setHTML('New Popup Content');
});
```
> 更多配置同样可以看官网:kissing_heart:
## Layer-图层

### 图层介绍
图层，即使`layer` 
可以在已经创建好的scene上添加自定义的图层 
图层的种类丰富: 
> * 图层基类-BaseLayer
> * 点图层-PointLayer
> * 线图层-LineLayer
> * 面图层-PolygonLayer
> * 热力图层-HeatMapLayer
> * 图片图层-ImageLayer 
> * 掩模图层-MaskLayer
> * 栅格图层-RasterLayer
> * 瓦片图层-TileLayer

### 添加图层
> 举一个热力图层的例子

```js
//引入HeatMapLayer
import {  HeatMapLayer } from '@antv/l7';
//创建新图层
const layer = new HeatmapLayer({})
      .source(data)
      .shape('heatmap')
      .size('mag', [0, 1.0]) // weight映射通道
      .style({
        intensity: 0.1,
        radius: 20,
        rampColors: {
          colors: [
            '#FF4818',
            '#F7B74A',
            '#FFF598',
            '#91EABC',
            '#2EA9A1',
            '#206C7C'
          ].reverse(),
          positions: [0, 0.2, 0.4, 0.6, 0.8, 1.0]
        }
      });
//将图层添加到scene上
scene.addLayer(layer);
```
这之后 
地图上就会显示对应的图层了

# AntV/l7结合Vue
:::info no-icon
这么强的可视化API 
肯定可以结合前段框架使用 
:::

[Vue]{.green}中的使用也非常方便 
只需要在生命周期钩子`onMounted`中初始化地图实例 
绑定相应的DOM元素就可以啦 

同样[React]{.blue}也可以使用 
官网也都有实例:yum:

# 总结 
:::primary no-icon
因为项目 
接触到很多种可视化的JS API了 
比如`ECharts`、`ThreeJS` 
这次的`AntV/l7`算是比较新的技术了 
总之抱着拓宽技术栈的目的 
能做出一些小Demo 
还是[非常不错！]{.pink}
:::

> 参考链接：
> * https://l7.antv.antgroup.com/
> * https://l7.antv.antgroup.com/tutorial/quickstart
> 如有问题欢迎指正！
