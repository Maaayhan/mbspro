#!/usr/bin/env ts-node

/**
 * MBSPro Test Examples
 * 展示各種測試文字和搜索場景
 *
 * 用法：npx ts-node test-examples.ts
 */

import { supabaseClient } from './src/config/supabase.config';
import * as dotenv from 'dotenv';

dotenv.config();

interface TestCase {
  name: string;
  query: string;
  description: string;
  expectedResults?: number;
}

const testCases: TestCase[] = [
  // 1. 精確匹配測試
  {
    name: "精確代碼匹配",
    query: "23",
    description: "搜索特定 MBS 代碼",
    expectedResults: 1
  },

  // 2. 關鍵字匹配測試
  {
    name: "醫生門診搜索",
    query: "general practitioner",
    description: "搜索普通科醫生相關服務",
    expectedResults: 3
  },
  {
    name: "專科醫生搜索",
    query: "specialist physician",
    description: "搜索專科醫生服務",
    expectedResults: 1
  },

  // 3. 時間相關測試
  {
    name: "加班服務搜索",
    query: "after hours",
    description: "搜索非工作時間服務",
    expectedResults: 3
  },
  {
    name: "週末服務搜索",
    query: "weekend",
    description: "搜索週末服務",
    expectedResults: 2
  },
  {
    name: "緊急服務搜索",
    query: "urgent",
    description: "搜索緊急服務",
    expectedResults: 2
  },

  // 4. 服務類型測試
  {
    name: "兒科服務搜索",
    query: "child health",
    description: "搜索兒童健康服務",
    expectedResults: 1
  },
  {
    name: "心理健康搜索",
    query: "mental health",
    description: "搜索心理健康服務",
    expectedResults: 1
  },
  {
    name: "疫苗服務搜索",
    query: "vaccination",
    description: "搜索疫苗接種服務",
    expectedResults: 1
  },
  {
    name: "家庭訪視搜索",
    query: "home visit",
    description: "搜索家庭訪視服務",
    expectedResults: 1
  },

  // 5. 遠程醫療測試
  {
    name: "遠程醫療搜索",
    query: "telehealth",
    description: "搜索支持遠程醫療的服務",
    expectedResults: 4
  },

  // 6. 預防性服務測試
  {
    name: "預防保健搜索",
    query: "preventive",
    description: "搜索預防性保健服務",
    expectedResults: 2
  },

  // 7. 模糊匹配測試
  {
    name: "部分匹配 - 'consultation'",
    query: "consultation",
    description: "搜索包含 'consultation' 的服務",
    expectedResults: 2
  },
  {
    name: "部分匹配 - 'health'",
    query: "health",
    description: "搜索包含 'health' 的服務",
    expectedResults: 4
  },
  {
    name: "部分匹配 - 'attendance'",
    query: "attendance",
    description: "搜索包含 'attendance' 的服務",
    expectedResults: 6
  },

  // 8. 複合關鍵字測試
  {
    name: "複合搜索 - 'general practitioner after hours'",
    query: "general practitioner after hours",
    description: "搜索普通科醫生非工作時間服務",
    expectedResults: 2
  },

  // 9. 費用相關測試
  {
    name: "免費服務搜索",
    query: "bulk billed",
    description: "搜索免費服務",
    expectedResults: 1
  },

  // 10. 醫療專業測試
  {
    name: "心理學家服務",
    query: "psychologist",
    description: "搜索心理學家服務",
    expectedResults: 1
  },
  {
    name: "聯盟健康服務",
    query: "allied health",
    description: "搜索聯盟健康服務",
    expectedResults: 1
  }
];

async function runTest(testCase: TestCase) {
  console.log(`\n🔍 ${testCase.name}`);
  console.log(`   查詢: "${testCase.query}"`);
  console.log(`   說明: ${testCase.description}`);

  try {
    // 使用 Supabase 搜索功能
    const { data, error } = await supabaseClient
      .from('mbs_items')
      .select('*')
      .or(`title.ilike.%${testCase.query}%,description.ilike.%${testCase.query}%`)
      .limit(10);

    if (error) {
      console.log(`   ❌ 錯誤: ${error.message}`);
      return;
    }

    console.log(`   ✅ 找到 ${data?.length || 0} 個結果`);

    // 顯示前3個結果
    if (data && data.length > 0) {
      console.log(`   📋 匹配結果:`);
      data.slice(0, 3).forEach((item, index) => {
        console.log(`      ${index + 1}. [${item.code}] ${item.title} ($${item.fee})`);
        if (item.description.length > 100) {
          console.log(`         ${item.description.substring(0, 100)}...`);
        } else {
          console.log(`         ${item.description}`);
        }
      });

      if (data.length > 3) {
        console.log(`         ...還有 ${data.length - 3} 個其他結果`);
      }
    }

  } catch (error) {
    console.log(`   ❌ 測試失敗: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('🩺 MBSPro 測試文字示例');
  console.log('=' .repeat(50));
  console.log(`總共 ${testCases.length} 個測試案例\n`);

  for (const testCase of testCases) {
    await runTest(testCase);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('✨ 測試完成！');
  console.log('\n💡 提示:');
  console.log('   - 你可以修改 supabase-seed.ts 添加更多測試數據');
  console.log('   - 使用不同的關鍵字組合來測試搜索功能');
  console.log('   - 測試不同語言或拼寫變體的匹配');
}

// 運行所有測試
runAllTests().catch(console.error);
