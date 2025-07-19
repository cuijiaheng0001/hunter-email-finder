#!/usr/bin/env python3
"""
Flask后端服务器 - 邮箱查找API
提供本地服务器支持，避免CORS问题
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from hunter_api import HunterAPIProcessor, get_api_key

app = Flask(__name__, static_folder='static')
CORS(app)  # 允许跨域请求

# 静态文件路由
@app.route('/')
def index():
    return send_from_directory(os.path.dirname(os.path.abspath(__file__)), 'API TEST 2.html')

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

# API路由
@app.route('/api/search', methods=['POST'])
def search_email():
    """搜索邮箱API端点"""
    try:
        data = request.json
        api_key = data.get('api_key') or get_api_key()
        
        if not api_key:
            return jsonify({
                'success': False,
                'error': '未提供API密钥'
            }), 400
        
        domain = data.get('domain')
        if not domain:
            return jsonify({
                'success': False,
                'error': '未提供域名'
            }), 400
        
        company_name = data.get('company_name', '')
        limit = data.get('limit', 10)
        
        # 创建处理器并搜索
        processor = HunterAPIProcessor(api_key)
        result = processor.process_single_domain(domain, company_name)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/batch', methods=['POST'])
def batch_search():
    """批量搜索邮箱API端点"""
    try:
        data = request.json
        api_key = data.get('api_key') or get_api_key()
        
        if not api_key:
            return jsonify({
                'success': False,
                'error': '未提供API密钥'
            }), 400
        
        domains = data.get('domains', [])
        if not domains:
            return jsonify({
                'success': False,
                'error': '未提供域名列表'
            }), 400
        
        delay = data.get('delay', 1.0)
        
        # 创建处理器并批量搜索
        processor = HunterAPIProcessor(api_key)
        results = processor.process_batch(domains, delay)
        
        return jsonify({
            'success': True,
            'results': results,
            'total': len(results),
            'successful': sum(1 for r in results if r.get('success'))
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/save', methods=['POST'])
def save_results():
    """保存结果到文件"""
    try:
        data = request.json
        results = data.get('results', [])
        
        if not results:
            return jsonify({
                'success': False,
                'error': '没有结果可保存'
            }), 400
        
        # 使用processor保存结果
        processor = HunterAPIProcessor('')
        paths = processor.save_results(results)
        
        return jsonify({
            'success': True,
            'files': paths
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 健康检查
@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'ok',
        'service': '邮箱查找API'
    })

if __name__ == '__main__':
    print("邮箱查找服务启动中...")
    print("访问地址: http://localhost:5000")
    print("API文档:")
    print("  - POST /api/search - 搜索单个域名")
    print("  - POST /api/batch - 批量搜索域名")
    print("  - POST /api/save - 保存结果到文件")
    print("  - GET /api/health - 健康检查")
    
    # 确保输出目录存在
    os.makedirs('output', exist_ok=True)
    
    # 启动服务器
    app.run(host='0.0.0.0', port=5000, debug=True)