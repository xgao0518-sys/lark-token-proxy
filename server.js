const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const url = require('url');

const app = express();

// 允许所有跨域请求
app.use(cors());
app.use(express.json());

// 你的 Lark 应用配置
const LARK_APP_ID = 'cli_a930dc1e38f85eef';
const LARK_APP_SECRET = 'JbXSDhF6SSHGZNpnA1ziAdoBVX7S1D6B';

// 全局 token 缓存
let cachedToken = null;
let tokenExpireTime = 0;

// 获取 tenant_access_token 的内部函数
async function getTenantAccessToken() {
    const now = Math.floor(Date.now() / 1000);
    if (cachedToken && now < tokenExpireTime) {
        return cachedToken;
    }

    try {
        const response = await fetch('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: LARK_APP_ID,
                app_secret: LARK_APP_SECRET
            })
        });
        const data = await response.json();

        if (data.tenant_access_token) {
            cachedToken = data.tenant_access_token;
            tokenExpireTime = now + (data.expire || 7200) - 60;
            return cachedToken;
        } else {
            throw new Error(`获取 token 失败: ${JSON.stringify(data)}`);
        }
    } catch (error) {
        console.error('获取 token 内部错误:', error);
        return null;
    }
}

// 统一的代理入口：前端所有对 Lark 的请求都发到这里
app.post('/lark-api/*', async (req, res) => {
    try {
        // 1. 获取 token
        const token = await getTenantAccessToken();
        if (!token) {
            return res.status(500).json({ error: '无法获取访问令牌' });
        }

        // 2. 构建目标 Lark API URL
        // 前端请求的路径是 /lark-api/open-apis/bitable/... 
        // 我们要把它转换成 https://open.larksuite.com/open-apis/bitable/...
        const originalUrl = req.url; // 例如 /lark-api/open-apis/bitable/...
        const targetPath = originalUrl.replace('/lark-api', '');
        const targetUrl = `https://open.larksuite.com${targetPath}`;

        // 3. 准备请求选项
        const fetchOptions = {
            method: req.method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        if (req.method !== 'GET' && req.body) {
            fetchOptions.body = JSON.stringify(req.body);
        }

        // 4. 向 Lark 发起请求
        const larkResponse = await fetch(targetUrl, fetchOptions);
        const data = await larkResponse.json();

        // 5. 将 Lark 的响应返回给前端
        res.json(data);
    } catch (error) {
        console.error('代理请求错误:', error);
        res.status(500).json({ error: error.message });
    }
});

// 健康检查
app.get('/', (req, res) => {
    res.send('Lark API Proxy is running. Use POST /lark-api/... to call Lark APIs.');
});

// 启动服务器
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Proxy running on port ${port}`);
});
