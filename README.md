[![npm version](https://badgen.net/npm/v/mbbs)](https://www.npmjs.com/package/mbbs)
[![MIT License](https://img.shields.io/npm/l/mbbs.svg?sanitize=true)](https://www.npmjs.com/package/mbbs)

<!-- PROJECT LOGO -->
<div align="center">
  <a href="https://github.com/linfaxin/mbbs">
    <img src="http://mbbs.cc/images/default-logo.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">MBBS 开源版</h3>
  <p align="center">
    🔥轻量级全功能论坛
    <br />
    <a href="http://mbbs.cc/">官网</a>
    ·
    <a href="https://github.com/linfaxin/mbbs/issues">提Bug</a>
    ·
    <a href="#特性">特性</a>
  </p>
</div>

---

## 预览

![preview-image](http://mbbs.cc/images/demo_preview.png)

## 一键安装启动

无需繁琐的安装配置，一键安装并启动论坛，[查看更多启动参数](#更多启动参数)

安装：

```shell
npm i -g mbbs # 全局安装 mbbs 模块
# 使用的部分依赖库（sqlite3、bcrypt）在安装时会从 github 下载 prebuild 文件
# 可能会由于国内网络问题，在快结束时卡住，请耐心等待，如果失败请重试
```

启动：

```shell
cd ./要部署论坛的目录
mbbs serve # 在当前目录启动论坛服务
```

> 如果提示 npm 命令找不到，需要先安装 [Node.js](https://nodejs.org/) 最新版本

## 特性

- 无依赖一键部署启动
- 移动/PC 双端兼容
- Material Design 视觉风格
- 可视化后台管理
- 全功能论坛：板块/楼中楼/角色权限/审核/富文本编辑/个性化配置/邮件通知 等
- 自带授权登录：免开发支持 QQ/微信/支付宝 授权登录

## 更多启动参数

命令行启动论坛时，可以用 `mbbs serve --参数名1 参数值1 --参数名2 参数值2` 的形式指定更多可选参数

- --db: 指定论坛的数据库文件名，默认为 `bbs`，启动后会在当前目录创建/使用 `<参数值>.db` Sqlite 数据库文件
- --res-dir: 指定 上传图片/视频/附件 的本地储存目录，默认为 `./resources`
- --port: 指定论坛启动在本机的端口，默认为 `884`
- --set-admin-password: 使用这个参数在启动论坛时，重置管理员密码为参数值

## 论坛托管服务

你还可以选择使用 [MBBS 论坛托管服务](http://mbbs.cc) 一键创建并托管你的论坛，免去购买 服务器/域名/安装 等步骤。

托管后，如果想转为私有服务器部署，可以直接在托管后台导出论坛数据，使用开源版本 MBBS 私有化部署。

## 定制开发论坛

如果论坛当前能力/特性不能满足你的诉求，你可以直接 修改定制开源版本：

- git clone 至本地并 cd 进目录
- 开发调试：`npm run dev`
- 正式运行：`npm run start`

#### 技术栈

- 后端：Node.js ([express](https://github.com/expressjs/express) + [routing-controllers](https://github.com/typestack/routing-controllers.git) + Typescript)
- 前端：React ([mui](https://mui.com/) + Typescript)
- 数据库：Sqlite (ORM: [sequelize](https://sequelize.org/))

开发过程中如果什么问题，也可以 [在此交流](http://bbs.mbbs.cc/#/thread/category/5)

## Star & PR

喜欢的朋友帮忙给个 Start，欢迎提 PR！
