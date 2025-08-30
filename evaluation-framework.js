/**
 * Comprehensive Evaluation Framework for MBS Coding System
 * 评估precision/recall、accuracy和performance metrics
 */

const fs = require('fs');
const path = require('path');

// 1. Core Metrics Calculator
class MetricsCalculator {
  constructor() {
    this.results = new Map();
  }

  // Top-N Precision/Recall计算
  calculateTopNMetrics(predictions, groundTruth, N = 3) {
    const metrics = {
      precision: [],
      recall: [],
      f1: [],
      average_precision: 0,
      ndcg: 0
    };

    predictions.forEach((pred, index) => {
      const truth = groundTruth[index];
      if (!truth || !pred.candidates) {
        metrics.precision.push(0);
        metrics.recall.push(0); 
        metrics.f1.push(0);
        return;
      }

      const topN = pred.candidates.slice(0, N);
      const predictedCodes = new Set(topN.map(c => String(c.code)));
      const trueCodes = new Set((truth.relevant_codes || []).map(String));
      
      // Precision: 预测正确的比例
      const intersection = new Set([...predictedCodes].filter(x => trueCodes.has(x)));
      const precision = predictedCodes.size > 0 ? intersection.size / predictedCodes.size : 0;
      
      // Recall: 召回正确的比例 
      const recall = trueCodes.size > 0 ? intersection.size / trueCodes.size : 0;
      
      // F1 Score
      const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
      
      metrics.precision.push(precision);
      metrics.recall.push(recall);
      metrics.f1.push(f1);
    });

    return {
      precision: {
        mean: this.mean(metrics.precision),
        std: this.std(metrics.precision),
        values: metrics.precision
      },
      recall: {
        mean: this.mean(metrics.recall),
        std: this.std(metrics.recall), 
        values: metrics.recall
      },
      f1: {
        mean: this.mean(metrics.f1),
        std: this.std(metrics.f1),
        values: metrics.f1
      }
    };
  }

  // 规则准确性评估
  evaluateRuleAccuracy(predictions, groundTruth) {
    const ruleMetrics = {
      correct_rules_fired: 0,
      incorrect_rules_fired: 0,
      missed_rules: 0,
      total_cases: 0,
      by_rule_type: {}
    };

    predictions.forEach((pred, index) => {
      const truth = groundTruth[index];
      if (!truth) return;
      
      ruleMetrics.total_cases++;
      
      const predRules = new Set((pred.rule_results || []).filter(r => r.pass).map(r => r.rule_id));
      const trueRules = new Set(truth.expected_rules || []);
      const shouldFailRules = new Set(truth.expected_rule_failures || []);
      
      // 应该通过的规则
      trueRules.forEach(rule => {
        if (predRules.has(rule)) {
          ruleMetrics.correct_rules_fired++;
        } else {
          ruleMetrics.missed_rules++;
        }
      });
      
      // 应该失败但通过的规则
      shouldFailRules.forEach(rule => {
        if (predRules.has(rule)) {
          ruleMetrics.incorrect_rules_fired++;
        }
      });
      
      // 按规则类型统计
      (truth.rule_types || []).forEach(ruleType => {
        if (!ruleMetrics.by_rule_type[ruleType]) {
          ruleMetrics.by_rule_type[ruleType] = { correct: 0, total: 0 };
        }
        ruleMetrics.by_rule_type[ruleType].total++;
        
        // 简化检查：如果这种类型的规则符合预期就算正确
        const hasCorrectBehavior = this.checkRuleTypeBehavior(pred, truth, ruleType);
        if (hasCorrectBehavior) {
          ruleMetrics.by_rule_type[ruleType].correct++;
        }
      });
    });

    // 计算总体准确性
    const totalRuleChecks = ruleMetrics.correct_rules_fired + ruleMetrics.incorrect_rules_fired + ruleMetrics.missed_rules;
    const accuracy = totalRuleChecks > 0 ? ruleMetrics.correct_rules_fired / totalRuleChecks : 0;
    
    return {
      overall_accuracy: accuracy,
      details: ruleMetrics,
      by_rule_type: Object.keys(ruleMetrics.by_rule_type).map(ruleType => ({
        rule_type: ruleType,
        accuracy: ruleMetrics.by_rule_type[ruleType].correct / ruleMetrics.by_rule_type[ruleType].total,
        sample_size: ruleMetrics.by_rule_type[ruleType].total
      }))
    };
  }

  checkRuleTypeBehavior(prediction, truth, ruleType) {
    // 简化的规则类型行为检查
    const ruleResults = prediction.rule_results || [];
    
    switch (ruleType) {
      case 'duration':
        const durationRules = ruleResults.filter(r => r.rule_id.includes('duration'));
        return truth.expected_duration_pass ? 
          durationRules.some(r => r.pass) : 
          durationRules.every(r => !r.pass);
          
      case 'eligibility':
        const eligRules = ruleResults.filter(r => r.rule_id.includes('eligibility'));
        return truth.expected_eligibility_pass ?
          eligRules.some(r => r.pass) :
          eligRules.every(r => !r.pass);
          
      case 'location':
        const locRules = ruleResults.filter(r => r.rule_id.includes('location'));
        return truth.expected_location_pass ?
          locRules.some(r => r.pass) :
          locRules.every(r => !r.pass);
          
      default:
        return true; // 未知规则类型默认通过
    }
  }

  // 信心校准评估
  evaluateConfidenceCalibration(predictions, groundTruth) {
    const bins = [
      { min: 0.0, max: 0.3, name: 'low', predictions: [], accuracies: [] },
      { min: 0.3, max: 0.7, name: 'medium', predictions: [], accuracies: [] }, 
      { min: 0.7, max: 1.0, name: 'high', predictions: [], accuracies: [] }
    ];

    predictions.forEach((pred, index) => {
      const truth = groundTruth[index];
      if (!truth || pred.confidence === undefined) return;
      
      const confidence = pred.confidence;
      const isAccurate = this.isAccuratePrediction(pred, truth);
      
      bins.forEach(bin => {
        if (confidence >= bin.min && confidence < bin.max) {
          bin.predictions.push(confidence);
          bin.accuracies.push(isAccurate ? 1 : 0);
        }
      });
    });

    const calibration = bins.map(bin => ({
      confidence_range: `${bin.min}-${bin.max}`,
      name: bin.name,
      mean_confidence: bin.predictions.length > 0 ? this.mean(bin.predictions) : 0,
      accuracy: bin.accuracies.length > 0 ? this.mean(bin.accuracies) : 0,
      sample_size: bin.predictions.length,
      calibration_error: bin.predictions.length > 0 ? 
        Math.abs(this.mean(bin.predictions) - this.mean(bin.accuracies)) : 0
    }));

    const overallCalibrationError = this.mean(calibration.map(c => c.calibration_error));
    
    return {
      by_confidence_range: calibration,
      overall_calibration_error: overallCalibrationError,
      is_well_calibrated: overallCalibrationError < 0.1
    };
  }

  isAccuratePrediction(prediction, truth) {
    if (!prediction.candidates || prediction.candidates.length === 0) return false;
    
    const topCode = prediction.candidates[0].code;
    const relevantCodes = new Set((truth.relevant_codes || []).map(String));
    
    return relevantCodes.has(String(topCode));
  }

  // Performance metrics计算
  calculatePerformanceMetrics(predictions, timings) {
    const latencies = timings.map(t => t.duration_ms);
    
    return {
      latency: {
        mean: this.mean(latencies),
        median: this.median(latencies),
        p95: this.percentile(latencies, 95),
        p99: this.percentile(latencies, 99),
        max: Math.max(...latencies),
        min: Math.min(...latencies)
      },
      throughput: {
        requests_per_second: latencies.length > 0 ? 1000 / this.mean(latencies) : 0,
        total_requests: latencies.length,
        total_time_ms: latencies.reduce((a, b) => a + b, 0)
      }
    };
  }

  // 综合评估分数
  calculateOverallScore(precisionRecall, ruleAccuracy, calibration, performance) {
    const weights = {
      precision: 0.25,
      recall: 0.25, 
      rule_accuracy: 0.30,
      calibration: 0.15,
      performance: 0.05
    };

    const scores = {
      precision: precisionRecall.precision.mean,
      recall: precisionRecall.recall.mean,
      rule_accuracy: ruleAccuracy.overall_accuracy,
      calibration: calibration.is_well_calibrated ? (1 - calibration.overall_calibration_error) : 0.5,
      performance: performance.latency.median < 2000 ? 1.0 : Math.max(0, 1 - (performance.latency.median - 2000) / 5000)
    };

    const overallScore = Object.keys(weights).reduce((sum, key) => {
      return sum + (weights[key] * (scores[key] || 0));
    }, 0);

    return {
      overall_score: overallScore,
      component_scores: scores,
      weights,
      grade: this.assignGrade(overallScore)
    };
  }

  assignGrade(score) {
    if (score >= 0.9) return 'A';
    if (score >= 0.8) return 'B'; 
    if (score >= 0.7) return 'C';
    if (score >= 0.6) return 'D';
    return 'F';
  }

  // 统计辅助函数
  mean(arr) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  median(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  std(arr) {
    if (arr.length === 0) return 0;
    const avg = this.mean(arr);
    const variance = this.mean(arr.map(x => Math.pow(x - avg, 2)));
    return Math.sqrt(variance);
  }

  percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.floor((p / 100) * sorted.length);
    return sorted[Math.min(index, sorted.length - 1)];
  }
}

// 2. Test Suite Runner with Evaluation
class EvaluationFramework {
  constructor() {
    this.calculator = new MetricsCalculator();
    this.results = {};
  }

  async runEvaluation(testCases, systemPredictions, options = {}) {
    console.log("📊 Starting Comprehensive Evaluation...\n");
    
    const startTime = Date.now();
    
    // 1. Precision & Recall evaluation
    console.log("📈 Evaluating Precision & Recall...");
    const precisionRecall = this.calculator.calculateTopNMetrics(
      systemPredictions, 
      testCases, 
      options.topN || 3
    );
    
    // 2. Rule accuracy evaluation  
    console.log("⚖️  Evaluating Rule Accuracy...");
    const ruleAccuracy = this.calculator.evaluateRuleAccuracy(
      systemPredictions,
      testCases
    );
    
    // 3. Confidence calibration
    console.log("🎯 Evaluating Confidence Calibration...");
    const calibration = this.calculator.evaluateConfidenceCalibration(
      systemPredictions,
      testCases
    );
    
    // 4. Performance metrics
    console.log("⚡ Evaluating Performance...");
    const timings = systemPredictions.map(p => ({ duration_ms: p.meta?.duration_ms || 0 }));
    const performance = this.calculator.calculatePerformanceMetrics(
      systemPredictions,
      timings
    );
    
    // 5. Overall score
    console.log("🏆 Calculating Overall Score...");
    const overallScore = this.calculator.calculateOverallScore(
      precisionRecall,
      ruleAccuracy, 
      calibration,
      performance
    );
    
    const evaluationTime = Date.now() - startTime;
    
    this.results = {
      metadata: {
        evaluation_time_ms: evaluationTime,
        test_cases_count: testCases.length,
        timestamp: new Date().toISOString(),
        options
      },
      precision_recall: precisionRecall,
      rule_accuracy: ruleAccuracy,
      confidence_calibration: calibration,
      performance: performance,
      overall_assessment: overallScore
    };
    
    // Print summary
    this.printSummary();
    
    return this.results;
  }

  printSummary() {
    const results = this.results;
    
    console.log("\n" + "=".repeat(50));
    console.log("📊 EVALUATION SUMMARY");
    console.log("=".repeat(50));
    
    console.log(`🎯 Overall Score: ${(results.overall_assessment.overall_score * 100).toFixed(1)}% (${results.overall_assessment.grade})`);
    
    console.log("\n📈 Precision & Recall:");
    console.log(`   • Precision: ${(results.precision_recall.precision.mean * 100).toFixed(1)}%`);
    console.log(`   • Recall: ${(results.precision_recall.recall.mean * 100).toFixed(1)}%`);
    console.log(`   • F1 Score: ${(results.precision_recall.f1.mean * 100).toFixed(1)}%`);
    
    console.log("\n⚖️  Rule Accuracy:");
    console.log(`   • Overall: ${(results.rule_accuracy.overall_accuracy * 100).toFixed(1)}%`);
    results.rule_accuracy.by_rule_type.forEach(rt => {
      console.log(`   • ${rt.rule_type}: ${(rt.accuracy * 100).toFixed(1)}% (n=${rt.sample_size})`);
    });
    
    console.log("\n🎯 Confidence Calibration:");
    console.log(`   • Calibration Error: ${(results.confidence_calibration.overall_calibration_error * 100).toFixed(1)}%`);
    console.log(`   • Well Calibrated: ${results.confidence_calibration.is_well_calibrated ? 'Yes' : 'No'}`);
    
    console.log("\n⚡ Performance:");
    console.log(`   • Median Latency: ${results.performance.latency.median}ms`);
    console.log(`   • P95 Latency: ${results.performance.latency.p95}ms`);
    console.log(`   • Throughput: ${results.performance.throughput.requests_per_second.toFixed(1)} req/s`);
    
    console.log("\n🏆 Component Scores:");
    Object.entries(results.overall_assessment.component_scores).forEach(([key, score]) => {
      console.log(`   • ${key}: ${(score * 100).toFixed(1)}%`);
    });
  }

  generateDetailedReport(outputPath = './evaluation-report.json') {
    const report = {
      ...this.results,
      recommendations: this.generateRecommendations(),
      action_items: this.generateActionItems()
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${outputPath}`);
    
    return report;
  }

  generateRecommendations() {
    const results = this.results;
    const recommendations = [];
    
    // Precision/Recall recommendations
    if (results.precision_recall.precision.mean < 0.7) {
      recommendations.push({
        area: "precision",
        issue: "Low precision indicates many irrelevant codes in top results",
        suggestion: "Review ranking algorithm and feature weights"
      });
    }
    
    if (results.precision_recall.recall.mean < 0.6) {
      recommendations.push({
        area: "recall", 
        issue: "Low recall indicates missing relevant codes",
        suggestion: "Expand retrieval methods or increase candidate pool"
      });
    }
    
    // Rule accuracy recommendations
    if (results.rule_accuracy.overall_accuracy < 0.8) {
      recommendations.push({
        area: "rule_accuracy",
        issue: "Rule engine not performing as expected", 
        suggestion: "Review rule implementation and test coverage"
      });
    }
    
    // Calibration recommendations
    if (!results.confidence_calibration.is_well_calibrated) {
      recommendations.push({
        area: "confidence_calibration",
        issue: "Confidence scores don't match actual accuracy",
        suggestion: "Adjust confidence calculation parameters or retrain"
      });
    }
    
    // Performance recommendations  
    if (results.performance.latency.median > 3000) {
      recommendations.push({
        area: "performance",
        issue: "High latency may impact user experience",
        suggestion: "Optimize retrieval, caching, or consider async processing"
      });
    }
    
    return recommendations;
  }

  generateActionItems() {
    const results = this.results;
    const actionItems = [];
    
    // Based on component scores
    const scores = results.overall_assessment.component_scores;
    
    if (scores.precision < 0.8) {
      actionItems.push("Tune ranking parameters to improve precision");
    }
    
    if (scores.rule_accuracy < 0.9) {
      actionItems.push("Review and fix rule engine implementation");  
    }
    
    if (scores.calibration < 0.8) {
      actionItems.push("Recalibrate confidence calculation");
    }
    
    if (scores.performance < 0.9) {
      actionItems.push("Optimize system performance");
    }
    
    // Overall score based actions
    if (results.overall_assessment.overall_score < 0.7) {
      actionItems.push("System needs significant improvements before deployment");
    } else if (results.overall_assessment.overall_score < 0.85) {
      actionItems.push("Consider additional testing and optimization");
    }
    
    return actionItems;
  }
}

// 3. Quick Evaluation Helper
function quickEvaluation(systemPredictions, expectedResults) {
  const framework = new EvaluationFramework();
  
  // Convert to expected format if needed
  const testCases = expectedResults.map((expected, index) => ({
    id: `test_${index}`,
    relevant_codes: expected.codes || [],
    expected_rules: expected.rules || [],
    expected_confidence_range: expected.confidence || [0, 1]
  }));
  
  return framework.runEvaluation(testCases, systemPredictions);
}

// 4. Usage Examples and Documentation
const USAGE_EXAMPLES = {
  basic: `
// Basic usage
const framework = new EvaluationFramework();
const results = await framework.runEvaluation(testCases, predictions);
framework.generateDetailedReport();
`,
  
  quick: `
// Quick evaluation  
const results = quickEvaluation(predictions, expectedResults);
`,
  
  testCase: `
// Test case format
const testCase = {
  id: "test_001",
  note: "45 minute mental health consultation", 
  relevant_codes: ["2715", "2717"],
  expected_rules: ["min_duration_45", "eligibility_mh"],
  expected_rule_failures: [],
  rule_types: ["duration", "eligibility"],
  expected_confidence_range: [0.8, 0.95]
};
`
};

// Export everything
module.exports = {
  MetricsCalculator,
  EvaluationFramework,
  quickEvaluation,
  USAGE_EXAMPLES
};

// CLI usage
if (require.main === module) {
  console.log("🧮 MBS Coding System Evaluation Framework");
  console.log("==========================================\n");
  
  console.log("📚 Usage Examples:");
  console.log(USAGE_EXAMPLES.basic);
  
  console.log("📝 To run evaluation:");
  console.log("1. Prepare test cases with expected outcomes");
  console.log("2. Run your system to get predictions");  
  console.log("3. Use EvaluationFramework.runEvaluation()");
  console.log("4. Review detailed report and recommendations");
  
  console.log("\n✅ Framework ready for evaluation!");
}