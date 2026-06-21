# 🚀 云端部署指南

本指南将帮助您将应用部署到云端服务器，使手机可以随时随地访问。

## 📋 部署方式选择

| 方式 | 适用场景 | 难度 | 推荐指数 |
|------|----------|------|----------|
| **Docker部署** | 云服务器/VPS | 中等 | ⭐⭐⭐⭐⭐ |
| **Vercel部署** | 免费托管 | 简单 | ⭐⭐⭐⭐ |
| **Netlify部署** | 免费托管 | 简单 | ⭐⭐⭐⭐ |
| **阿里云ECS** | 企业级部署 | 复杂 | ⭐⭐⭐ |

---

## 🔧 方式一：Docker部署（推荐）

### 准备工作

1. **购买云服务器**（如阿里云ECS、腾讯云CVM、华为云等）
2. **配置安全组**：开放3000端口
3. **安装Docker**

### 部署步骤

```bash
# 1. 登录服务器
ssh root@your-server-ip

# 2. 安装Docker和Docker Compose
curl -fsSL https://get.docker.com | sh
apt-get install docker-compose -y

# 3. 克隆项目
git clone <your-repo-url>
cd egg-products-learning-app

# 4. 启动应用
docker-compose up -d
```

### 访问应用

```
http://your-server-ip:3000
```

---

## 🔧 方式二：Vercel部署（免费）

### 部署步骤

1. **注册Vercel账号**：https://vercel.com/
2. **连接GitHub仓库**
3. **配置项目**：
   - Framework: React
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **点击Deploy**

### 访问应用

部署完成后，Vercel会自动分配域名，如：
```
https://egg-products-learning-app.vercel.app
```

---

## 🔧 方式三：Netlify部署（免费）

### 部署步骤

1. **注册Netlify账号**：https://www.netlify.com/
2. **连接GitHub仓库**
3. **配置项目**：
   - Build Command: `npm run build`
   - Publish Directory: `dist`
4. **点击Deploy**

---

## 📲 手机安装

部署成功后，在手机上：

1. **打开浏览器**，访问部署地址
2. **添加到主屏幕**：
   - Chrome: 菜单 → 添加到主屏幕
   - Safari: 分享 → 添加到主屏幕
3. **完成安装**，应用图标出现在桌面

---

## 🔍 配置HTTPS（推荐）

### 使用Let's Encrypt

```bash
# 安装Certbot
apt-get install certbot python3-certbot-nginx -y

# 获取证书
certbot certonly --standalone -d your-domain.com

# 配置Nginx反向代理
```

### Nginx配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📝 常用命令

```bash
# 查看应用日志
docker-compose logs -f

# 停止应用
docker-compose down

# 重启应用
docker-compose restart

# 查看运行状态
docker-compose ps
```

---

## 🌐 部署架构图

```
┌─────────────────────────────────────────────────────────┐
│                    互联网                                │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                 云服务器 (VPS/ECS)                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │           Docker Container                      │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │      egg-products-learning-app          │    │   │
│  │  │  • Express Server                       │    │   │
│  │  │  • React PWA App                        │    │   │
│  │  │  • Port: 3000                           │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    手机客户端                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  PWA应用 (安装到主屏幕，离线可用)               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ 部署成功验证

1. **服务器端验证**：
   ```bash
   curl http://localhost:3000
   ```

2. **浏览器验证**：
   - 打开 http://your-server-ip:3000
   - 检查是否能正常显示应用

3. **手机验证**：
   - 在手机浏览器访问应用
   - 测试语音功能和闪卡功能

---

## 📌 注意事项

1. **安全组配置**：确保服务器开放3000端口（或使用反向代理）
2. **HTTPS推荐**：使用HTTPS确保安全，部分浏览器要求HTTPS才能安装PWA
3. **数据备份**：定期备份产品数据
4. **性能监控**：可配置Prometheus/Grafana监控

---

**如有问题，请查看日志或联系技术支持。**
