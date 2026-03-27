const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 你的 Lark 应用配置
const LARK_APP_ID = 'cli_a930dc1e38f85eef';
const LARK_APP_SECRET = 'JbXSDhF6SSHGZNpnA1ziAdoBVX7S1D6B';

// 代理获取 tenant_access_token
app.post('/get-token', async (req, res) => {
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
        res.header('Access-Control-Allow-Origin', '*');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Lark Token Proxy is running.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Proxy running on port ${port}`);
});
