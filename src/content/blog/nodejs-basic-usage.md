---
title: "Node.js简单使用"
slug: "nodejs-basic-usage"
date: "2024-03-14"
summary: "引言 Nodejs是运行在服务端的js Nodejs是事件驱动的I/O服务端的js环境 开发人员可以使用 JavaScript 创建各种服务器端工具和应用程序。 与此同时，Nodejs的性能优越 应用创建 Nodejs实现的是完整的HT"
tags: ["Node.js", "backend", "http"]
category: "Backend"
published: true
---

# 引言
> Node.js是运行在服务端的js 
> Node.js是事件驱动的I/O服务端的js环境 
> 开发人员可以使用 JavaScript 创建各种服务器端工具和应用程序。 
> 与此同时，Node.js的性能优越

# 应用创建
:::primary no-icon
`Node.js`实现的是完整的[HTTP服务器].{.blue} 
可以创建Web服务器，监听HTTP请求并做出回应 
:::

```js
//require指令载入http模块
let http = require('http');

//http模块创建服务器
http.createServer( (request, response) =>{
    // 设置HTTP响应头
    // 发送 HTTP 头部 
    // HTTP 状态值: 200 : OK
    // 内容类型: text/plain
    response.writeHead(200, {'Content-Type': 'text/plain'});

    // 发送响应
    response.end('Hello World\n');
    //相应数据会展示在网页上
}).listen(8888);

// 终端打印测试
console.log('Server is running at http://127.0.0.1:8888/ !');
```
