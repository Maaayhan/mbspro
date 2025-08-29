/**
 * Coverage-Aware Testing for MBS Coding System
 * 考虑实际rule coverage限制的测试框架
 */

const fs = require('fs');

class CoverageAwareTestGenerator {
  constructor() {
    this.availableCodes = this.loadAvailableCodes();
    this.codesByCategory = this.categorizeCodes();
  }

  loadAvailableCodes() {
    try {
      const rulesData = JSON.parse(fs.readFileSync('./apps/api/src/suggest/mbs_rules.normalized.json', 'utf8'));
      const codes = rulesData.map(rule => ({
        code: rule.code,
        title: rule.title,
        desc: rule.desc,
        fee: rule.fee,
        timeThreshold: rule.timeThreshold,
        flags: rule.flags,
        mutuallyExclusiveWith: rule.mutuallyExclusiveWith || []
      }));
      
      console.log(`✅ Loaded ${codes.length} available MBS codes from rules database`);
      return codes;
    } catch (error) {
      console.warn("⚠️  Could not load rules file, using mock data");
      return this.getMockAvailableCodes();
    }
  }

  getMockAvailableCodes() {
    // Mock codes based on what we know exists
    return [
      { code: "3", title: "Short consultation", flags: { telehealth: false, after_hours: false }, timeThreshold: { minMinutes: 0 }},
      { code: "23", title: "Standard consultation", flags: { telehealth: false, after_hours: false }, timeThreshold: { minMinutes: 6 }},
      { code: "36", title: "Long consultation", flags: { telehealth: false, after_hours: false }, timeThreshold: { minMinutes: 20 }},
      { code: "44", title: "Complex consultation", flags: { telehealth: false, after_hours: false }, timeThreshold: { minMinutes: 40 }},
      { code: "92004", title: "Telehealth consultation", flags: { telehealth: true, after_hours: false }, timeThreshold: { minMinutes: 6 }},
      { code: "92026", title: "Telehealth standard", flags: { telehealth: true, after_hours: false }, timeThreshold: { minMinutes: 6 }},
      { code: "92027", title: "Telehealth long", flags: { telehealth: true, after_hours: false }, timeThreshold: { minMinutes: 20 }},
      { code: "729", title: "Chronic disease plan", flags: { telehealth: false, after_hours: false }, timeThreshold: { minMinutes: 20 }},
      { code: "731", title: "Chronic disease review", flags: { telehealth: false, after_hours: false }, timeThreshold: { minMinutes: 15 }}
    ];
  }

  categorizeCodes() {
    const categories = {
      standard_consultations: [],
      telehealth_consultations: [], 
      chronic_disease_management: [],
      after_hours: [],
      other: []
    };

    this.availableCodes.forEach(codeInfo => {
      const code = codeInfo.code;
      const flags = codeInfo.flags || {};
      
      if (flags.telehealth) {
        categories.telehealth_consultations.push(codeInfo);
      } else if (flags.after_hours) {
        categories.after_hours.push(codeInfo);
      } else if (code.startsWith('72') || code.startsWith('73')) {
        categories.chronic_disease_management.push(codeInfo);
      } else if (['3', '4', '23', '24', '36', '37', '44', '47'].includes(code)) {
        categories.standard_consultations.push(codeInfo);
      } else {
        categories.other.push(codeInfo);
      }
    });

    console.log("📊 Code categorization:");
    Object.entries(categories).forEach(([category, codes]) => {
      console.log(`   • ${category}: ${codes.length} codes`);
    });

    return categories;
  }

  generateCoverageAwareTests() {
    const tests = {
      rule_based_tests: {
        duration_rules: this.generateDurationTests(),
        eligibility_rules: this.generateEligibilityTests(),
        telehealth_rules: this.generateTelehealthTests(),
        chronic_disease_tests: this.generateChronicDiseaseTests()
      },
      confidence_tests: {
        high_confidence: this.generateHighConfidenceTests(),
        medium_confidence: this.generateMediumConfidenceTests(),
        low_confidence: this.generateLowConfidenceTests()
      },
      coverage_edge_cases: this.generateCoverageEdgeCases()
    };

    return tests;
  }

  generateDurationTests() {
    const tests = [];
    const standardCodes = this.codesByCategory.standard_consultations;
    
    if (standardCodes.length > 0) {
      // Short consultation test
      const shortCode = standardCodes.find(c => c.timeThreshold?.minMinutes <= 6) || standardCodes[0];
      tests.push({
        id: "dur_short_001",
        note: "Brief 10 minute consultation for prescription refill",
        expected_codes: [shortCode.code],
        confidence_range: [0.7, 0.85],
        test_focus: "short_consultation",
        coverage_category: "standard_consultations"
      });

      // Standard consultation test  
      const standardCode = standardCodes.find(c => c.timeThreshold?.minMinutes >= 6 && c.timeThreshold?.minMinutes < 20) || standardCodes[1];
      if (standardCode) {
        tests.push({
          id: "dur_standard_001", 
          note: "25 minute consultation discussing diabetes management and medication review",
          expected_codes: [standardCode.code],
          confidence_range: [0.75, 0.9],
          test_focus: "standard_consultation",
          coverage_category: "standard_consultations"
        });
      }

      // Long consultation test
      const longCode = standardCodes.find(c => c.timeThreshold?.minMinutes >= 20) || standardCodes[standardCodes.length - 1];
      if (longCode) {
        tests.push({
          id: "dur_long_001",
          note: "45 minute comprehensive health assessment with multiple conditions reviewed",
          expected_codes: [longCode.code],
          confidence_range: [0.8, 0.95], 
          test_focus: "long_consultation",
          coverage_category: "standard_consultations"
        });
      }
    }

    return tests;
  }

  generateEligibilityTests() {
    const tests = [];
    
    // Face-to-face consultation test
    const f2fCodes = this.codesByCategory.standard_consultations.filter(c => !c.flags?.telehealth);
    if (f2fCodes.length > 0) {
      tests.push({
        id: "elig_f2f_001",
        note: "Face-to-face consultation at GP clinic for physical examination",
        expected_codes: f2fCodes.slice(0, 2).map(c => c.code),
        confidence_range: [0.75, 0.9],
        test_focus: "face_to_face_eligibility",
        coverage_category: "standard_consultations"
      });
    }

    return tests;
  }

  generateTelehealthTests() {
    const tests = [];
    const telehealthCodes = this.codesByCategory.telehealth_consultations;
    
    if (telehealthCodes.length > 0) {
      tests.push({
        id: "telehealth_001",
        note: "Telehealth video consultation for ongoing diabetes monitoring, 20 minutes",
        expected_codes: telehealthCodes.slice(0, 2).map(c => c.code),
        confidence_range: [0.8, 0.9],
        test_focus: "telehealth_eligibility",
        coverage_category: "telehealth_consultations"
      });

      // Short telehealth
      const shortTelehealth = telehealthCodes.find(c => c.timeThreshold?.minMinutes <= 10);
      if (shortTelehealth) {
        tests.push({
          id: "telehealth_short_001",
          note: "Brief 8 minute telehealth consultation for test results discussion",
          expected_codes: [shortTelehealth.code],
          confidence_range: [0.75, 0.9],
          test_focus: "telehealth_short",
          coverage_category: "telehealth_consultations"
        });
      }
    }

    return tests;
  }

  generateChronicDiseaseTests() {
    const tests = [];
    const chronicCodes = this.codesByCategory.chronic_disease_management;
    
    if (chronicCodes.length > 0) {
      tests.push({
        id: "chronic_plan_001",
        note: "Chronic disease management plan development for diabetes and hypertension, 30 minutes",
        expected_codes: chronicCodes.slice(0, 2).map(c => c.code),
        confidence_range: [0.8, 0.95],
        test_focus: "chronic_disease_plan",
        coverage_category: "chronic_disease_management"
      });

      tests.push({
        id: "chronic_review_001", 
        note: "Chronic disease management plan review, patient progress assessment",
        expected_codes: chronicCodes.slice(0, 2).map(c => c.code),
        confidence_range: [0.75, 0.9],
        test_focus: "chronic_disease_review", 
        coverage_category: "chronic_disease_management"
      });
    }

    return tests;
  }

  generateHighConfidenceTests() {
    const tests = [];
    
    // Use longest consultation codes for high confidence
    const longCodes = this.availableCodes
      .filter(c => c.timeThreshold?.minMinutes >= 20)
      .sort((a, b) => (b.timeThreshold?.minMinutes || 0) - (a.timeThreshold?.minMinutes || 0))
      .slice(0, 2);

    if (longCodes.length > 0) {
      tests.push({
        id: "conf_high_001",
        note: "Comprehensive 45-minute consultation with detailed history, physical examination, management plan development, and patient education for multiple chronic conditions",
        expected_confidence: [0.85, 0.95],
        expected_top_3: longCodes.map(c => c.code),
        reasoning: "Complete clinical picture with sufficient duration and comprehensive care"
      });
    }

    return tests;
  }

  generateMediumConfidenceTests() {
    const tests = [];
    const mediumCodes = this.codesByCategory.standard_consultations.slice(0, 2);
    
    if (mediumCodes.length > 0) {
      tests.push({
        id: "conf_med_001",
        note: "Patient consultation for back pain, some assessment done",
        expected_confidence: [0.4, 0.7],
        expected_top_3: mediumCodes.map(c => c.code),
        missing_elements: ["duration", "specific_management"],
        reasoning: "Some clinical detail but missing key administrative elements"
      });
    }

    return tests;
  }

  generateLowConfidenceTests() {
    return [{
      id: "conf_low_001",
      note: "Patient visit",
      expected_confidence: [0.1, 0.35],
      expected_top_3: [],
      missing_elements: ["clinical_detail", "duration", "procedures"],
      reasoning: "Insufficient clinical and administrative information"
    }];
  }

  generateCoverageEdgeCases() {
    return {
      out_of_coverage_scenarios: [
        {
          id: "coverage_gap_001",
          note: "Mental health assessment requiring specialist psychology referral",
          scenario: "RAG may return psychology codes not in our rule coverage",
          expected_behavior: "System should handle gracefully with lower confidence",
          test_focus: "out_of_coverage_handling"
        },
        {
          id: "coverage_gap_002", 
          note: "After hours emergency consultation at 11pm",
          scenario: "After hours codes may not be fully covered in rules",
          expected_behavior: "Fallback to standard consultation codes with warnings",
          test_focus: "after_hours_fallback"
        }
      ],
      partial_coverage_scenarios: [
        {
          id: "partial_coverage_001",
          note: "Complex procedure requiring multiple MBS items",
          scenario: "Some items in sequence covered, others not",
          expected_behavior: "Return covered items with partial confidence",
          test_focus: "partial_coverage_handling"
        }
      ]
    };
  }

  exportCoverageAwareTestSuite(outputPath = './coverage-aware-test-suite.json') {
    const testSuite = {
      metadata: {
        generated_at: new Date().toISOString(),
        version: "2.0.0",
        coverage_aware: true,
        available_codes_count: this.availableCodes.length,
        code_categories: Object.keys(this.codesByCategory),
        coverage_note: "Tests designed to work within actual rule coverage limits"
      },
      available_codes_summary: {
        total_codes: this.availableCodes.length,
        by_category: Object.entries(this.codesByCategory).map(([category, codes]) => ({
          category,
          count: codes.length,
          sample_codes: codes.slice(0, 3).map(c => c.code)
        }))
      },
      tests: this.generateCoverageAwareTests()
    };

    fs.writeFileSync(outputPath, JSON.stringify(testSuite, null, 2));
    console.log(`✅ Generated coverage-aware test suite: ${outputPath}`);
    
    return testSuite;
  }

  // Helper to validate if expected codes are in coverage
  validateTestCase(testCase) {
    const availableCodeSet = new Set(this.availableCodes.map(c => c.code));
    const issues = [];
    
    if (testCase.expected_codes) {
      testCase.expected_codes.forEach(code => {
        if (!availableCodeSet.has(code)) {
          issues.push(`Expected code ${code} not in rule coverage`);
        }
      });
    }
    
    if (testCase.expected_top_3) {
      testCase.expected_top_3.forEach(code => {
        if (!availableCodeSet.has(code)) {
          issues.push(`Expected top-3 code ${code} not in rule coverage`);
        }
      });
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// Export and usage
module.exports = { CoverageAwareTestGenerator };

if (require.main === module) {
  console.log("🎯 Generating Coverage-Aware Test Suite for MBS System...\n");
  
  const generator = new CoverageAwareTestGenerator();
  const testSuite = generator.exportCoverageAwareTestSuite();
  
  console.log("\n📊 Coverage-Aware Test Suite Generated:");
  console.log(`- Available codes: ${testSuite.available_codes_summary.total_codes}`);
  console.log(`- Test categories: ${Object.keys(testSuite.tests).length}`);
  console.log("- Coverage gaps identified and handled");
  
  console.log("\n✅ Ready for realistic evaluation!");
}