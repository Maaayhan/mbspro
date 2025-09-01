# MBSPro Render 部署指南

## 项目概述

MBSPro 是一个基于 Next.js 前端和 NestJS 后端的全栈应用，使用 Supabase 作为数据库。

## 架构

- **前端**: Next.js (端口 3000)
- **后端**: NestJS API (端口 4000)  
- **数据库**: Supabase (PostgreSQL)
- **包管理**: pnpm monorepo

## 部署到 Render 的步骤

### 1. 准备工作

#### 1.1 确保 Supabase 配置完成
- 创建 Supabase 项目
- 获取项目 URL、anon key 和 service role key
- 运行数据库 schema (`supabase/schema.sql`)
- 运行迁移 (`supabase/migrations/2025-01-01-extensions-and-indexes.sql`)
- 种子数据 (`pnpm seed`)

#### 1.2 环境变量准备
需要准备以下环境变量：

**API 服务环境变量:**
```
NODE_ENV=production
PORT=4000
API_PREFIX=api
SWAGGER_ENABLED=true
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_URL=postgresql://postgres:password@db.project-id.supabase.co:5432/postgres?sslmode=require
PGSSLMODE=require
FRONTEND_URL=https://mbspro-web.onrender.com
```

**Web 服务环境变量:**
```
NODE_ENV=production
NEXT_PUBLIC_API_BASE=https://mbspro-api.onrender.com
```

### 2. 部署步骤

#### 方法一：使用 render.yaml (推荐)

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin deploy/onrender
   ```

2. **在 Render 中创建服务**
   - 登录 [render.com](https://render.com)
   - 点击 "New +" → "Blueprint"
   - 连接你的 GitHub 仓库
   - 选择 `deploy/onrender` 分支
   - Render 会自动检测 `render.yaml` 并创建两个服务

3. **配置环境变量**
   - 在 Render Dashboard 中为每个服务添加环境变量
   - 使用上面准备的环境变量

#### 方法二：手动创建服务

1. **创建 API 服务**
   - 在 Render 中创建新的 Web Service
   - 连接 GitHub 仓库
   - 配置：
     - **Build Command**: `cd apps/api && npm install -g pnpm && pnpm install --frozen-lockfile && pnpm build`
     - **Start Command**: `cd apps/api && pnpm start`
     - **Environment**: Node
     - **Plan**: Free

2. **创建 Web 服务**
   - 创建另一个 Web Service
   - 连接相同的 GitHub 仓库
   - 配置：
     - **Build Command**: `cd apps/web && npm install -g pnpm && pnpm install --frozen-lockfile && pnpm build`
     - **Start Command**: `cd apps/web && pnpm start`
     - **Environment**: Node
     - **Plan**: Free

### 3. 环境变量配置

在 Render Dashboard 中为每个服务添加环境变量：

#### API 服务环境变量
```
NODE_ENV=production
PORT=4000
API_PREFIX=api
SWAGGER_ENABLED=true
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_URL=postgresql://postgres:password@db.project-id.supabase.co:5432/postgres?sslmode=require
PGSSLMODE=require
FRONTEND_URL=https://your-web-service-url.onrender.com
```

#### Web 服务环境变量
```
NODE_ENV=production
NEXT_PUBLIC_API_BASE=https://your-api-service-url.onrender.com
```

### 4. 部署后验证

1. **检查 API 服务**
   - 访问 `https://your-api-service.onrender.com/api/health`
   - 应该返回 `{"ok": true, "ts": "...", "database": true}`

2. **检查 API 文档**
   - 访问 `https://your-api-service.onrender.com/docs`
   - 应该看到 Swagger 文档

3. **检查 Web 服务**
   - 访问 `https://your-web-service.onrender.com`
   - 应该看到前端应用

4. **测试功能**
   - 在前端应用中测试建议功能
   - 确保前后端通信正常

### 5. 常见问题

#### 5.1 构建失败
- 确保 pnpm 版本兼容
- 检查 Node.js 版本 (需要 18+)
- 查看构建日志中的具体错误

#### 5.2 环境变量问题
- 确保所有必需的环境变量都已设置
- 检查 Supabase 连接字符串格式
- 验证 API 密钥是否正确

#### 5.3 服务间通信问题
- 确保 `FRONTEND_URL` 和 `NEXT_PUBLIC_API_BASE` 使用正确的 Render URL
- 检查 CORS 配置

#### 5.4 数据库连接问题
- 确保 Supabase 项目未暂停
- 检查 `DATABASE_URL` 格式和 SSL 设置
- 验证数据库 schema 和迁移已应用

### 6. 监控和维护

1. **查看日志**
   - 在 Render Dashboard 中查看服务日志
   - 监控错误和性能指标

2. **更新部署**
   - 推送代码到 `deploy/onrender` 分支
   - Render 会自动重新部署

3. **环境变量更新**
   - 在 Render Dashboard 中更新环境变量
   - 重启服务使更改生效

## 注意事项

- Render 免费计划有资源限制，可能影响性能
- 免费计划的服务在无活动时会休眠，首次访问可能较慢
- 建议在生产环境中使用付费计划以获得更好的性能
- 定期备份 Supabase 数据
- 监控 API 使用量和 Supabase 配额

## 支持

如果遇到问题，请检查：
1. Render 服务日志
2. Supabase 项目状态
3. 环境变量配置
4. 网络连接
