# Hunter邮箱查找工具

一个基于Hunter.io API的邮箱查找工具，支持单个和批量域名查找，并集成了ChatGPT智能名字猜测功能。

## 功能特点

- 🔍 **单个域名查找**：输入域名快速查找相关邮箱
- 📋 **批量查找**：支持批量输入或上传CSV/TXT文件
- 🤖 **AI智能猜测**：使用ChatGPT智能生成邮件称呼
- 💾 **多格式导出**：支持Instantly AI格式CSV、完整CSV、JSON导出
- 🔐 **安全存储**：API密钥安全保存在浏览器本地存储

## 使用方法

1. **配置API密钥**
   - 输入Hunter.io API密钥（必需）
   - 输入OpenAI API密钥（可选，用于智能名字猜测）

2. **查找邮箱**
   - 单个查找：输入域名和公司名称
   - 批量查找：输入多个域名或上传文件

3. **导出结果**
   - Instantly格式：适用于Instantly AI平台
   - 完整CSV：包含所有详细信息
   - JSON：原始数据格式

## AI名字猜测规则

- 明确的名字（john.smith@）→ 提取完整名字
- 单个首字母（acarnes@）→ 保守处理为"A. Carnes"
- 不明确的模式（oquxi@）→ 使用"公司名 Team"
- 两个首字母（rgmora@）→ 保留为"RG Mora"

## 技术栈

- 纯前端HTML/CSS/JavaScript
- Hunter.io API
- OpenAI GPT-4 Turbo API
- 响应式设计

## 安装使用

直接在浏览器中打开 `Hunter邮箱查找工具-完整版.html` 文件即可使用。

## API获取

- Hunter.io API: https://hunter.io/api
- OpenAI API: https://platform.openai.com/api-keys

## 注意事项

- API密钥保存在浏览器localStorage中，不会上传到服务器
- 使用AI功能需要消耗OpenAI API积分
- 批量查找时会自动延迟避免速率限制

## License

MIT License