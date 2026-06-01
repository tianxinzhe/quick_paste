# QuickPaste

一款简洁高效的文本快速粘贴浏览器扩展，帮助你快速插入常用文本片段。

A simple and efficient browser extension for quick text pasting, helping you insert frequently used text snippets.

## 功能特性 / Features

- ✨ **快速粘贴** - 一键将预设文本粘贴到输入框
- 📋 **右键收藏** - 通过右键菜单快速收藏选中的文本
- 🏷️ **分类管理** - 支持文本卡片分类管理
- 🔄 **数据导入导出** - 支持 JSON 格式的数据备份和恢复
- 🌐 **多语言支持** - 支持中文、英文、日文、韩文
- ⏱️ **变量支持** - 支持日期、时间、随机数等动态变量

## 支持的变量 / Supported Variables

| 变量 / Variable | 说明 / Description | 示例 / Example |
|---|---|---|
| `{{year}}` | 当前年份 | 2024 |
| `{{month}}` | 当前月份 | 05 |
| `{{day}}` | 当前日期 | 29 |
| `{{hour}}` | 当前小时 | 14 |
| `{{minute}}` | 当前分钟 | 30 |
| `{{second}}` | 当前秒 | 45 |
| `{{date}}` | 当前日期（YYYY-MM-DD） | 2024-05-29 |
| `{{time}}` | 当前时间（HH:MM:SS） | 14:30:45 |
| `{{weekday}}` | 星期（简写） | 周三 |
| `{{weekday_cn}}` | 星期（全称） | 星期三 |
| `{{random_int}}` | 随机整数 | 12345678 |
| `{{random_int_1_3}}` | 指定范围随机整数 | 2 |
| `{{random_phone}}` | 随机手机号 | 13812345678 |
| `{{random_letters:N}}` | N位随机字母 | AbCdEf |
| `{{random_hex:N}}` | N位随机十六进制 | a1b2c3 |
| `{{random_digits:N}}` | N位随机数字 | 123456 |
| `{{uuid}}` | 随机 UUID | xxxxxxxx-xxxx-... |

## 快捷键 / Keyboard Shortcuts

| 快捷键 / Shortcut | 功能 / Action |
|---|---|
| `Ctrl+Shift+F` | 打开/关闭侧边面板 |
| `Alt+Shift+F` | 粘贴上次使用的内容 |
| `Alt+Shift+S` | 保存选中的文本 |

## 安装说明 / Installation

1. 下载或克隆本项目
2. 运行 `npm install` 安装依赖
3. 运行 `npm run build` 构建扩展
4. 在 Chrome 浏览器中打开 `chrome://extensions/`
5. 开启「开发者模式」
6. 点击「加载已解压的扩展程序」，选择 `dist` 目录

## 技术栈 / Tech Stack

- TypeScript
- Chrome Extension Manifest V3
- PlayaYield SDK (广告支持)

## 隐私政策 / Privacy Policy

QuickPaste 不收集任何用户数据，所有数据均存储在用户本地浏览器中。详情请参阅 [PRIVACY.md](./PRIVACY.md)。

QuickPaste does not collect any user data. All data is stored locally in the user's browser. See [PRIVACY.md](./PRIVACY.md) for details.

## 许可证 / License

MIT License

## 联系方式 / Contact

如有问题或建议，请联系：tianxinzhe032@gmail.com
