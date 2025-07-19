// 全局变量存储结果
let currentResults = [];

// 获取API密钥
function getApiKey() {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        alert('请输入 Hunter.io API 密钥');
        return null;
    }
    return apiKey;
}

// 单个域名查找
async function searchSingle() {
    const apiKey = getApiKey();
    if (!apiKey) return;

    const domain = document.getElementById('singleDomain').value.trim();
    const companyName = document.getElementById('companyName').value.trim();
    const limit = document.getElementById('emailLimit').value;

    if (!domain) {
        alert('请输入域名或网址');
        return;
    }

    showLoading(true);
    
    try {
        const result = await searchDomain(apiKey, domain, companyName, limit);
        currentResults = [result];
        displayResults(currentResults);
    } catch (error) {
        alert('查找失败: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// 批量查找
async function searchBatch() {
    const apiKey = getApiKey();
    if (!apiKey) return;

    let domains = [];
    
    // 从文本框获取
    const batchText = document.getElementById('batchInput').value.trim();
    if (batchText) {
        domains = batchText.split('\n').map(line => ({
            domain: line.trim(),
            company_name: ''
        })).filter(item => item.domain);
    }
    
    // 从文件获取（CSV或TXT）
    const fileInput = document.getElementById('csvFile');
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileData = await readUploadedFile(file);
        domains = domains.concat(fileData);
    }
    
    if (domains.length === 0) {
        alert('请输入域名或上传文件（支持CSV/TXT格式）');
        return;
    }
    
    showLoading(true);
    currentResults = [];
    
    try {
        // 批量查找，每个域名之间延迟1秒
        for (let i = 0; i < domains.length; i++) {
            const item = domains[i];
            updateLoadingText(`正在查找 ${i + 1}/${domains.length}: ${item.domain}`);
            
            try {
                const result = await searchDomain(apiKey, item.domain, item.company_name);
                currentResults.push(result);
                displayResults(currentResults);
            } catch (error) {
                console.error(`Error for ${item.domain}:`, error);
                currentResults.push({
                    company_name: item.company_name || item.domain,
                    domain: item.domain,
                    success: false,
                    error: error.message,
                    emails: []
                });
            }
            
            // 延迟以避免速率限制
            if (i < domains.length - 1) {
                await delay(1000);
            }
        }
    } finally {
        showLoading(false);
    }
}

// 调用Hunter API
async function searchDomain(apiKey, domain, companyName = '', limit = 10) {
    // 提取纯域名
    domain = extractDomain(domain);
    
    const url = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}&limit=${limit}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('API密钥无效');
            } else if (response.status === 429) {
                throw new Error('请求过于频繁，请稍后再试');
            } else {
                throw new Error(data.errors?.[0]?.details || '请求失败');
            }
        }
        
        // 处理结果
        const emails = data.data.emails || [];
        
        // 调试：打印第一个邮箱的原始数据
        if (emails.length > 0) {
            console.log('第一个邮箱的原始数据:', emails[0]);
        }
        
        const processedEmails = emails.map(email => {
            const processed = {
                email: email.value,
                type: email.type || 'unknown',  // personal, generic, or unknown
                first_name: email.first_name,
                last_name: email.last_name,
                position: email.position,
                department: email.department,
                confidence: email.confidence,
                sources: email.sources?.length || 0
            };
            
            // 调试：检查处理后的数据
            console.log('处理后的邮箱数据:', processed);
            return processed;
        });
        
        return {
            company_name: companyName || data.data.organization || domain,
            domain: domain,
            success: true,
            emails_found: emails.length,
            emails: processedEmails,
            pattern: data.data.pattern,
            organization: data.data.organization
        };
    } catch (error) {
        throw error;
    }
}

// 提取域名
function extractDomain(url) {
    // 移除协议
    url = url.replace(/^https?:\/\//, '');
    // 移除www
    url = url.replace(/^www\./, '');
    // 移除路径
    url = url.split('/')[0];
    // 移除端口
    url = url.split(':')[0];
    return url;
}

// 读取上传的文件（支持CSV和TXT/JSON格式）
async function readUploadedFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const fileName = file.name.toLowerCase();
            
            try {
                if (fileName.endsWith('.csv')) {
                    // 处理CSV格式
                    const lines = text.split('\n');
                    const results = [];
                    
                    for (let i = 1; i < lines.length; i++) { // 跳过标题行
                        const line = lines[i].trim();
                        if (!line) continue;
                        
                        const parts = line.split(',').map(p => p.trim());
                        if (parts.length >= 2) {
                            results.push({
                                company_name: parts[0],
                                domain: parts[1]
                            });
                        } else if (parts.length === 1) {
                            results.push({
                                company_name: '',
                                domain: parts[0]
                            });
                        }
                    }
                    
                    resolve(results);
                } else if (fileName.endsWith('.txt')) {
                    // 处理TXT文件中的JSON格式
                    
                    // 使用新的解析方法
                    if (window.parseMultiArrayJSON) {
                        const { results, errors } = window.parseMultiArrayJSON(text);
                        
                        if (errors.length > 0) {
                            console.warn('JSON解析警告:', errors);
                            alert(`成功解析 ${results.length} 个公司\n\n${errors.length > 0 ? '注意：\n' + errors.join('\n') : ''}`);
                        } else {
                            console.log(`成功解析 ${results.length} 个公司`);
                        }
                        
                        resolve(results);
                        return;
                    }
                    
                    // 备用方法（如果新方法不可用）
                    const results = [];
                    let parseErrors = [];
                    
                    // 首先尝试修复常见的JSON格式问题
                    let fixedText = text
                        .replace(/,\s*}/g, '}')  // 移除对象末尾的逗号
                        .replace(/,\s*]/g, ']')  // 移除数组末尾的逗号
                        .replace(/}\s*,\s*]/g, '}]')  // 修复 }, ] 这种情况
                        .replace(/,\s*,/g, ',')  // 移除双逗号
                        .trim();
                    
                    // 如果文件以未关闭的数组结束，尝试关闭它
                    const lines = fixedText.split('\n');
                    let openBrackets = 0;
                    let lastArrayStart = -1;
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (line === '[') {
                            openBrackets++;
                            lastArrayStart = i;
                        } else if (line === ']') {
                            openBrackets--;
                        }
                    }
                    
                    // 如果有未关闭的数组，尝试关闭它
                    if (openBrackets > 0) {
                        // 查找最后一个完整的对象
                        let lastCompleteBrace = -1;
                        for (let i = lines.length - 1; i >= lastArrayStart; i--) {
                            const trimmed = lines[i].trim();
                            if (trimmed === '}' || trimmed === '},') {
                                lastCompleteBrace = i;
                                // 如果是 }, 则移除逗号
                                if (trimmed === '},') {
                                    lines[i] = lines[i].replace(/,\s*$/, '');
                                }
                                break;
                            }
                        }
                        
                        if (lastCompleteBrace > -1) {
                            // 在最后一个完整对象后插入 ]
                            lines.splice(lastCompleteBrace + 1, 0, ']');
                            fixedText = lines.join('\n');
                            parseErrors.push('检测到未关闭的JSON数组，已自动修复');
                        }
                    }
                    
                    // 解析修复后的文本
                    const fixedLines = fixedText.split('\n');
                    let currentArray = [];
                    let inArray = false;
                    let arrayCount = 0;
                    
                    for (const line of fixedLines) {
                        const trimmed = line.trim();
                        if (!trimmed) continue;
                        
                        if (trimmed === '[') {
                            if (inArray) {
                                // 处理之前未完成的数组
                                currentArray.push(']');
                                try {
                                    const arrayStr = currentArray.join('\n');
                                    const items = JSON.parse(arrayStr);
                                    arrayCount++;
                                    for (const item of items) {
                                        results.push({
                                            company_name: item.company_name || '',
                                            domain: item.website || item.domain || ''
                                        });
                                    }
                                } catch (err) {
                                    parseErrors.push(`数组 ${arrayCount} 解析失败: ${err.message}`);
                                }
                            }
                            inArray = true;
                            currentArray = ['['];
                        } else if (inArray) {
                            currentArray.push(trimmed);
                            if (trimmed === ']') {
                                // 解析完整的数组
                                try {
                                    const arrayStr = currentArray.join('\n');
                                    const items = JSON.parse(arrayStr);
                                    arrayCount++;
                                    for (const item of items) {
                                        results.push({
                                            company_name: item.company_name || '',
                                            domain: item.website || item.domain || ''
                                        });
                                    }
                                } catch (err) {
                                    parseErrors.push(`数组 ${arrayCount} 解析失败: ${err.message}`);
                                }
                                currentArray = [];
                                inArray = false;
                            }
                        }
                    }
                    
                    // 如果还有未处理的数组内容
                    if (inArray && currentArray.length > 1) {
                        currentArray.push(']');
                        try {
                            const arrayStr = currentArray.join('\n');
                            const items = JSON.parse(arrayStr);
                            arrayCount++;
                            for (const item of items) {
                                results.push({
                                    company_name: item.company_name || '',
                                    domain: item.website || item.domain || ''
                                });
                            }
                            parseErrors.push('处理了文件末尾的未完成数组');
                        } catch (err) {
                            parseErrors.push(`最后一个数组解析失败: ${err.message}`);
                        }
                    }
                    
                    // 显示解析信息
                    if (parseErrors.length > 0) {
                        console.warn('JSON解析警告:', parseErrors);
                        alert(`成功解析 ${results.length} 个公司\n\n注意事项：\n${parseErrors.join('\n')}`);
                    } else {
                        console.log(`成功解析 ${results.length} 个公司`);
                    }
                    
                    resolve(results);
                } else {
                    reject(new Error('不支持的文件格式'));
                }
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

// 显示结果
function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    const resultContent = document.getElementById('resultContent');
    
    resultsDiv.style.display = 'block';
    
    // 统计信息
    const totalCompanies = results.length;
    const successfulCompanies = results.filter(r => r.success).length;
    const totalEmails = results.reduce((sum, r) => sum + (r.emails_found || 0), 0);
    
    let html = `
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${totalCompanies}</div>
                <div class="stat-label">总公司数</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${successfulCompanies}</div>
                <div class="stat-label">成功查找</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalEmails}</div>
                <div class="stat-label">找到邮箱</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${successfulCompanies > 0 ? Math.round(successfulCompanies/totalCompanies*100) : 0}%</div>
                <div class="stat-label">成功率</div>
            </div>
        </div>
    `;
    
    // 详细结果
    results.forEach(result => {
        html += `<div class="result-item">`;
        
        if (result.success) {
            html += `
                <div class="company-info">
                    <div>
                        <div class="company-name">${result.company_name}</div>
                        <div class="domain">${result.domain}</div>
                    </div>
                    <div class="email-count">${result.emails_found} 个邮箱</div>
                </div>
            `;
            
            if (result.emails && result.emails.length > 0) {
                html += '<div class="email-list">';
                result.emails.forEach(email => {
                    const confidenceClass = email.confidence >= 80 ? 'confidence-high' : 
                                          email.confidence >= 50 ? 'confidence-medium' : 'confidence-low';
                    
                    // 邮箱类型显示
                    const typeDisplay = email.type === 'personal' ? '个人' : 
                                      email.type === 'generic' ? '通用' : 
                                      email.type === 'role' ? '角色' : '未知';
                    const typeClass = email.type === 'personal' ? 'type-personal' : 
                                    email.type === 'generic' ? 'type-generic' : 'type-unknown';
                    
                    html += `
                        <div class="email-item">
                            <div>
                                <div class="email-address">${email.email}</div>
                                <div class="email-details">
                                    <span class="email-type ${typeClass}">${typeDisplay}</span>
                                    ${email.first_name || email.last_name ? `• ${email.first_name || ''} ${email.last_name || ''}` : ''}
                                    ${email.position ? `• ${email.position}` : ''}
                                    ${email.department ? `• ${email.department}` : ''}
                                </div>
                            </div>
                            <span class="confidence ${confidenceClass}">可信度: ${email.confidence}%</span>
                        </div>
                    `;
                });
                html += '</div>';
            }
            
            if (result.pattern) {
                html += `<div style="margin-top: 10px; color: #666;">邮箱模式: ${result.pattern}</div>`;
            }
        } else {
            html += `
                <div class="company-info">
                    <div>
                        <div class="company-name">${result.company_name}</div>
                        <div class="domain">${result.domain}</div>
                    </div>
                </div>
                <div class="error">错误: ${result.error}</div>
            `;
        }
        
        html += '</div>';
    });
    
    resultContent.innerHTML = html;
}

// 下载CSV（保留这个函数用于兼容性）
function downloadCSV() {
    downloadInstantlyCSV();
}

// 下载Instantly AI格式的CSV
function downloadInstantlyCSV() {
    if (currentResults.length === 0) return;
    
    // 添加BOM以支持Excel正确显示中文（UTF-8编码）
    const BOM = '\uFEFF';
    let csv = BOM + 'Email,First Name,Last Name,Company Name,Phone,Job Title,Country,Email Type\n';
    
    currentResults.forEach(result => {
        if (result.success && result.emails && result.emails.length > 0) {
            result.emails.forEach(email => {
                // 处理First Name：如果是通用邮箱，使用公司名+Team
                let firstName = email.first_name || '';
                if ((email.type === 'generic' || email.type === 'role') && !firstName) {
                    // 移除公司名称后缀
                    const cleanCompanyName = cleanupCompanyName(result.company_name);
                    firstName = cleanCompanyName ? `${cleanCompanyName} Team` : '';
                }
                
                // 按照Instantly AI要求的字段顺序，加上自定义字段
                const row = [
                    email.email || '',                    // Email (必填)
                    firstName,                            // First Name (处理后的)
                    email.last_name || '',                // Last Name
                    result.company_name || '',            // Company Name
                    '',                                   // Phone (留空)
                    email.position || '',                 // Job Title
                    '',                                   // Country (留空)
                    email.type || 'unknown'               // Email Type (自定义字段)
                ];
                
                // 转义处理
                const escapedRow = row.map(field => {
                    const str = String(field);
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;  // Instantly可能不需要所有字段都加引号
                });
                
                csv += escapedRow.join(',') + '\n';
            });
        }
        // 注意：Instantly格式中，没有邮箱的公司不包含在CSV中
    });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    downloadFile(csv, `instantly_contacts_${timestamp}.csv`, 'text/csv;charset=utf-8');
    
    // 提示用户
    alert('已下载Instantly AI格式的CSV文件\n\n注意：\n- 只包含有邮箱的联系人\n- Phone和Country字段为空，需要时请手动补充\n- Email Type字段标识邮箱类型（personal/generic）\n- 通用邮箱的First Name自动设为"公司名 Team"');
}

// 下载完整格式的CSV（保留所有信息）
function downloadFullCSV() {
    if (currentResults.length === 0) return;
    
    const BOM = '\uFEFF';
    let csv = BOM + 'Company Name,Domain,Email,Email Type,First Name,Last Name,Position,Department,Confidence\n';
    
    currentResults.forEach(result => {
        if (result.success && result.emails && result.emails.length > 0) {
            result.emails.forEach(email => {
                const row = [
                    result.company_name || '',
                    result.domain || '',
                    email.email || '',
                    email.type || 'unknown',
                    email.first_name || '',
                    email.last_name || '',
                    email.position || '',
                    email.department || '',
                    email.confidence !== undefined ? email.confidence : ''
                ];
                
                const escapedRow = row.map(field => {
                    const str = String(field);
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return `"${str}"`;
                });
                
                csv += escapedRow.join(',') + '\n';
            });
        } else {
            // 包含没有邮箱的公司
            csv += `"${result.company_name || ''}","${result.domain || ''}","","","","","","",""\n`;
        }
    });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    downloadFile(csv, `hunter_full_results_${timestamp}.csv`, 'text/csv;charset=utf-8');
}

// 下载JSON
function downloadJSON() {
    if (currentResults.length === 0) return;
    
    const json = JSON.stringify(currentResults, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    downloadFile(json, `hunter_results_${timestamp}.json`, 'application/json');
}

// 下载文件
function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 清除结果
function clearResults() {
    currentResults = [];
    document.getElementById('results').style.display = 'none';
    document.getElementById('singleDomain').value = '';
    document.getElementById('companyName').value = '';
    document.getElementById('batchInput').value = '';
    document.getElementById('csvFile').value = '';
}

// 显示/隐藏加载动画
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// 更新加载文字
function updateLoadingText(text) {
    const loading = document.getElementById('loading');
    const p = loading.querySelector('p');
    if (p) {
        p.textContent = text;
    }
}

// 延迟函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// API密钥管理功能
function toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('apiKey');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleIcon.textContent = '🙈';
    } else {
        apiKeyInput.type = 'password';
        toggleIcon.textContent = '👁️';
    }
}

function saveApiKey() {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        showApiStatus('请输入API密钥', 'error');
        return;
    }
    
    localStorage.setItem('hunterApiKey', apiKey);
    showApiStatus('API密钥已保存', 'success');
}

function clearApiKey() {
    if (confirm('确定要清除保存的API密钥吗？')) {
        localStorage.removeItem('hunterApiKey');
        document.getElementById('apiKey').value = '';
        showApiStatus('API密钥已清除', 'success');
    }
}

async function testApiKey() {
    const apiKey = getApiKey();
    if (!apiKey) return;
    
    showApiStatus('测试连接中...', 'testing');
    
    try {
        // 使用一个测试域名来验证API密钥
        const testDomain = 'google.com';
        const url = `https://api.hunter.io/v2/domain-search?domain=${testDomain}&api_key=${apiKey}&limit=1`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok) {
            // 获取账户信息
            const accountUrl = `https://api.hunter.io/v2/account?api_key=${apiKey}`;
            const accountResponse = await fetch(accountUrl);
            const accountData = await accountResponse.json();
            
            if (accountResponse.ok) {
                const remaining = accountData.data.requests.searches.available;
                const used = accountData.data.requests.searches.used;
                showApiStatus(`连接成功！剩余查询次数: ${remaining} (已使用: ${used})`, 'success');
            } else {
                showApiStatus('连接成功！', 'success');
            }
        } else {
            if (response.status === 401) {
                showApiStatus('API密钥无效，请检查', 'error');
            } else {
                showApiStatus(`连接失败: ${data.errors?.[0]?.details || '未知错误'}`, 'error');
            }
        }
    } catch (error) {
        showApiStatus('网络错误，请检查网络连接', 'error');
    }
}

function showApiStatus(message, type) {
    const statusElement = document.getElementById('apiStatus');
    statusElement.textContent = message;
    statusElement.className = `api-status ${type}`;
    
    // 3秒后自动清除非错误消息
    if (type !== 'error') {
        setTimeout(() => {
            if (statusElement.textContent === message) {
                statusElement.textContent = '';
                statusElement.className = 'api-status';
            }
        }, 3000);
    }
}

// 保存API密钥到本地存储（输入时自动保存）
document.addEventListener('DOMContentLoaded', function() {
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', debounce(function() {
            const apiKey = this.value ? this.value.trim() : '';
            if (apiKey) {
                localStorage.setItem('hunterApiKey', apiKey);
            }
        }, 1000));
    }
});

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 清理公司名称，移除常见后缀
function cleanupCompanyName(companyName) {
    if (!companyName) return '';
    
    // 常见的公司后缀
    const suffixes = [
        // 英文后缀
        ', LLC', ' LLC', ', INC', ' INC', ', Inc.', ' Inc.', ', Inc', ' Inc',
        ', CORP', ' CORP', ', Corp.', ' Corp.', ', Corp', ' Corp',
        ', LTD', ' LTD', ', Ltd.', ' Ltd.', ', Ltd', ' Ltd',
        ', CO', ' CO', ', Co.', ' Co.', ', Co', ' Co',
        ', COMPANY', ' COMPANY', ', Company', ' Company',
        ', CORPORATION', ' CORPORATION', ', Corporation', ' Corporation',
        ', INCORPORATED', ' INCORPORATED', ', Incorporated', ' Incorporated',
        ', LIMITED', ' LIMITED', ', Limited', ' Limited',
        ', LP', ' LP', ', L.P.', ' L.P.',
        ', LLP', ' LLP', ', L.L.P.', ' L.L.P.',
        ', PC', ' PC', ', P.C.', ' P.C.',
        ', PA', ' PA', ', P.A.', ' P.A.',
        ', PLLC', ' PLLC', ', P.L.L.C.', ' P.L.L.C.',
        ', SERIES', ' SERIES', ', Series', ' Series',
        // 中文后缀
        '有限公司', '股份有限公司', '有限责任公司', '集团', '公司'
    ];
    
    let cleanName = companyName.trim();
    
    // 移除后缀
    for (const suffix of suffixes) {
        if (cleanName.endsWith(suffix)) {
            cleanName = cleanName.substring(0, cleanName.length - suffix.length).trim();
            break; // 只移除一个后缀
        }
    }
    
    // 移除多余的标点符号
    cleanName = cleanName.replace(/[,.]$/, '').trim();
    
    return cleanName;
}

// 页面加载时恢复API密钥
window.addEventListener('load', function() {
    const savedApiKey = localStorage.getItem('hunterApiKey');
    if (savedApiKey) {
        document.getElementById('apiKey').value = savedApiKey;
        showApiStatus('已加载保存的API密钥', 'success');
        // 自动测试连接
        setTimeout(() => {
            testApiKey();
        }, 500);
    }
});