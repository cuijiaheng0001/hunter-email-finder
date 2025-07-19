#!/usr/bin/env python3
"""
测试 Hunter.io 的邮箱信息丰富功能
"""

import requests
import json
from hunter_api import get_api_key

def test_email_finder():
    """测试邮箱查找功能（需要名字）"""
    api_key = get_api_key()
    if not api_key:
        api_key = input("请输入Hunter.io API密钥: ")
    
    # 测试1：使用 email-finder 端点（需要提供名字）
    print("\n=== 测试 Email Finder API ===")
    domain = "stripe.com"
    first_name = "Patrick"
    last_name = "Collison"
    
    url = f"https://api.hunter.io/v2/email-finder"
    params = {
        'domain': domain,
        'first_name': first_name,
        'last_name': last_name,
        'api_key': api_key
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    print(f"\nEmail Finder 结果 ({first_name} {last_name} at {domain}):")
    print(json.dumps(data, indent=2, ensure_ascii=False))
    
def test_email_verifier():
    """测试邮箱验证功能"""
    api_key = get_api_key()
    if not api_key:
        api_key = input("请输入Hunter.io API密钥: ")
    
    # 测试2：验证已知邮箱
    print("\n=== 测试 Email Verifier API ===")
    email = "support@stripe.com"
    
    url = f"https://api.hunter.io/v2/email-verifier"
    params = {
        'email': email,
        'api_key': api_key
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    print(f"\nEmail Verifier 结果 ({email}):")
    print(json.dumps(data, indent=2, ensure_ascii=False))

def test_domain_with_linkedin():
    """测试带有LinkedIn整合的域名搜索"""
    api_key = get_api_key()
    if not api_key:
        api_key = input("请输入Hunter.io API密钥: ")
    
    # 测试3：搜索知名公司
    print("\n=== 测试大公司的域名搜索 ===")
    domains = ["microsoft.com", "apple.com", "google.com"]
    
    for domain in domains:
        print(f"\n搜索 {domain}:")
        url = f"https://api.hunter.io/v2/domain-search"
        params = {
            'domain': domain,
            'api_key': api_key,
            'limit': 5
        }
        
        response = requests.get(url, params=params)
        if response.ok:
            data = response.json()
            emails = data.get('data', {}).get('emails', [])
            
            print(f"找到 {len(emails)} 个邮箱:")
            for email in emails[:3]:  # 只显示前3个
                print(f"\n  邮箱: {email.get('value')}")
                print(f"  姓名: {email.get('first_name')} {email.get('last_name')}")
                print(f"  职位: {email.get('position')}")
                print(f"  部门: {email.get('department')}")
                print(f"  LinkedIn: {email.get('linkedin')}")
                print(f"  Twitter: {email.get('twitter')}")

def check_account_limits():
    """检查账户限制"""
    api_key = get_api_key()
    if not api_key:
        api_key = input("请输入Hunter.io API密钥: ")
    
    print("\n=== 账户信息 ===")
    url = f"https://api.hunter.io/v2/account"
    params = {'api_key': api_key}
    
    response = requests.get(url, params=params)
    if response.ok:
        data = response.json()
        account = data.get('data', {})
        
        print(f"账户邮箱: {account.get('email')}")
        print(f"账户类型: {account.get('plan_name')}")
        
        # 搜索限制
        searches = account.get('requests', {}).get('searches', {})
        print(f"\n域名搜索:")
        print(f"  - 已使用: {searches.get('used')}")
        print(f"  - 剩余: {searches.get('available')}")
        
        # 验证限制
        verifications = account.get('requests', {}).get('verifications', {})
        print(f"\n邮箱验证:")
        print(f"  - 已使用: {verifications.get('used')}")
        print(f"  - 剩余: {verifications.get('available')}")

if __name__ == "__main__":
    print("Hunter.io API 功能测试")
    print("=" * 50)
    
    # 检查账户信息
    check_account_limits()
    
    # 测试不同的API功能
    print("\n选择测试项目:")
    print("1. 测试大公司域名搜索（可能有更多个人信息）")
    print("2. 测试 Email Finder（通过姓名查找邮箱）")
    print("3. 测试 Email Verifier（验证邮箱）")
    print("4. 全部测试")
    
    choice = input("\n请选择 (1-4): ")
    
    if choice == '1' or choice == '4':
        test_domain_with_linkedin()
    
    if choice == '2' or choice == '4':
        test_email_finder()
    
    if choice == '3' or choice == '4':
        test_email_verifier()