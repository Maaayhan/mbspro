# Render Deployment Guide for MBSPro

## 概述
MBSPro是一个包含Next.js前端和NestJS后端的monorepo项目。本指南将帮助你在Render上部署整个项目。

## 部署选项

### 选项1: 分别部署服务 (推荐)
由于monorepo的复杂性，建议分别部署API和Web服务：

1. **先部署API服务**：
   - 使用 `render-api.yaml` 文件
   - 在Render中创建新的Web服务
   - 上传 `render-api.yaml` 文件

2. **再部署Web服务**：
   - 使用 `render-web.yaml` 文件
   - 在Render中创建新的Web服务
   - 上传 `render-web.yaml` 文件

### 选项2: 使用完整render.yaml
1. 将代码推送到GitHub
2. 在Render中连接GitHub仓库
3. 选择"Blueprint"部署方式
4. 上传render.yaml文件
5. Render将自动创建所有服务

### 选项3: 手动创建服务
分别创建API、Web和数据库服务

## 环境变量配置

### API服务环境变量
- `NODE_ENV`: production
- `PORT`: 10000
- `DATABASE_URL`: PostgreSQL连接字符串
- `SUPABASE_URL`: Supabase项目URL
- `SUPABASE_ANON_KEY`: Supabase匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase服务角色密钥
- `OPENAI_API_KEY`: OpenAI API密钥
- `PINECONE_API_KEY`: Pinecone API密钥
- `COHERE_API_KEY`: Cohere API密钥

### Web服务环境变量
- `NODE_ENV`: production
- `PORT`: 10001
- `NEXT_PUBLIC_API_URL`: API服务URL (https://mbspro-api.onrender.com)
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase项目URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase匿名密钥

## 部署步骤

### 1. 准备代码
```bash
git checkout -b deploy/render
git add .
git commit -m "Add Render deployment configuration"
git push origin deploy/render
```

### 2. 在Render中创建服务
1. 登录Render控制台
2. 点击"New +"
3. 选择"Blueprint"
4. 连接GitHub仓库
5. 选择deploy/render分支
6. 上传render.yaml文件
7. 配置环境变量
8. 点击"Apply"

### 3. 等待部署完成
- 构建过程可能需要5-10分钟
- 检查构建日志确保没有错误
- 验证所有服务状态为"Live"

## 服务URL
- API: https://mbspro-api.onrender.com
- Web: https://mbspro-web.onrender.com
- Database: 内部访问

## 故障排除

### 常见问题
1. **构建失败**: 检查Node.js版本和依赖安装
2. **环境变量错误**: 确保所有必需的环境变量都已设置
3. **端口冲突**: 检查PORT环境变量设置
4. **数据库连接失败**: 验证DATABASE_URL格式

### 日志查看
在Render控制台中查看每个服务的构建和运行时日志

## 维护
- 定期更新依赖
- 监控服务状态
- 备份数据库
- 更新环境变量

## 成本估算
- Starter计划: $7/月/服务
- 总成本: ~$21/月 (3个服务)
- 包含512MB RAM和共享CPU
