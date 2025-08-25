#!/usr/bin/env node

/**
 * 清理脚本 - 删除构建产物和缓存文件
 * 使用方法: node scripts/clean.js 或 pnpm clean
 */

const fs = require('fs');
const path = require('path');

// 需要清理的目录和文件
const CLEAN_PATTERNS = [
  // 构建产物
  'apps/api/dist',
  'apps/web/.next',
  'apps/web/out',
  'packages/shared/dist',
  
  // 缓存文件
  'node_modules/.cache',
  '.next',
  'dist',
  
  // TypeScript缓存
  '**/*.tsbuildinfo',
  
  // 测试覆盖率
  'coverage',
  '.nyc_output',
  
  // 日志文件
  '*.log',
  'logs',
  
  // 临时文件
  '*.tmp',
  '*.temp',
];

// 递归删除目录
function rimraf(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ 已删除: ${dirPath}`);
    } catch (error) {
      console.warn(`⚠️  删除失败: ${dirPath} - ${error.message}`);
    }
  }
}

// 通配符匹配删除
function cleanGlob(pattern) {
  const glob = require('glob');
  try {
    const files = glob.sync(pattern, { ignore: 'node_modules/**' });
    files.forEach(file => {
      if (fs.existsSync(file)) {
        const stat = fs.statSync(file);
        if (stat.isDirectory()) {
          rimraf(file);
        } else {
          fs.unlinkSync(file);
          console.log(`✅ 已删除文件: ${file}`);
        }
      }
    });
  } catch (error) {
    console.warn(`⚠️  清理模式失败: ${pattern} - ${error.message}`);
  }
}

function main() {
  console.log('🧹 开始清理项目...\n');

  // 清理指定目录
  CLEAN_PATTERNS.forEach(pattern => {
    if (pattern.includes('*')) {
      cleanGlob(pattern);
    } else {
      rimraf(pattern);
    }
  });

  console.log('\n🎉 清理完成!');
  console.log('\n💡 提示: 运行 pnpm install 重新安装依赖');
}

if (require.main === module) {
  main();
}

module.exports = { main };
