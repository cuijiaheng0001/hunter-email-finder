# Claude API 代理服务器

这是一个简单的 Node.js 代理服务器，用于解决 Claude API 的 CORS 限制问题，让 Hunter 邮箱查找工具能够使用 Claude API。

## 功能特点

- 代理 Claude API 请求，绕过浏览器 CORS 限制
- 支持 API 密钥验证
- 提供健康检查端点
- 完整的错误处理

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境（可选）

复制 `.env.example` 为 `.env` 并设置端口（默认 3001）：

```bash
cp .env.example .env
```

### 3. 启动服务器

开发模式（自动重启）：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

服务器将在 http://localhost:3001 运行。

## API 端点

### 健康检查
- **GET** `/health` - 检查服务器是否正常运行

### Claude API 代理
- **POST** `/api/claude/messages` - 代理 Claude API 消息请求
- **POST** `/api/claude/test` - 测试 Claude API 密钥是否有效

## 使用方法

### 在前端使用

1. 在 Hunter 邮箱查找工具中，进入 Claude API 设置
2. 输入代理服务器地址（默认 `http://localhost:3001`）
3. 输入你的 Claude API 密钥
4. 点击"测试连接"验证设置

### 请求示例

```javascript
// 测试 API 密钥
fetch('http://localhost:3001/api/claude/test', {
    method: 'POST',
    headers: {
        'x-api-key': 'your-claude-api-key',
        'Content-Type': 'application/json'
    }
})

// 发送消息
fetch('http://localhost:3001/api/claude/messages', {
    method: 'POST',
    headers: {
        'x-api-key': 'your-claude-api-key',
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        messages: [{
            role: 'user',
            content: 'Hello'
        }],
        max_tokens: 100
    })
})
```

## 部署选项

### 本地部署
最简单的方式，适合个人使用。

### 云服务部署

#### Vercel
1. Fork 这个项目
2. 在 Vercel 导入项目
3. 部署完成后使用 Vercel 提供的 URL

#### Railway
1. 点击 "Deploy on Railway"
2. 设置环境变量
3. 部署完成

#### Heroku
1. 创建新的 Heroku 应用
2. 连接 GitHub 仓库
3. 启用自动部署

### Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

构建并运行：
```bash
docker build -t claude-proxy .
docker run -p 3001:3001 claude-proxy
```

## 安全注意事项

1. **不要在代码中硬编码 API 密钥**
2. **生产环境建议使用 HTTPS**
3. **考虑添加请求限制防止滥用**
4. **定期更新依赖包**

## 故障排除

### 连接失败
- 确保服务器正在运行
- 检查防火墙设置
- 验证代理 URL 是否正确

### API 密钥无效
- 确认密钥正确无误
- 检查密钥是否有有效的配额

### CORS 错误
- 确保使用代理服务器地址而不是直接调用 Claude API

## 许可证

MIT