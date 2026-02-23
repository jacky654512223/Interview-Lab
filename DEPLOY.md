# Interview Lab 部署指南

部署后可在任意设备通过浏览器访问。**免费首选：Render**（无需信用卡）。

## 免费部署：Render（推荐）

### 1. 准备

- 有一个 **Groq**（或 DeepSeek / OpenAI）的 API Key。Groq 免费： [console.groq.com](https://console.groq.com) 注册后创建 Key。
- 代码已推到 **GitHub**（本仓库）。

### 2. 在 Render 创建 Web Service

1. 打开 **[render.com](https://render.com)**，用 **GitHub 账号登录**。
2. 点击 **Dashboard** 里的 **New +** → **Web Service**。
3. 在 **Connect a repository** 里选你的 **interview-lab** 仓库（若未显示，先点 **Configure account** 授权 Render 访问 GitHub）。
4. 确认以下配置（一般会自动带出，没有就手动填）：
   - **Name**：`interview-lab`（或任意）
   - **Region**：选离你近的（如 Singapore）
   - **Runtime**：**Node**
   - **Build Command**：`npm run install:all && npm run build`
   - **Start Command**：`npm start`
   - **Instance Type**：选 **Free**
5. 在 **Environment** 里点 **Add Environment Variable**，添加：
   - **Key**：`GROQ_API_KEY`  
     **Value**：你的 Groq API Key（在 Groq 控制台复制）
   - （可选）**Key**：`JWT_SECRET`  
     **Value**：任意一长串随机字符（用于登录安全，不设则用默认）
6. 点击 **Create Web Service**，等待构建和部署（约 2–5 分钟）。
7. 完成后在页面上会看到 **Your service is live at**：`https://xxx.onrender.com`。用手机或电脑浏览器打开该链接即可使用。

### 免费版说明

- **休眠**：约 15 分钟无人访问后会自动休眠；再次打开链接时需等待约 30–60 秒唤醒。
- **数据**：账号/简历/历史存在临时磁盘，重新部署或重启后可能清空，适合自用练习。
- **额度**：每月约 750 小时运行时间，个人使用足够。

---

## 其他方式

### Railway（需绑定信用卡后才有免费额度）

1. [railway.app](https://railway.app) → 用 GitHub 登录 → **New Project** → **Deploy from GitHub repo**。
2. **Variables** 添加 `GROQ_API_KEY`、`JWT_SECRET`。
3. **Settings** → Build Command：`npm run install:all && npm run build`，Start Command：`npm start`。
4. **Networking** → **Generate Domain** 得到访问地址。

### 自建 VPS / 本机

```bash
npm run install:all
npm run build
npm start
```

默认端口 3001（或环境变量 `PORT`）。外网访问需在服务器开放端口或使用内网穿透。

---

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `PORT` | 否 | Render 自动注入 |
| `JWT_SECRET` | 建议 | 登录 Token 签名，生产建议设 |
| `GROQ_API_KEY` 或 `DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY` | 是（三选一） | AI 接口密钥 |

更多见 `server/.env.example`。
