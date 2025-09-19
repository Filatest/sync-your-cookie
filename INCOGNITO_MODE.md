# 隐身模式 Cookie 同步功能

## 功能概述

我们为 Sync Your Cookie 扩展添加了全新的隐身模式 cookie 同步功能，让您可以在访客模式（隐身模式）中无缝访问您的登录状态，而无需担心在本地留下浏览痕迹。

## 使用场景

- **陌生电脑登录**：在不属于您的电脑上使用隐身模式，避免留下个人登录信息
- **临时访问**：需要临时登录某些网站但不想保存登录状态
- **隐私保护**：在共享电脑上保护隐私的同时享受便利的 cookie 同步

## 工作原理

1. **云端存储**：您的 cookie 数据安全存储在 Cloudflare KV 中
2. **隐身模式检测**：扩展自动检测隐身窗口的打开
3. **自动同步**：根据设置自动将云端 cookie 同步到隐身模式
4. **临时性质**：隐身窗口关闭后，所有 cookie 自动消失

## 功能特性

### 自动同步
- 打开隐身窗口时自动同步 cookie（需要启用设置）
- 支持 cookie 和 localStorage 数据同步
- 同步完成后显示紫色徽章提醒

### 手动控制
- **Sync to Incognito** 按钮：手动触发同步
- **Clear** 按钮：清除隐身模式中的所有 cookie
- 实时检测隐身窗口状态

### 安全设置
- **隐身自动同步开关**：在设置中控制是否自动同步
- **权限控制**：需要用户明确授权才能访问隐身模式

## 使用步骤

### 1. 启用隐身模式同步

1. 打开扩展的 **Options** 页面
2. 点击右上角的设置图标（齿轮）
3. 在设置面板中找到 **"Incognito Auto-Sync"**
4. 开启此选项

### 2. 配置 Cloudflare

确保您已经正确配置了 Cloudflare KV 存储：
- Account ID
- Namespace ID  
- API Token

### 3. 使用隐身模式同步

#### 自动同步模式：
1. 启用 "Incognito Auto-Sync" 设置
2. 打开新的隐身窗口
3. 等待自动同步完成（会显示紫色徽章）
4. 访问您需要的网站，享受已登录状态

#### 手动同步模式：
1. 打开隐身窗口
2. 点击扩展图标打开 popup
3. 在 "Incognito Mode" 部分点击 **"Sync to Incognito"**
4. 等待同步完成

### 4. 清除隐身 Cookie

如需清除隐身模式中的所有 cookie：
1. 在 popup 的 "Incognito Mode" 部分
2. 点击垃圾桶图标按钮
3. 确认清除操作

## 界面说明

### Popup 界面新增
当检测到隐身窗口时，popup 会显示 "Incognito Mode" 部分：
- **Eye 图标**：表示隐身模式功能
- **Sync to Incognito 按钮**：手动同步 cookie
- **Clear 按钮**：清除隐身 cookie  
- **提示信息**：显示是否启用了自动同步

### 设置界面新增
在设置 popover 中新增：
- **Incognito Auto-Sync 开关**：控制是否自动同步
- **帮助提示**：解释功能作用

## 注意事项

### 权限要求
- 扩展需要 `incognito: 'spanning'` 权限
- 需要 `scripting` 权限来注入 localStorage 数据
- 需要 `windows` 权限来检测隐身窗口

### 数据安全
- 所有数据通过 HTTPS 加密传输
- 支持 Protobuf 编码进一步保护数据
- 隐身模式中的 cookie 会在窗口关闭时自动清除

### 兼容性
- 支持 Chrome 和 Firefox（通过 webextension-polyfill）
- 兼容 Manifest V3
- 支持现有的所有 cookie 同步功能

## 故障排除

### 同步不工作
1. 检查是否启用了 "Incognito Auto-Sync"
2. 确认 Cloudflare 配置正确
3. 检查是否有隐身窗口打开
4. 查看浏览器控制台是否有错误信息

### 权限问题  
1. 确保扩展有隐身模式权限
2. 重新安装扩展可能需要重新授权
3. 检查浏览器设置中的扩展权限

### 数据不同步
1. 确认云端有 cookie 数据
2. 检查网络连接
3. 验证 API Token 是否有效
4. 检查域名配置是否正确

## 开发者信息

### 新增文件结构
```
packages/shared/lib/incognito/
├── index.ts          # 隐身模式工具函数
└── sync.ts           # 隐身模式同步逻辑

pages/popup/src/hooks/
└── useIncognitoSync.ts # 隐身模式 React Hook
```

### 关键 API
- `syncCookiesToIncognito()`: 同步 cookie 到隐身模式
- `clearIncognitoCookies()`: 清除隐身模式 cookie
- `hasIncognitoWindows()`: 检测隐身窗口
- `setupIncognitoListener()`: 监听隐身窗口事件

### 消息类型
- `MessageType.SyncToIncognito`: 手动同步消息
- `MessageType.ClearIncognitoCookies`: 清除消息

---

通过这些新功能，Sync Your Cookie 现在提供了更加安全和便利的隐私浏览体验！
