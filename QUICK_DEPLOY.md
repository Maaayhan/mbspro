# 🚀 MBSPro Render 快速部署

## 1. 推送代码
```bash
git push origin render-deployment
```

## 2. 在 Render 创建服务
1. 访问 [render.com](https://render.com) 
2. 点击 "New +" → "Blueprint"
3. 连接 GitHub 仓库
4. 选择 `render-deployment` 分支
5. Render 会自动检测 `render.yaml` 并创建两个服务

## 3. 必需的环境变量
在 **mbspro-api** 服务中设置：

```bash
DATABASE_URL=postgresql://postgres:password@db.project-id.supabase.co:5432/postgres?sslmode=require
SUPABASE_URL=https://project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 4. 验证部署
- API 健康检查: `https://your-api-url/api/health`
- Swagger 文档: `https://your-api-url/docs`
- Web 应用: `https://your-web-url`

## ✅ 完成！
两个服务会自动部署并相互连接。
