# MBSPro Render 部署指南

本文档说明如何将 MBSPro 应用部署到 Render.com。

## 📋 预备条件

1. **Render 账户**: 在 [render.com](https://render.com) 注册账户
2. **Supabase 项目**: 需要一个配置好的 Supabase 数据库
3. **GitHub 仓库**: 代码需要推送到 GitHub

## 🚀 部署步骤

### 1. 推送部署分支

```bash
# 确保在 render-deployment 分支
git add .
git commit -m "feat: add Render deployment configuration"
git push origin render-deployment
```

### 2. 在 Render 创建服务

1. 登录 Render Dashboard
2. 点击 "New +" → "Blueprint"
3. 连接你的 GitHub 仓库
4. 选择 `render-deployment` 分支
5. Render 会自动检测 `render.yaml` 文件并创建服务

### 3. 配置环境变量

在 Render Dashboard 中，为 **mbspro-api** 服务配置以下环境变量：

#### 必需的环境变量

```bash
# Supabase 配置
DATABASE_URL=postgresql://postgres:your_password@db.your-project-id.supabase.co:5432/postgres?sslmode=require
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 可选的 RAG 服务环境变量

```bash
# OpenAI (如果使用 RAG 功能)
OPENAI_API_KEY=sk-your-openai-key

# Pinecone (如果使用向量搜索)
PINECONE_API_KEY=your-pinecone-key

# Cohere (如果使用重排序)
COHERE_API_KEY=your-cohere-key

# 安全密钥
INGEST_SECRET=your-secure-secret
```

### 4. 验证部署

部署完成后，检查以下内容：

1. **API 健康检查**: 访问 `https://your-api-url/api/health`
2. **Swagger 文档**: 访问 `https://your-api-url/docs`
3. **Web 应用**: 访问你的前端 URL

## 📁 项目结构更改

为了支持 Render 部署，做了以下更改：

1. **移除 pnpm workspace 依赖**: 将 `@mbspro/shared` 包内联到各个应用中
2. **自定义构建脚本**: 创建了 `build.sh` 脚本来处理依赖安装和构建
3. **环境配置**: 配置了生产环境的环境变量

## 🔧 故障排除

### 构建失败
- 检查构建日志中的错误信息
- 确保所有依赖都在 `package.json` 中正确列出
- 验证构建脚本有执行权限

### 应用启动失败
- 检查环境变量是否正确设置
- 验证数据库连接字符串
- 查看应用日志了解具体错误

### API 无法访问
- 确认健康检查路径 `/api/health` 可访问
- 检查 CORS 配置
- 验证端口配置 (Render 会自动设置 PORT 环境变量)

## 📊 监控和日志

1. **Render Dashboard**: 查看服务状态、日志和度量
2. **Health Checks**: API 服务配置了 `/api/health` 健康检查
3. **日志**: 通过 Render Dashboard 查看实时日志

## 🔄 更新部署

要更新部署：

1. 在本地做出更改
2. 提交到 `render-deployment` 分支
3. 推送到 GitHub
4. Render 会自动重新部署

## 💡 最佳实践

1. **环境变量**: 使用 Render 的环境变量管理，不要在代码中硬编码敏感信息
2. **健康检查**: 确保 API 健康检查端点正常工作
3. **监控**: 定期检查应用日志和性能指标
4. **备份**: 定期备份 Supabase 数据库

## 🆘 获取帮助

如果遇到问题：

1. 查看 Render 官方文档: https://render.com/docs
2. 检查项目的 GitHub Issues
3. 查看 Supabase 文档了解数据库配置
