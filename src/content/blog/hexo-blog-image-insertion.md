---
title: "关于hexo博客的图片插入问题"
slug: "hexo-blog-image-insertion"
date: "2023-09-08"
summary: "引言 在搭建完我自己的Hexo博客之后 我试着向博客内上传一些图片 但是每次都会遇到各种各样的问题kissingheart 故总结一下Hexo博客中上传图片的几种比较好用的方式 Hexo的原生插入图片方式 首先设置configyml文件"
tags: ["Hexo", "Markdown", "images"]
category: "Blogging"
published: true
---

# 引言

:::info no-icon
在搭建完我自己的Hexo博客之后  
我试着向博客内上传一些图片 
但是每次都会遇到各种各样的问题:kissing_heart:
:::

故总结一下Hexo博客中上传图片的[几种比较好用的方式]{.purple}

# Hexo的原生插入图片方式

首先设置_config.yml文件
```yaml
# 启用资源文件夹
post_asset_folder: true
```
此时当你hexo new创建一篇新文章时 
就会在_posts文件下生成与文章同名的资源文件夹 

引用方法为在md文档中使用
~~~
{% asset_img 图片名.jpg %}
~~~
> 这种方法只能用这种别扭的方式引入图片
> 而且不能使用我们熟悉的markdown语句中的 `![]()`格式
> 如果使用 `![]()` 则图片无法正常显示

# 安装hexo-renderer-marked

为了使博客的书写更加地方便 
可以安装hexo官方提供的插件++hexo-renderer-marked++{.wavy}
> 如果已经安装过了则可以跳过这一步

```bash
npm install hexo-renderer-marked --save
```

这之后就可以修改config.yml文件
```yaml
post_asset_folder: true
marked:
    prependRoot: true
    postAsset: true
```
这之后就可以使用`![]()`的方法

# 利用[网络图床]{.label .warning}

通过之前两种方式已经可以实现成功插入图片 
但是如果你的图片[过大]{.red}，或者[过多]{.green}，容易造成[网页加载卡顿]{.yellow} 
所以可以++结合网络图床使用++ 
将自己博客上面的图片都传到网络图床里面去 
这样每次加载网页就只需要向图床请求图片就行了

:::primary no-icon
网上的图床众多 
而且大部分都提供免费容量 
我这里使用的是聚合图床和路过图床 
大家也可以自己寻找 
:::

将图片上传到图床之后 
```markdown
![](这里面写图片的网络链接)
```
# 总结

hexo中虽然是使用==markdown==语言来构建文章 
但是如果不使用它自带的方法或者安装插件 
那么传统的markdown引用语法就不能使用了 
[推荐使用]{.blue}网络图床来管理自己的博客图片 

> 也可以结合typora之类的markdown书写软件来更高效地书写自己的博客

> 谢谢阅读 如有问题欢迎指正！
