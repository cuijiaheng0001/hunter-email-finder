// 备选的JSON解析方法，专门处理多个独立JSON数组的格式
function parseMultiArrayJSON(text) {
    const results = [];
    const errors = [];
    
    // 将文本按 ][ 分割成多个数组
    // 首先标准化换行符
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // 查找所有的JSON数组
    const arrayPattern = /\[\s*\{[\s\S]*?\}\s*\]/g;
    let match;
    let lastEnd = 0;
    
    while ((match = arrayPattern.exec(text)) !== null) {
        try {
            // 尝试解析找到的数组
            const arrayStr = match[0];
            const parsed = JSON.parse(arrayStr);
            
            if (Array.isArray(parsed)) {
                parsed.forEach(item => {
                    results.push({
                        company_name: item.company_name || '',
                        domain: item.website || item.domain || ''
                    });
                });
            }
        } catch (e) {
            // 如果解析失败，尝试修复常见问题
            try {
                let fixedStr = match[0]
                    .replace(/,\s*}/g, '}')  // 移除对象末尾的逗号
                    .replace(/,\s*]/g, ']'); // 移除数组末尾的逗号
                
                const parsed = JSON.parse(fixedStr);
                if (Array.isArray(parsed)) {
                    parsed.forEach(item => {
                        results.push({
                            company_name: item.company_name || '',
                            domain: item.website || item.domain || ''
                        });
                    });
                    errors.push(`修复并解析了一个格式错误的数组`);
                }
            } catch (e2) {
                errors.push(`无法解析数组: ${e2.message}`);
            }
        }
        lastEnd = match.index + match[0].length;
    }
    
    // 检查是否有未完成的数组
    const remaining = text.substring(lastEnd).trim();
    if (remaining && remaining.startsWith('[')) {
        // 尝试修复并解析未完成的数组
        try {
            let fixedArray = remaining;
            
            // 如果没有结束的 ]，添加它
            if (!fixedArray.includes(']')) {
                // 找到最后一个 }
                const lastBrace = fixedArray.lastIndexOf('}');
                if (lastBrace > -1) {
                    fixedArray = fixedArray.substring(0, lastBrace + 1) + '\n]';
                }
            }
            
            // 移除尾随逗号
            fixedArray = fixedArray
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');
            
            const parsed = JSON.parse(fixedArray);
            if (Array.isArray(parsed)) {
                parsed.forEach(item => {
                    results.push({
                        company_name: item.company_name || '',
                        domain: item.website || item.domain || ''
                    });
                });
                errors.push('处理了文件末尾的未完成数组');
            }
        } catch (e) {
            errors.push(`无法解析文件末尾的内容: ${e.message}`);
        }
    }
    
    return { results, errors };
}

// 导出给主程序使用
window.parseMultiArrayJSON = parseMultiArrayJSON;