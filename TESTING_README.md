# MBS Coding System Testing Framework

这是一个comprehensive的测试框架，专为你的MBS医疗编码建议系统设计。无需金标准数据，使用synthetic datasets和规则一致性来评估系统性能。

## 📁 文件结构

```
mbspro/
├── test-synthetic-eval.js      # 合成数据集生成和评估
├── guardrail-tests.js          # 单元测试（规则测试）
├── evaluation-framework.js     # 精确度/召回率/性能评估
├── run-complete-evaluation.js  # 完整评估运行器
└── TESTING_README.md           # 使用说明（本文件）
```

## 🚀 快速开始

### 1. 运行完整评估（推荐）

```bash
node run-complete-evaluation.js
```

这个命令会运行所有测试：
- ✅ 单元测试（Guardrail Tests）
- 🧪 合成数据集评估
- 📊 精确度/召回率评估
- ⚡ 性能指标测试

### 2. 单独运行组件

#### 运行单元测试
```bash
node guardrail-tests.js
```

#### 生成合成测试数据
```javascript
const { SyntheticTestGenerator } = require('./test-synthetic-eval');
const generator = new SyntheticTestGenerator();
const testSuite = generator.exportTestSuite();
```

#### 运行性能评估
```javascript
const { EvaluationFramework } = require('./evaluation-framework');
const framework = new EvaluationFramework();
const results = await framework.runEvaluation(testCases, predictions);
```

## 📊 生成的报告

运行完整评估后，会生成以下报告：

1. **`complete-evaluation-report.json`** - 详细技术报告
2. **`advisor-summary.json`** - 给advisor的执行摘要
3. **`synthetic-test-suite.json`** - 生成的测试用例

## 🎯 评估指标

### 核心指标
- **Precision/Recall**: Top-3代码推荐的准确性
- **Rule Accuracy**: 规则引擎的正确率
- **Confidence Calibration**: 置信度分数的校准度
- **Performance**: 响应时间和吞吐量

### 评分系统
- **A (90-100%)**: 优秀，可以部署
- **B (80-89%)**: 良好，小幅优化后可部署
- **C (70-79%)**: 一般，需要改进
- **D (60-69%)**: 较差，需要大幅改进
- **F (<60%)**: 不可接受，需要重大修改

## 🔧 自定义测试

### 1. 添加自定义测试用例

修改 `test-synthetic-eval.js` 中的测试生成器：

```javascript
// 在generateRuleBasedCases()中添加
custom_rules: [
  {
    id: "custom_001",
    note: "你的自定义测试场景",
    expected_codes: ["期望的编码"],
    confidence_range: [0.8, 0.9],
    test_focus: "your_test_focus"
  }
]
```

### 2. 添加新规则测试

修改 `guardrail-tests.js` 中的测试套件：

```javascript
this.test("Your Custom Rule Test", () => {
  // 你的规则测试逻辑
  const result = this.evalYourRule(rule, episode);
  this.assert(result.pass, "Your assertion message");
});
```

### 3. 自定义评估参数

在运行评估时传递选项：

```javascript
const options = {
  topN: 5,           // 评估Top-N精确度
  confidenceThresh: 0.7,  // 置信度阈值
  performanceTarget: 2000 // 目标延迟(ms)
};

const results = await evaluator.runCompleteEvaluation(options);
```

## 🔍 理解测试结果

### 1. Guardrail Tests (单元测试)
测试规则引擎的核心逻辑：
- ✅ 所有通过 = 规则逻辑正确
- ❌ 有失败 = 需要修复规则实现

### 2. Synthetic Evaluation
使用人工生成的test cases评估：
- **Rule Accuracy**: 规则是否按预期工作
- **Confidence Calibration**: 置信度是否反映真实准确性

### 3. Metrics Evaluation  
系统整体性能指标：
- **Precision**: 推荐的相关性
- **Recall**: 是否遗漏重要编码
- **F1 Score**: 精确度和召回率的平衡

## 🛠️ 集成到实际系统

### 1. 替换Mock预测

在 `run-complete-evaluation.js` 中，将 `generateMockPredictions()` 替换为实际系统调用：

```javascript
async generateRealPredictions(testSuite) {
  const predictions = [];
  for (const testCase of allTestCases) {
    // 调用你的实际MBS系统
    const response = await yourMbsSystem.suggest({
      note: testCase.note,
      topN: 5
    });
    predictions.push(response);
  }
  return predictions;
}
```

### 2. 添加实际规则验证

修改规则评估逻辑以使用你的实际规则引擎：

```javascript
// 在evaluation-framework.js中
checkExpectedRules(expectedRules, systemResponse) {
  // 使用你的实际RuleEngineService
  const ruleEngine = new RuleEngineService();
  // 验证逻辑...
}
```

## 📈 性能基准

### 可接受的性能指标：
- **Precision**: > 70%
- **Recall**: > 60%
- **Rule Accuracy**: > 80%
- **Median Latency**: < 2000ms
- **Confidence Calibration Error**: < 10%

### 优秀的性能指标：
- **Precision**: > 85%
- **Recall**: > 75%
- **Rule Accuracy**: > 90%
- **Median Latency**: < 1500ms
- **Confidence Calibration Error**: < 5%

## 🐛 故障排除

### 常见问题：

1. **所有测试失败**
   - 检查系统是否正常运行
   - 验证mock数据格式是否正确

2. **规则准确性低**
   - 检查规则实现是否与预期一致
   - 验证测试用例是否反映真实场景

3. **性能测试超时**
   - 增加超时限制
   - 检查系统资源是否充足

4. **置信度校准差**
   - 调整置信度计算参数
   - 检查sigmoid函数的k和center值

## 📞 支持

如果遇到问题：
1. 查看生成的详细报告
2. 检查console输出的错误信息
3. 验证测试数据格式
4. 确认系统接口一致性

## 🎉 成功标准

### 部署就绪标准：
- ✅ 所有Guardrail测试通过
- ✅ 总体评分 >= B (80%)
- ✅ 关键指标达到基准
- ✅ 无严重性能问题

### Advisor汇报要点：
1. **测试覆盖度**: 全面覆盖规则、精确度、性能
2. **无需金标**: 使用合成数据和规则一致性
3. **可解释结果**: 每个指标都有明确含义
4. **数值好看**: 评分系统清晰，便于决策

---

🎯 **记住**: 这个框架专为无金标准环境设计，通过合成数据和规则一致性来评估系统质量。结果具有强可解释性，适合向advisor展示。