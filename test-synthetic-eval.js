/**
 * Synthetic Dataset Evaluation Framework
 * 用于测试MBS编码系统的准确性和性能
 */

const fs = require('fs');
const path = require('path');

// 1. Synthetic Test Cases Generation
class SyntheticTestGenerator {
  constructor() {
    this.ruleBasedCases = this.generateRuleBasedCases();
    this.confidenceCases = this.generateConfidenceCases();
    this.performanceCases = this.generatePerformanceCases();
  }

  generateRuleBasedCases() {
    return {
      // Duration-based rules testing
      duration_rules: [
        {
          id: "dur_001",
          note: "15 minute standard consultation discussing diabetes management",
          expected_rules: ["min_duration_level_A"],
          expected_codes: ["23", "36"], // GP consultation codes
          confidence_range: [0.7, 0.9],
          test_focus: "duration_threshold"
        },
        {
          id: "dur_002", 
          note: "45 minute comprehensive mental health assessment",
          expected_rules: ["min_duration_level_C"],
          expected_codes: ["2715", "2717"],
          confidence_range: [0.8, 0.95],
          test_focus: "extended_consultation"
        },
        {
          id: "dur_003",
          note: "Quick 5 minute blood pressure check",
          expected_rules_fail: ["min_duration_level_A"],
          expected_low_confidence: true,
          confidence_range: [0.1, 0.3],
          test_focus: "insufficient_duration"
        }
      ],

      // Eligibility rules testing  
      eligibility_rules: [
        {
          id: "elig_001",
          note: "Telehealth video consultation for chronic disease management, 25 minutes",
          expected_rules: ["eligibility_telehealth", "min_duration_level_B"],
          expected_codes: ["92023", "92024"], // telehealth codes
          confidence_range: [0.75, 0.9],
          test_focus: "telehealth_eligibility"
        },
        {
          id: "elig_002",
          note: "After hours emergency consultation at 11pm, patient with chest pain",
          expected_rules: ["eligibility_after_hours"],
          expected_codes: ["597", "599"], // after hours codes
          confidence_range: [0.8, 0.95],
          test_focus: "after_hours_eligibility"
        },
        {
          id: "elig_003",
          note: "Mental health treatment plan with psychologist referral present",
          expected_rules: ["eligibility_referral_required"],
          expected_codes: ["2715"],
          confidence_range: [0.8, 0.92],
          test_focus: "referral_requirement"
        }
      ],

      // Location rules testing
      location_rules: [
        {
          id: "loc_001",
          note: "Hospital inpatient consultation for post-operative care",
          expected_rules: ["location_must_be_hospital"],
          expected_codes: ["116", "119"], // hospital consultation codes
          confidence_range: [0.8, 0.95],
          test_focus: "hospital_location_requirement"
        },
        {
          id: "loc_002",
          note: "GP clinic face-to-face consultation for diabetes review",
          expected_rules: ["location_clinic_eligible"],
          expected_codes: ["23", "36"],
          confidence_range: [0.75, 0.9],
          test_focus: "clinic_location"
        }
      ],

      // Mutual exclusion rules testing
      exclusion_rules: [
        {
          id: "excl_001",
          note: "Same day consultation and procedure",
          selected_codes: ["23", "30192"],
          expected_conflicts: ["same_day_exclusive"],
          expected_warnings: ["Cannot claim both consultation and procedure same day"],
          test_focus: "mutual_exclusion_detection"
        }
      ]
    };
  }

  generateConfidenceCases() {
    return {
      high_confidence: [
        {
          id: "conf_high_001",
          note: "45 minute face-to-face mental health treatment plan consultation with psychologist referral present, patient has anxiety and depression",
          expected_confidence: [0.85, 0.95],
          expected_top_3: ["2715", "2717", "2701"],
          reasoning: "Complete clinical picture with all required elements"
        },
        {
          id: "conf_high_002", 
          note: "25 minute telehealth video consultation for chronic disease management, diabetes and hypertension review",
          expected_confidence: [0.8, 0.9],
          expected_top_3: ["92023", "92024", "92025"],
          reasoning: "Clear telehealth consultation with sufficient duration"
        }
      ],
      medium_confidence: [
        {
          id: "conf_med_001",
          note: "Patient consultation about back pain, discussed treatment options",
          expected_confidence: [0.4, 0.7],
          missing_elements: ["duration", "location", "specific_procedures"],
          reasoning: "Some clinical detail but missing key eligibility elements"
        },
        {
          id: "conf_med_002",
          note: "Mental health assessment, patient has depression",
          expected_confidence: [0.45, 0.65], 
          missing_elements: ["duration", "referral_status", "location"],
          reasoning: "Clinical condition clear but missing administrative elements"
        }
      ],
      low_confidence: [
        {
          id: "conf_low_001",
          note: "Patient visit today",
          expected_confidence: [0.1, 0.35],
          missing_elements: ["clinical_detail", "duration", "location", "procedures"],
          reasoning: "Insufficient clinical and administrative information"
        },
        {
          id: "conf_low_002",
          note: "Follow up appointment",
          expected_confidence: [0.15, 0.4],
          missing_elements: ["reason", "duration", "procedures", "outcomes"],
          reasoning: "Administrative note without clinical substance"
        }
      ]
    };
  }

  generatePerformanceCases() {
    return {
      latency_tests: [
        {
          id: "perf_001",
          note: "Standard consultation note of moderate complexity",
          max_latency_ms: 2000,
          test_focus: "typical_case_performance"
        },
        {
          id: "perf_002", 
          note: "Very detailed clinical note with extensive history, multiple procedures, complex eligibility requirements and comprehensive assessment spanning multiple specialties",
          max_latency_ms: 5000,
          test_focus: "complex_case_performance"
        }
      ],
      batch_tests: [
        {
          id: "batch_001",
          cases_count: 20,
          max_total_latency_ms: 30000,
          test_focus: "batch_processing_efficiency"
        }
      ]
    };
  }

  // Generate all test cases as JSON
  exportTestSuite(outputPath = './synthetic-test-suite.json') {
    const testSuite = {
      metadata: {
        generated_at: new Date().toISOString(),
        version: "1.0.0",
        total_cases: this.getTotalCaseCount(),
        categories: ["rule_testing", "confidence_calibration", "performance_testing"]
      },
      rule_based_tests: this.ruleBasedCases,
      confidence_tests: this.confidenceCases,
      performance_tests: this.performanceCases
    };

    fs.writeFileSync(outputPath, JSON.stringify(testSuite, null, 2));
    console.log(`✅ Generated synthetic test suite: ${outputPath}`);
    return testSuite;
  }

  getTotalCaseCount() {
    let count = 0;
    
    // Count rule-based cases
    Object.values(this.ruleBasedCases).forEach(category => {
      count += Array.isArray(category) ? category.length : 0;
    });
    
    // Count confidence cases  
    Object.values(this.confidenceCases).forEach(category => {
      count += Array.isArray(category) ? category.length : 0;
    });
    
    // Count performance cases
    Object.values(this.performanceCases).forEach(category => {
      count += Array.isArray(category) ? category.length : 0;
    });
    
    return count;
  }
}

// 2. Evaluation Framework
class SyntheticEvaluator {
  constructor() {
    this.results = {
      rule_accuracy: {},
      confidence_calibration: {},
      performance_metrics: {},
      overall_scores: {}
    };
  }

  // 评估规则准确性
  async evaluateRuleAccuracy(testCases, systemResponse) {
    const results = {
      total_cases: testCases.length,
      passed: 0,
      failed: 0,
      accuracy_by_rule: {},
      details: []
    };

    for (const testCase of testCases) {
      const evaluation = this.evaluateSingleRuleCase(testCase, systemResponse[testCase.id]);
      results.details.push(evaluation);
      
      if (evaluation.passed) results.passed++;
      else results.failed++;

      // Track accuracy by rule type
      const ruleType = testCase.test_focus;
      if (!results.accuracy_by_rule[ruleType]) {
        results.accuracy_by_rule[ruleType] = { passed: 0, total: 0 };
      }
      results.accuracy_by_rule[ruleType].total++;
      if (evaluation.passed) results.accuracy_by_rule[ruleType].passed++;
    }

    // Calculate accuracy percentages
    Object.keys(results.accuracy_by_rule).forEach(ruleType => {
      const stats = results.accuracy_by_rule[ruleType];
      stats.accuracy = stats.passed / stats.total;
    });

    results.overall_accuracy = results.passed / results.total_cases;
    return results;
  }

  evaluateSingleRuleCase(testCase, systemResponse) {
    const evaluation = {
      test_id: testCase.id,
      test_focus: testCase.test_focus,
      passed: true,
      issues: [],
      score: 0
    };

    // Check expected rules fire correctly
    if (testCase.expected_rules) {
      const rulesPassed = this.checkExpectedRules(testCase.expected_rules, systemResponse);
      if (!rulesPassed) {
        evaluation.passed = false;
        evaluation.issues.push("Expected rules did not fire correctly");
      }
    }

    // Check expected rule failures
    if (testCase.expected_rules_fail) {
      const rulesFailed = this.checkExpectedRuleFailures(testCase.expected_rules_fail, systemResponse);
      if (!rulesFailed) {
        evaluation.passed = false; 
        evaluation.issues.push("Rules should have failed but passed");
      }
    }

    // Check confidence range
    if (testCase.confidence_range && systemResponse.confidence) {
      const [min, max] = testCase.confidence_range;
      if (systemResponse.confidence < min || systemResponse.confidence > max) {
        evaluation.passed = false;
        evaluation.issues.push(`Confidence ${systemResponse.confidence} outside expected range [${min}, ${max}]`);
      }
    }

    // Check top-N code precision
    if (testCase.expected_codes && systemResponse.candidates) {
      const precision = this.calculateTopNPrecision(testCase.expected_codes, systemResponse.candidates, 3);
      evaluation.top3_precision = precision;
      if (precision < 0.3) { // 至少30%精确度
        evaluation.passed = false;
        evaluation.issues.push(`Top-3 precision too low: ${precision}`);
      }
    }

    return evaluation;
  }

  // 3. 计算关键指标
  calculateTopNPrecision(expectedCodes, actualCandidates, N = 3) {
    if (!actualCandidates || actualCandidates.length === 0) return 0;
    
    const topN = actualCandidates.slice(0, N);
    const relevant = topN.filter(candidate => 
      expectedCodes.includes(candidate.code)
    );
    
    return relevant.length / Math.min(N, topN.length);
  }

  calculateConfidenceCalibration(testCases, systemResponses) {
    const bins = { high: [], medium: [], low: [] };
    
    testCases.forEach((testCase, index) => {
      const response = systemResponses[index];
      const confidence = response?.confidence || 0;
      
      if (confidence >= 0.7) bins.high.push({ testCase, response, confidence });
      else if (confidence >= 0.4) bins.medium.push({ testCase, response, confidence });
      else bins.low.push({ testCase, response, confidence });
    });

    return {
      high_confidence_accuracy: this.calculateBinAccuracy(bins.high),
      medium_confidence_accuracy: this.calculateBinAccuracy(bins.medium), 
      low_confidence_accuracy: this.calculateBinAccuracy(bins.low),
      calibration_score: this.calculateCalibrationScore(bins)
    };
  }

  calculateBinAccuracy(bin) {
    if (bin.length === 0) return null;
    
    let correct = 0;
    bin.forEach(item => {
      // 简化的正确性检查：高信心应该有高准确性
      if (item.confidence >= 0.7 && item.response.candidates?.length > 0) correct++;
      else if (item.confidence < 0.7 && item.confidence >= 0.4) correct += 0.5;
    });
    
    return correct / bin.length;
  }

  calculateCalibrationScore(bins) {
    // 简化的校准分数：高信心bin应该比低信心bin有更高准确性
    const highAcc = bins.high.length > 0 ? this.calculateBinAccuracy(bins.high) : 0;
    const lowAcc = bins.low.length > 0 ? this.calculateBinAccuracy(bins.low) : 0;
    return Math.max(0, highAcc - lowAcc); // 校准良好时应该 > 0
  }

  // 性能指标评估
  evaluatePerformance(performanceTests, actualMetrics) {
    const results = {
      latency_tests: [],
      throughput_tests: [],
      overall_performance_score: 0
    };

    performanceTests.latency_tests?.forEach((test, index) => {
      const actualLatency = actualMetrics.latencies?.[index] || 0;
      const passed = actualLatency <= test.max_latency_ms;
      
      results.latency_tests.push({
        test_id: test.id,
        expected_max_ms: test.max_latency_ms,
        actual_ms: actualLatency,
        passed,
        performance_ratio: actualLatency / test.max_latency_ms
      });
    });

    // 计算总体性能分数
    const latencyScore = results.latency_tests.length > 0 
      ? results.latency_tests.filter(t => t.passed).length / results.latency_tests.length
      : 1;
    
    results.overall_performance_score = latencyScore;
    return results;
  }

  // Helper methods
  checkExpectedRules(expectedRules, systemResponse) {
    if (!systemResponse?.rule_results) return false;
    
    const firedRules = systemResponse.rule_results
      .filter(r => r.pass)
      .map(r => r.rule_id);
      
    return expectedRules.every(rule => firedRules.includes(rule));
  }

  checkExpectedRuleFailures(expectedFailures, systemResponse) {
    if (!systemResponse?.rule_results) return false;
    
    const failedRules = systemResponse.rule_results
      .filter(r => !r.pass)
      .map(r => r.rule_id);
      
    return expectedFailures.every(rule => failedRules.includes(rule));
  }

  // 生成最终报告
  generateEvaluationReport(allResults) {
    const timestamp = new Date().toISOString();
    
    const report = {
      evaluation_summary: {
        timestamp,
        overall_score: this.calculateOverallScore(allResults),
        rule_accuracy: allResults.rule_accuracy?.overall_accuracy || 0,
        confidence_calibration: allResults.confidence_calibration?.calibration_score || 0,
        performance_score: allResults.performance_metrics?.overall_performance_score || 0
      },
      detailed_results: allResults,
      recommendations: this.generateRecommendations(allResults)
    };

    return report;
  }

  calculateOverallScore(allResults) {
    const weights = { rules: 0.4, confidence: 0.4, performance: 0.2 };
    
    const ruleScore = allResults.rule_accuracy?.overall_accuracy || 0;
    const confScore = allResults.confidence_calibration?.calibration_score || 0; 
    const perfScore = allResults.performance_metrics?.overall_performance_score || 0;
    
    return weights.rules * ruleScore + weights.confidence * confScore + weights.performance * perfScore;
  }

  generateRecommendations(allResults) {
    const recommendations = [];
    
    if ((allResults.rule_accuracy?.overall_accuracy || 0) < 0.8) {
      recommendations.push("Rule accuracy below 80% - review rule implementation and test coverage");
    }
    
    if ((allResults.confidence_calibration?.calibration_score || 0) < 0.2) {
      recommendations.push("Confidence calibration poor - review confidence calculation parameters");
    }
    
    if ((allResults.performance_metrics?.overall_performance_score || 0) < 0.9) {
      recommendations.push("Performance issues detected - consider optimization");
    }
    
    return recommendations;
  }
}

// Usage Example and Export
if (require.main === module) {
  console.log("🧪 Generating Synthetic Test Suite for MBS Coding System...\n");
  
  const generator = new SyntheticTestGenerator();
  const testSuite = generator.exportTestSuite();
  
  console.log("📊 Test Suite Generated:");
  console.log(`- Total test cases: ${testSuite.metadata.total_cases}`);
  console.log(`- Rule-based tests: ${Object.values(testSuite.rule_based_tests).flat().length}`);
  console.log(`- Confidence tests: ${Object.values(testSuite.confidence_tests).flat().length}`);  
  console.log(`- Performance tests: ${Object.values(testSuite.performance_tests).flat().length}`);
  
  console.log("\n✅ Ready to run evaluation against your MBS system!");
  console.log("📝 Next steps:");
  console.log("1. Run your system against these test cases");
  console.log("2. Use SyntheticEvaluator to analyze results"); 
  console.log("3. Generate calibration report for advisor");
}

module.exports = {
  SyntheticTestGenerator,
  SyntheticEvaluator
};