#!/usr/bin/env python3
"""
Hunter.io API Integration
邮箱查找API工具
"""

import json
import csv
import time
import requests
from datetime import datetime
from urllib.parse import urlparse
import os
from typing import List, Dict, Any

class HunterAPIProcessor:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.hunter.io/v2"
        self.results = []
        
    def extract_domain(self, url: str) -> str:
        """从URL中提取域名"""
        try:
            # 如果没有协议，添加 http://
            if not url.startswith(('http://', 'https://')):
                url = 'http://' + url
                
            parsed = urlparse(url)
            domain = parsed.netloc or parsed.path
            
            # 移除 www. 前缀
            if domain.startswith('www.'):
                domain = domain[4:]
            return domain
        except:
            return ""
    
    def search_domain(self, domain: str, limit: int = 10) -> Dict[str, Any]:
        """使用Hunter.io API搜索域名的邮箱"""
        url = f"{self.base_url}/domain-search"
        params = {
            'domain': domain,
            'api_key': self.api_key,
            'limit': limit
        }
        
        try:
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:
                # 速率限制，等待后重试
                return {
                    'error': 'Rate limit exceeded',
                    'retry_after': 60
                }
            elif response.status_code == 401:
                return {
                    'error': 'Invalid API key'
                }
            else:
                return {
                    'error': f'API error: {response.status_code}',
                    'message': response.text
                }
                
        except requests.exceptions.Timeout:
            return {'error': 'Request timeout'}
        except requests.exceptions.ConnectionError:
            return {'error': 'Connection error'}
        except Exception as e:
            return {'error': str(e)}
    
    def process_single_domain(self, domain_or_url: str, company_name: str = None) -> Dict[str, Any]:
        """处理单个域名或URL"""
        domain = self.extract_domain(domain_or_url)
        
        if not domain:
            return {
                'company_name': company_name or domain_or_url,
                'input': domain_or_url,
                'domain': '',
                'success': False,
                'error': 'Invalid domain',
                'emails': []
            }
        
        # 搜索邮箱
        result = self.search_domain(domain)
        
        if 'error' in result:
            return {
                'company_name': company_name or domain,
                'input': domain_or_url,
                'domain': domain,
                'success': False,
                'error': result['error'],
                'emails': []
            }
        
        # 处理成功的结果
        emails = result.get('data', {}).get('emails', [])
        email_list = []
        
        for email in emails:
            email_info = {
                'email': email.get('value'),
                'type': email.get('type', 'unknown'),  # personal, generic, or unknown
                'first_name': email.get('first_name'),
                'last_name': email.get('last_name'),
                'position': email.get('position'),
                'department': email.get('department'),
                'confidence': email.get('confidence'),
                'sources': len(email.get('sources', []))
            }
            email_list.append(email_info)
        
        return {
            'company_name': company_name or result.get('data', {}).get('organization', domain),
            'input': domain_or_url,
            'domain': domain,
            'success': True,
            'emails_found': len(email_list),
            'emails': email_list,
            'pattern': result.get('data', {}).get('pattern'),
            'organization': result.get('data', {}).get('organization')
        }
    
    def process_batch(self, domains: List[Dict[str, str]], delay: float = 1.0) -> List[Dict[str, Any]]:
        """批量处理域名列表"""
        results = []
        total = len(domains)
        
        for idx, item in enumerate(domains, 1):
            if isinstance(item, dict):
                domain = item.get('domain') or item.get('website') or item.get('url', '')
                company_name = item.get('company_name') or item.get('company', '')
            else:
                domain = str(item)
                company_name = ''
            
            print(f"Processing {idx}/{total}: {domain}")
            result = self.process_single_domain(domain, company_name)
            results.append(result)
            
            # 速率限制
            if idx < total:
                time.sleep(delay)
        
        return results
    
    def save_results(self, results: List[Dict[str, Any]], output_dir: str = 'output'):
        """保存结果到文件"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 确保输出目录存在
        os.makedirs(output_dir, exist_ok=True)
        
        # 保存JSON格式
        json_path = os.path.join(output_dir, f'hunter_results_{timestamp}.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        # 保存CSV格式
        csv_path = os.path.join(output_dir, f'hunter_emails_{timestamp}.csv')
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['company_name', 'domain', 'email', 'first_name', 
                         'last_name', 'position', 'department', 'confidence']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for company in results:
                if company.get('success') and company.get('emails'):
                    for email in company['emails']:
                        writer.writerow({
                            'company_name': company['company_name'],
                            'domain': company['domain'],
                            'email': email.get('email'),
                            'first_name': email.get('first_name'),
                            'last_name': email.get('last_name'),
                            'position': email.get('position'),
                            'department': email.get('department'),
                            'confidence': email.get('confidence')
                        })
        
        # 保存摘要
        summary_path = os.path.join(output_dir, f'hunter_summary_{timestamp}.txt')
        with open(summary_path, 'w', encoding='utf-8') as f:
            total = len(results)
            successful = sum(1 for r in results if r.get('success'))
            total_emails = sum(r.get('emails_found', 0) for r in results)
            
            f.write(f"Hunter API 处理摘要\n")
            f.write(f"==================\n")
            f.write(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"总处理数: {total}\n")
            f.write(f"成功数: {successful}\n")
            f.write(f"失败数: {total - successful}\n")
            f.write(f"找到的邮箱总数: {total_emails}\n")
            f.write(f"成功率: {successful/total*100:.1f}%\n")
            
            f.write(f"\n邮箱最多的公司:\n")
            sorted_results = sorted(
                [r for r in results if r.get('success')], 
                key=lambda x: x.get('emails_found', 0), 
                reverse=True
            )
            for company in sorted_results[:10]:
                if company.get('emails_found', 0) > 0:
                    f.write(f"- {company['company_name']}: {company['emails_found']} 个邮箱\n")
        
        return {
            'json_path': json_path,
            'csv_path': csv_path,
            'summary_path': summary_path
        }


# API密钥管理
def get_api_key():
    """获取API密钥"""
    # 1. 从环境变量
    api_key = os.environ.get('HUNTER_API_KEY')
    
    # 2. 从配置文件
    if not api_key:
        config_file = '.env'
        if os.path.exists(config_file):
            with open(config_file, 'r') as f:
                for line in f:
                    if line.startswith('HUNTER_API_KEY='):
                        api_key = line.strip().split('=')[1].strip('"\'')
                        break
    
    return api_key


def main():
    """命令行接口"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Hunter.io 邮箱查找工具')
    parser.add_argument('domain', help='要查找的域名或网址')
    parser.add_argument('--api-key', help='Hunter.io API密钥')
    parser.add_argument('--limit', type=int, default=10, help='每个域名的邮箱数量限制')
    parser.add_argument('--output', default='output', help='输出目录')
    
    args = parser.parse_args()
    
    # 获取API密钥
    api_key = args.api_key or get_api_key()
    if not api_key:
        print("错误: 未找到API密钥")
        print("请设置环境变量 HUNTER_API_KEY 或使用 --api-key 参数")
        return
    
    # 创建处理器
    processor = HunterAPIProcessor(api_key)
    
    # 处理单个域名
    result = processor.process_single_domain(args.domain)
    
    # 显示结果
    if result['success']:
        print(f"\n公司: {result['company_name']}")
        print(f"域名: {result['domain']}")
        print(f"找到邮箱: {result['emails_found']} 个")
        print(f"邮箱模式: {result.get('pattern', 'N/A')}")
        
        if result['emails']:
            print("\n邮箱列表:")
            for email in result['emails'][:args.limit]:
                print(f"  - {email['email']}")
                if email.get('first_name') or email.get('last_name'):
                    print(f"    姓名: {email.get('first_name', '')} {email.get('last_name', '')}")
                if email.get('position'):
                    print(f"    职位: {email['position']}")
                print(f"    可信度: {email.get('confidence', 0)}%")
    else:
        print(f"\n错误: {result['error']}")
    
    # 保存结果
    paths = processor.save_results([result], args.output)
    print(f"\n结果已保存到: {paths['csv_path']}")


if __name__ == "__main__":
    main()