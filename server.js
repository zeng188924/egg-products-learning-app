import express from 'express';
import compression from 'compression';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(compression());
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('🎯 蛋鸡产品学习助手已启动');
  console.log(`📍 本地访问: http://localhost:${PORT}`);
  console.log(`🌐 网络访问: http://172.16.0.101:${PORT}`);
  console.log('');
  console.log('📱 手机访问步骤:');
  console.log('   1. 确保手机和电脑连接到同一WiFi网络');
  console.log('   2. 在手机浏览器中打开: http://172.16.0.101:3000');
  console.log('   3. 点击浏览器菜单 -> 添加到主屏幕');
});