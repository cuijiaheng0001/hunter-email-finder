#!/usr/bin/env python3
"""
JSON修复工具
用于修复格式不正确的JSON文件
"""

import json
import sys
import re

def fix_json_file(input_file, output_file=None):
    """修复JSON文件中的常见格式问题"""
    
    if output_file is None:
        output_file = input_file.replace('.txt', '_fixed.txt')
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 记录修复的问题
    fixes = []
    
    # 1. 移除对象和数组末尾的逗号
    original = content
    content = re.sub(r',\s*}', '}', content)
    content = re.sub(r',\s*]', ']', content)
    if content != original:
        fixes.append("移除了多余的逗号")
    
    # 2. 检查并修复未关闭的数组
    lines = content.split('\n')
    open_brackets = 0
    array_starts = []
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped == '[':
            open_brackets += 1
            array_starts.append(i)
        elif stripped == ']':
            open_brackets -= 1
            if array_starts:
                array_starts.pop()
    
    # 如果有未关闭的数组
    if open_brackets > 0:
        fixes.append(f"发现 {open_brackets} 个未关闭的数组")
        
        # 从后往前查找最后一个完整的对象
        for i in range(len(lines) - 1, -1, -1):
            stripped = lines[i].strip()
            if stripped == '}' or stripped == '},':
                # 在这个对象后面插入缺失的 ]
                lines.insert(i + 1, ']' * open_brackets)
                fixes.append(f"在第 {i+2} 行添加了 {open_brackets} 个 ]")
                break
        
        content = '\n'.join(lines)
    
    # 3. 验证修复后的JSON
    arrays = []
    current_array = []
    in_array = False
    
    for line in content.split('\n'):
        stripped = line.strip()
        if not stripped:
            continue
            
        if stripped == '[':
            if in_array and current_array:
                # 处理之前的数组
                current_array.append(']')
                try:
                    array_str = '\n'.join(current_array)
                    parsed = json.loads(array_str)
                    arrays.append(parsed)
                except:
                    pass
            in_array = True
            current_array = ['[']
        elif in_array:
            current_array.append(stripped)
            if stripped == ']':
                try:
                    array_str = '\n'.join(current_array)
                    parsed = json.loads(array_str)
                    arrays.append(parsed)
                except Exception as e:
                    fixes.append(f"数组解析错误: {e}")
                current_array = []
                in_array = False
    
    # 如果还有未处理的数组
    if in_array and current_array:
        current_array.append(']')
        try:
            array_str = '\n'.join(current_array)
            parsed = json.loads(array_str)
            arrays.append(parsed)
            fixes.append("处理了文件末尾的未完成数组")
        except:
            pass
    
    # 统计结果
    total_companies = sum(len(arr) for arr in arrays)
    
    # 保存修复后的文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # 打印报告
    print(f"JSON文件修复报告")
    print(f"================")
    print(f"输入文件: {input_file}")
    print(f"输出文件: {output_file}")
    print(f"修复的问题:")
    for fix in fixes:
        print(f"  - {fix}")
    print(f"\n结果统计:")
    print(f"  - 发现 {len(arrays)} 个JSON数组")
    print(f"  - 共计 {total_companies} 个公司")
    
    # 显示每个数组的内容
    print(f"\n详细内容:")
    for i, arr in enumerate(arrays, 1):
        print(f"\n数组 {i} ({len(arr)} 个公司):")
        for company in arr:
            name = company.get('company_name', 'Unknown')
            website = company.get('website', 'No website')
            print(f"  - {name}: {website}")
    
    return output_file

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python fix_json.py <input_file.txt> [output_file.txt]")
        print("示例: python fix_json.py 德州json7.txt")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    try:
        fixed_file = fix_json_file(input_file, output_file)
        print(f"\n修复完成！修复后的文件: {fixed_file}")
    except Exception as e:
        print(f"错误: {e}")
        sys.exit(1)