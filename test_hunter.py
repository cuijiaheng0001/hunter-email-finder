#!/usr/bin/env python3
"""
测试Hunter API功能
"""

import json
import os
from hunter_api import HunterAPIProcessor, get_api_key

def test_single_domain():
    """测试单个域名查询"""
    # 获取API密钥
    api_key = get_api_key()
    if not api_key:
        api_key = input("请输入Hunter.io API密钥: ")
    
    # 创建处理器
    processor = HunterAPIProcessor(api_key)
    
    # 测试一个已知的域名
    test_domain = "stripe.com"  # 使用一个知名公司域名
    print(f"\n测试域名: {test_domain}")
    
    result = processor.process_single_domain(test_domain)
    
    # 打印完整结果
    print("\n完整结果:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # 特别关注邮箱字段
    if result['success'] and result['emails']:
        print(f"\n找到 {len(result['emails'])} 个邮箱:")
        for idx, email in enumerate(result['emails'], 1):
            print(f"\n邮箱 {idx}:")
            print(f"  Email: {email.get('email')}")
            print(f"  First Name: {email.get('first_name')}")
            print(f"  Last Name: {email.get('last_name')}")
            print(f"  Position: {email.get('position')}")
            print(f"  Department: {email.get('department')}")
            print(f"  Confidence: {email.get('confidence')}%")
    else:
        print("\n未找到邮箱或查询失败")
        if 'error' in result:
            print(f"错误: {result['error']}")

def test_raw_api():
    """直接测试Hunter API响应"""
    import requests
    
    api_key = get_api_key()
    if not api_key:
        api_key = input("请输入Hunter.io API密钥: ")
    
    domain = "github.com"
    url = f"https://api.hunter.io/v2/domain-search?domain={domain}&api_key={api_key}&limit=5"
    
    print(f"\n直接API测试 - 域名: {domain}")
    print(f"URL: {url}")
    
    response = requests.get(url)
    data = response.json()
    
    print("\n原始API响应:")
    print(json.dumps(data, indent=2, ensure_ascii=False))
    
    # 检查邮箱字段
    if 'data' in data and 'emails' in data['data']:
        emails = data['data']['emails']
        if emails:
            print(f"\n第一个邮箱的所有字段:")
            for key, value in emails[0].items():
                print(f"  {key}: {value}")

if __name__ == "__main__":
    print("Hunter API 测试工具")
    print("==================")
    
    # 测试原始API
    test_raw_api()
    
    print("\n" + "="*50 + "\n")
    
    # 测试封装的功能
    test_single_domain()