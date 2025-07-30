const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 日志文件路径
const LOG_FILE = path.join(__dirname, 'proxy-server.log');

// 日志函数
function log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        data
    };
    
    // 输出到控制台
    console.log(`[${timestamp}] [${level}] ${message}`, data);
    
    // 写入日志文件
    try {
        fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
    } catch (error) {
        console.error('Failed to write log:', error);
    }
}

// 启用CORS，允许所有来源
app.use(cors());

// 解析JSON请求体
app.use(express.json());

// 请求日志中间件
app.use((req, res, next) => {
    const start = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    // 记录请求
    log('INFO', 'Incoming request', {
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    
    // 拦截响应
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - start;
        log('INFO', 'Request completed', {
            requestId,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
        originalSend.call(this, data);
    };
    
    next();
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Claude proxy server is running' });
});

// Claude API 代理端点
app.post('/api/claude/messages', async (req, res) => {
    try {
        // 从请求头获取API密钥
        const apiKey = req.headers['x-api-key'];
        
        if (!apiKey) {
            return res.status(401).json({ error: 'API key is required' });
        }

        // 转发请求到Claude API
        const response = await axios.post('https://api.anthropic.com/v1/messages', req.body, {
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            }
        });

        // 返回Claude API的响应
        res.json(response.data);
    } catch (error) {
        const errorDetails = {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        };
        
        log('ERROR', 'Claude API request failed', errorDetails);
        
        if (error.response) {
            // 转发Claude API的错误响应
            res.status(error.response.status).json(error.response.data);
        } else {
            // 网络或其他错误
            res.status(500).json({ 
                error: 'Failed to connect to Claude API',
                message: error.message 
            });
        }
    }
});

// 测试Claude API连接的端点
app.post('/api/claude/test', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        
        if (!apiKey) {
            return res.status(401).json({ error: 'API key is required' });
        }

        // 发送一个简单的测试消息
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 10,
            messages: [{
                role: 'user',
                content: 'Hi'
            }]
        }, {
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            }
        });

        res.json({ 
            success: true, 
            message: 'API key is valid',
            response: response.data 
        });
    } catch (error) {
        console.error('Claude API test error:', error.response?.data || error.message);
        
        if (error.response) {
            if (error.response.status === 401) {
                res.status(401).json({ 
                    success: false, 
                    error: 'Invalid API key' 
                });
            } else {
                res.status(error.response.status).json({ 
                    success: false,
                    error: error.response.data 
                });
            }
        } else {
            res.status(500).json({ 
                success: false,
                error: 'Failed to connect to Claude API',
                message: error.message 
            });
        }
    }
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// 启动服务器
app.listen(PORT, () => {
    log('INFO', 'Claude proxy server started', {
        port: PORT,
        endpoints: {
            health: `http://localhost:${PORT}/health`,
            proxy: `http://localhost:${PORT}/api/claude/messages`,
            test: `http://localhost:${PORT}/api/claude/test`
        }
    });
    
    console.log(`Claude proxy server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Claude API proxy: http://localhost:${PORT}/api/claude/messages`);
});