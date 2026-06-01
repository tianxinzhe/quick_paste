# QuickPaste 隐私政策 / Privacy Policy

最后更新 / Last Updated: 2026-05-29

## 数据收集 / Data Collection

QuickPaste **不收集任何用户数据**。所有数据完全存储在用户本地设备的浏览器中。

QuickPaste **does not collect any user data**. All data is stored entirely on the user's local device in the browser.

## 数据存储 / Data Storage

- 文本卡片和分类数据通过 `chrome.storage.local` 存储在本地浏览器中
- Text cards and category data are stored locally in the browser via `chrome.storage.local`
- 临时粘贴文本通过 `chrome.storage.session` 存储（会话结束后自动清除）
- Temporary paste text is stored via `chrome.storage.session` (cleared after session ends)
- 导入/导出文件仅保存在用户选择的本地路径
- Import/export files are only saved to user-selected local paths
- 不会将任何数据上传至外部服务器
- No data is uploaded to any external server

## 第三方服务 / Third-Party Services

- 本扩展集成了 PlayaYield 广告 SDK，用于展示可选的广告内容
- This extension integrates PlayaYield ad SDK for displaying optional ad content
- 广告 SDK 的隐私政策：https://playanext.com/privacy
- The ad SDK's privacy policy can be found at: https://playanext.com/privacy

## 权限用途 / Permission Usage

| 权限 / Permission | 用途 / Purpose |
|---|---|
| `sidePanel` | 显示侧边栏界面 / Display sidebar UI |
| `storage` | 存储文本卡片和分类数据 / Store text cards and categories |
| `activeTab` | 获取当前活动标签页以粘贴文本 / Get active tab for text pasting |
| `contextMenus` | 右键菜单收藏文本 / Right-click menu to save text |
| `alarms` | 保持扩展服务运行 / Keep extension service running |
| `tabs` | 查询标签页、发送消息、打开帮助页面 / Query tabs, send messages, open help page |
| `host_permissions` | 允许内容脚本在所有网站运行 / Allow content script on all websites |

## 联系方式 / Contact

如有隐私相关问题，请联系：tianxinzhe032@gmail.com

For privacy-related inquiries, please contact: tianxinzhe032@gmail.com
