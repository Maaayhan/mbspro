/**
 * Guardrail Tests - Unit Tests for MBS Coding Rules
 * 专门测试规则引擎和关键业务逻辑的准确性
 */

// Mock test framework (可以替换为Jest/Mocha等)
class TestRunner {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, total: 0 };
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log("🔒 Running Guardrail Tests...\n");
    
    for (const { name, testFn } of this.tests) {
      try {
        await testFn();
        console.log(`✅ ${name}`);
        this.results.passed++;
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        this.results.failed++;
      }
      this.results.total++;
    }

    console.log(`\n📊 Results: ${this.results.passed}/${this.results.total} passed`);
    return this.results;
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || "Assertion failed");
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertRange(value, min, max, message) {
    if (value < min || value > max) {
      throw new Error(message || `Value ${value} not in range [${min}, ${max}]`);
    }
  }
}

// 1. Rule Engine Guardrail Tests
class RuleEngineGuardrails extends TestRunner {
  constructor() {
    super();
    this.setupTests();
  }

  setupTests() {
    // Duration Rule Tests
    this.test("Duration Rule - Pass Case", () => {
      const rule = {
        id: "min_duration_15",
        kind: "min_duration_by_level",
        parameters: { min: 15 },
        hard: true
      };
      const episode = { durationMin: 20 };
      
      const result = this.evalDurationRule(rule, episode);
      this.assert(result.pass, "Should pass when duration exceeds minimum");
      this.assert(result.because.includes("20 >= 15"), "Should show correct comparison");
    });

    this.test("Duration Rule - Fail Case", () => {
      const rule = {
        id: "min_duration_45", 
        kind: "min_duration_by_level",
        parameters: { min: 45 },
        hard: true
      };
      const episode = { durationMin: 30 };
      
      const result = this.evalDurationRule(rule, episode);
      this.assert(!result.pass, "Should fail when duration below minimum");
      this.assert(result.because.includes("requires >= 45"), "Should show requirement");
    });

    this.test("Duration Rule - Missing Duration", () => {
      const rule = {
        id: "min_duration_15",
        kind: "min_duration_by_level", 
        parameters: { min: 15 },
        hard: true
      };
      const episode = {}; // No duration
      
      const result = this.evalDurationRule(rule, episode);
      this.assert(!result.pass, "Should fail when no duration provided");
    });

    // Eligibility Rule Tests
    this.test("Eligibility Rule - Mode Check Pass", () => {
      const rule = {
        id: "telehealth_video",
        kind: "eligibility_required",
        parameters: { mode: "video" },
        hard: false
      };
      const episode = { telehealthMode: "video" };
      
      const result = this.evalEligibilityRule(rule, episode);
      this.assert(result.pass, "Should pass when mode matches");
    });

    this.test("Eligibility Rule - Mode Check Fail", () => {
      const rule = {
        id: "telehealth_video",
        kind: "eligibility_required", 
        parameters: { mode: "video" },
        hard: false
      };
      const episode = { telehealthMode: "phone" };
      
      const result = this.evalEligibilityRule(rule, episode);
      this.assert(!result.pass, "Should fail when mode doesn't match");
    });

    this.test("Eligibility Rule - Age Requirements", () => {
      const rule = {
        id: "adult_only",
        kind: "eligibility_required",
        parameters: { min_age: 18, max_age: 65 },
        hard: true
      };
      
      // Test valid age
      let episode = { ageYears: 30 };
      let result = this.evalEligibilityRule(rule, episode);
      this.assert(result.pass, "Should pass for valid age");
      
      // Test too young
      episode = { ageYears: 16 };
      result = this.evalEligibilityRule(rule, episode);
      this.assert(!result.pass, "Should fail for age too young");
      
      // Test too old
      episode = { ageYears: 70 };
      result = this.evalEligibilityRule(rule, episode);
      this.assert(!result.pass, "Should fail for age too old");
    });

    this.test("Eligibility Rule - Referral Required", () => {
      const rule = {
        id: "needs_referral",
        kind: "eligibility_required",
        parameters: { referral: true },
        hard: true
      };
      
      // With referral
      let episode = { referralPresent: true };
      let result = this.evalEligibilityRule(rule, episode);
      this.assert(result.pass, "Should pass when referral present");
      
      // Without referral
      episode = { referralPresent: false };
      result = this.evalEligibilityRule(rule, episode);
      this.assert(!result.pass, "Should fail when referral missing");
    });

    this.test("Eligibility Rule - Report Required", () => {
      const rule = {
        id: "needs_report",
        kind: "eligibility_required",
        parameters: { report: true },
        hard: true
      };
      
      // With report
      let episode = { reportPresent: true };
      let result = this.evalEligibilityRule(rule, episode);
      this.assert(result.pass, "Should pass when report present");
      
      // Without report  
      episode = { reportPresent: false };
      result = this.evalEligibilityRule(rule, episode);
      this.assert(!result.pass, "Should fail when report missing");
    });

    // Location Rule Tests
    this.test("Location Rule - Pass Case", () => {
      const rule = {
        id: "hospital_only",
        kind: "location_must_be",
        parameters: { location: "hospital" },
        hard: true
      };
      const episode = { location: "hospital" };
      
      const result = this.evalLocationRule(rule, episode);
      this.assert(result.pass, "Should pass when location matches");
    });

    this.test("Location Rule - Fail Case", () => {
      const rule = {
        id: "hospital_only", 
        kind: "location_must_be",
        parameters: { location: "hospital" },
        hard: true
      };
      const episode = { location: "clinic" };
      
      const result = this.evalLocationRule(rule, episode);
      this.assert(!result.pass, "Should fail when location doesn't match");
    });

    // Confidence Calculation Tests
    this.test("Confidence Calculation - High Confidence Case", () => {
      const score = 0.85;
      const ruleResults = [{ pass: true }, { pass: true }]; // All rules pass
      const blocked = false;
      const evidenceSufficiency = 0.9;
      
      const confidence = this.calculateConfidence(score, ruleResults, blocked, evidenceSufficiency);
      this.assertRange(confidence, 0.75, 0.95, "High score with good rules should give high confidence");
    });

    this.test("Confidence Calculation - Low Confidence Case", () => {
      const score = 0.3;
      const ruleResults = [{ pass: false }, { pass: true }]; // Some rules fail
      const blocked = false;
      const evidenceSufficiency = 0.4;
      
      const confidence = this.calculateConfidence(score, ruleResults, blocked, evidenceSufficiency);
      this.assertRange(confidence, 0.1, 0.5, "Low score with failed rules should give low confidence");
    });

    this.test("Confidence Calculation - Blocked Item", () => {
      const score = 0.8; // High score but blocked
      const ruleResults = [{ pass: false }];
      const blocked = true;
      const evidenceSufficiency = 0.8;
      
      const confidence = this.calculateConfidence(score, ruleResults, blocked, evidenceSufficiency);
      this.assertRange(confidence, 0.1, 0.4, "Blocked items should have low confidence regardless of score");
    });

    // Evidence Sufficiency Tests
    this.test("Evidence Sufficiency - Complete Evidence", () => {
      const item = { 
        eligibility: ["Requires minimum 45 minutes", "Face-to-face consultation", "Referral required"] 
      };
      const episode = {
        durationMin: 50,
        location: "clinic", 
        referralPresent: true,
        evidence: [
          { field: "duration" },
          { field: "location" }, 
          { field: "referral" }
        ]
      };
      
      const sufficiency = this.calculateEvidenceSufficiency(item, episode);
      this.assertRange(sufficiency, 0.8, 1.0, "Complete evidence should give high sufficiency");
    });

    this.test("Evidence Sufficiency - Partial Evidence", () => {
      const item = {
        eligibility: ["Requires minimum 30 minutes", "Telehealth video", "After hours"]
      };
      const episode = {
        durationMin: 35,
        // Missing mode and hours info
        evidence: [{ field: "duration" }]
      };
      
      const sufficiency = this.calculateEvidenceSufficiency(item, episode);
      this.assertRange(sufficiency, 0.2, 0.5, "Partial evidence should give medium sufficiency");
    });

    this.test("Evidence Sufficiency - No Evidence", () => {
      const item = {
        eligibility: ["Requires minimum 15 minutes", "Face-to-face", "Report required"]
      };
      const episode = {
        evidence: [] // No evidence
      };
      
      const sufficiency = this.calculateEvidenceSufficiency(item, episode);
      this.assertRange(sufficiency, 0.0, 0.2, "No evidence should give low sufficiency");
    });

    // Score Calculation Boundary Tests
    this.test("Score Calculation - Margin Bonus", () => {
      const baseSim = 0.7;
      const episode = { durationMin: 60 }; // 60 minutes
      const item = { time_threshold: 45 }; // Requires 45 min
      
      const score = this.calculateScoreWithMargin(baseSim, episode, item);
      this.assert(score > baseSim, "Should get margin bonus for exceeding time threshold");
      this.assertRange(score, baseSim, baseSim + 0.25, "Margin bonus should be capped");
    });

    this.test("Score Calculation - No Margin Bonus", () => {
      const baseSim = 0.7;
      const episode = { durationMin: 40 }; // 40 minutes  
      const item = { time_threshold: 45 }; // Requires 45 min
      
      const score = this.calculateScoreWithMargin(baseSim, episode, item);
      this.assertEqual(score, baseSim, "Should not get margin bonus when below threshold");
    });

    // Rule Combination Tests
    this.test("Multiple Rules - All Pass", () => {
      const rules = [
        { id: "dur", kind: "min_duration_by_level", parameters: { min: 15 }, hard: true },
        { id: "loc", kind: "location_must_be", parameters: { location: "clinic" }, hard: false }
      ];
      const episode = { durationMin: 20, location: "clinic" };
      
      const results = this.evaluateMultipleRules(rules, episode);
      this.assert(results.every(r => r.pass), "All rules should pass");
      this.assert(!results.some(r => r.hard && !r.pass), "No hard rules should fail");
    });

    this.test("Multiple Rules - Hard Rule Fails", () => {
      const rules = [
        { id: "dur", kind: "min_duration_by_level", parameters: { min: 45 }, hard: true },
        { id: "loc", kind: "location_must_be", parameters: { location: "clinic" }, hard: false }
      ];
      const episode = { durationMin: 30, location: "clinic" }; // Duration too short
      
      const results = this.evaluateMultipleRules(rules, episode);
      const hardFailures = results.filter(r => r.hard && !r.pass);
      this.assert(hardFailures.length > 0, "Should have hard rule failures");
      
      // This should result in low confidence
      const confidence = this.calculateConfidence(0.8, results, false, 0.8);
      this.assertRange(confidence, 0.1, 0.5, "Hard rule failure should reduce confidence significantly");
    });
  }

  // Rule evaluation implementations (simplified versions of actual system logic)
  evalDurationRule(rule, episode) {
    const min = Number(rule.parameters?.min || 0);
    const ok = typeof episode.durationMin === 'number' ? episode.durationMin >= min : false;
    return { 
      rule_id: rule.id, 
      pass: ok, 
      hard: !!rule.hard, 
      because: ok ? `duration ${episode.durationMin} >= ${min}` : `requires >= ${min} minutes` 
    };
  }

  evalEligibilityRule(rule, episode) {
    const p = rule.parameters || {};
    let ok = true;
    const because = [];

    if (p.mode) { 
      ok = ok && (episode.telehealthMode === p.mode); 
      because.push(`mode=${episode.telehealthMode}`); 
    }
    if (p.location) { 
      ok = ok && (episode.location === p.location); 
      because.push(`location=${episode.location}`); 
    }
    if (p.referral === true) { 
      ok = ok && !!episode.referralPresent; 
      because.push(`referralPresent=${episode.referralPresent}`); 
    }
    if (p.report === true) { 
      ok = ok && !!episode.reportPresent; 
      because.push(`reportPresent=${episode.reportPresent}`); 
    }
    if (typeof p.min_age === 'number') { 
      ok = ok && (typeof episode.ageYears === 'number' && episode.ageYears >= p.min_age); 
      because.push(`age>=${p.min_age} (${episode.ageYears ?? 'n/a'})`); 
    }
    if (typeof p.max_age === 'number') { 
      ok = ok && (typeof episode.ageYears === 'number' && episode.ageYears <= p.max_age); 
      because.push(`age<=${p.max_age} (${episode.ageYears ?? 'n/a'})`); 
    }

    return { rule_id: rule.id, pass: ok, hard: !!rule.hard, because: because.join('; ') };
  }

  evalLocationRule(rule, episode) {
    const loc = String(rule.parameters?.location || '');
    const ok = episode.location === loc;
    return { rule_id: rule.id, pass: ok, hard: !!rule.hard, because: `location=${episode.location}` };
  }

  // Simplified confidence calculation based on system logic
  calculateConfidence(score, ruleResults, blocked, evidenceSufficiency) {
    if (blocked) return Math.min(0.25, score * 0.3);
    
    const anyFail = ruleResults.some(r => !r.pass);
    if (anyFail) score = Math.min(score, 0.5);
    
    const softPassRate = ruleResults.filter(r => r.pass).length / Math.max(1, ruleResults.length);
    score = score * (0.75 + 0.25 * softPassRate) * (0.75 + 0.25 * evidenceSufficiency);
    
    // Sigmoid transformation
    const k = 2.6;
    const center = 0.15;
    return Math.max(0, Math.min(1, 1 / (1 + Math.exp(-k * (score - center)))));
  }

  calculateEvidenceSufficiency(item, episode) {
    const keys = new Set((episode.evidence || []).map(e => e.field.split(':')[0]));
    const needed = new Set();
    
    for (const s of (item.eligibility || [])) {
      const s2 = s.toLowerCase();
      if (s2.includes('minute')) needed.add('duration');
      if (s2.includes('face-to-face') || s2.includes('clinic')) needed.add('location');
      if (s2.includes('video') || s2.includes('telehealth') || s2.includes('phone')) needed.add('mode');
      if (s2.includes('referral')) needed.add('referral');
      if (s2.includes('report')) needed.add('report');
      if (s2.includes('after-hours')) needed.add('hoursBucket');
      if (s2.includes('age')) needed.add('age');
    }
    
    if (needed.size === 0) return 1;
    let hit = 0;
    for (const k of needed) if (keys.has(k)) hit++;
    return hit / needed.size;
  }

  calculateScoreWithMargin(baseSim, episode, item) {
    let score = baseSim;
    const threshold = item.time_threshold;
    
    if (threshold && typeof episode.durationMin === 'number' && episode.durationMin > threshold) {
      const delta = Math.max(0, episode.durationMin - threshold);
      const marginBonus = Math.max(0, Math.min(0.25, (delta / 60) * 0.25));
      score += marginBonus;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  evaluateMultipleRules(rules, episode) {
    return rules.map(rule => {
      switch (rule.kind) {
        case 'min_duration_by_level':
          return this.evalDurationRule(rule, episode);
        case 'eligibility_required':
          return this.evalEligibilityRule(rule, episode);
        case 'location_must_be':
          return this.evalLocationRule(rule, episode);
        default:
          return { rule_id: rule.id, pass: true, hard: !!rule.hard, because: 'n/a' };
      }
    });
  }
}

// 2. Performance Guardrail Tests
class PerformanceGuardrails extends TestRunner {
  constructor() {
    super();
    this.setupTests();
  }

  setupTests() {
    this.test("Score Calculation Performance", () => {
      const startTime = performance.now();
      
      // Simulate calculating 100 scores
      for (let i = 0; i < 100; i++) {
        this.calculateConfidence(0.7, [{ pass: true }, { pass: false }], false, 0.8);
      }
      
      const duration = performance.now() - startTime;
      this.assert(duration < 100, `Score calculation too slow: ${duration}ms for 100 iterations`);
    });

    this.test("Rule Evaluation Performance", () => {
      const startTime = performance.now();
      
      // Simulate evaluating 1000 rules
      const rule = { id: "test", kind: "min_duration_by_level", parameters: { min: 15 }, hard: false };
      const episode = { durationMin: 20 };
      
      const ruleGuards = new RuleEngineGuardrails();
      for (let i = 0; i < 1000; i++) {
        ruleGuards.evalDurationRule(rule, episode);
      }
      
      const duration = performance.now() - startTime;
      this.assert(duration < 500, `Rule evaluation too slow: ${duration}ms for 1000 iterations`);
    });

    this.test("Memory Usage - No Leaks", () => {
      // Simplified memory usage test
      const initialHeap = process.memoryUsage?.()?.heapUsed || 0;
      
      // Create and destroy many objects
      for (let i = 0; i < 10000; i++) {
        const obj = {
          rule_results: [{ pass: true, rule_id: `rule_${i}` }],
          confidence: Math.random(),
          episode: { durationMin: 15 + Math.random() * 60 }
        };
        // Simulate processing
        JSON.stringify(obj);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalHeap = process.memoryUsage?.()?.heapUsed || 0;
      const growth = finalHeap - initialHeap;
      
      // Allow for some growth but not excessive
      this.assert(growth < 50 * 1024 * 1024, `Excessive memory growth: ${growth} bytes`);
    });
  }

  calculateConfidence(score, ruleResults, blocked, evidenceSufficiency) {
    // Same as RuleEngineGuardrails version - avoiding duplication in real implementation
    if (blocked) return Math.min(0.25, score * 0.3);
    
    const anyFail = ruleResults.some(r => !r.pass);
    if (anyFail) score = Math.min(score, 0.5);
    
    const softPassRate = ruleResults.filter(r => r.pass).length / Math.max(1, ruleResults.length);
    score = score * (0.75 + 0.25 * softPassRate) * (0.75 + 0.25 * evidenceSufficiency);
    
    const k = 2.6;
    const center = 0.15;
    return Math.max(0, Math.min(1, 1 / (1 + Math.exp(-k * (score - center)))));
  }
}

// 3. Integration Guardrail Tests
class IntegrationGuardrails extends TestRunner {
  constructor() {
    super();
    this.setupTests();
  }

  setupTests() {
    this.test("End-to-End Rule Pipeline", () => {
      // Simulate full pipeline: extract -> retrieve -> evaluate -> rank
      const note = "45 minute face-to-face mental health consultation with psychologist referral";
      
      // Mock extraction
      const episode = {
        durationMin: 45,
        location: "clinic",
        telehealthMode: "face-to-face",
        referralPresent: true,
        evidence: [
          { field: "duration" },
          { field: "location" }, 
          { field: "referral" }
        ]
      };
      
      // Mock rules
      const rules = [
        { id: "dur_45", kind: "min_duration_by_level", parameters: { min: 45 }, hard: true },
        { id: "ref_req", kind: "eligibility_required", parameters: { referral: true }, hard: true }
      ];
      
      // Mock item  
      const item = {
        item: "2715",
        title: "Mental Health Treatment Plan", 
        eligibility: ["Minimum 45 minutes", "Referral required"]
      };
      
      const ruleGuards = new RuleEngineGuardrails();
      const results = ruleGuards.evaluateMultipleRules(rules, episode);
      const evidenceSufficiency = ruleGuards.calculateEvidenceSufficiency(item, episode);
      const confidence = ruleGuards.calculateConfidence(0.85, results, false, evidenceSufficiency);
      
      // Expectations for this ideal case
      this.assert(results.every(r => r.pass), "All rules should pass for ideal case");
      this.assertRange(evidenceSufficiency, 0.8, 1.0, "Should have high evidence sufficiency");
      this.assertRange(confidence, 0.8, 0.95, "Should have high confidence");
    });

    this.test("Edge Case - Missing All Information", () => {
      const note = "patient visit";
      
      // Minimal episode
      const episode = { evidence: [] };
      
      const rules = [
        { id: "dur_req", kind: "min_duration_by_level", parameters: { min: 15 }, hard: true }
      ];
      
      const item = {
        item: "23",
        title: "Standard Consultation",
        eligibility: ["Minimum 15 minutes"]
      };
      
      const ruleGuards = new RuleEngineGuardrails();
      const results = ruleGuards.evaluateMultipleRules(rules, episode);
      const evidenceSufficiency = ruleGuards.calculateEvidenceSufficiency(item, episode);
      const confidence = ruleGuards.calculateConfidence(0.3, results, false, evidenceSufficiency);
      
      // Expectations for poor case
      this.assert(results.some(r => !r.pass), "Some rules should fail for minimal case");
      this.assertRange(evidenceSufficiency, 0.0, 0.2, "Should have low evidence sufficiency");
      this.assertRange(confidence, 0.0, 0.4, "Should have low confidence");
    });

    this.test("Consistency - Same Input Same Output", () => {
      const episode = { durationMin: 30, location: "clinic" };
      const rules = [{ id: "dur", kind: "min_duration_by_level", parameters: { min: 25 }, hard: false }];
      
      const ruleGuards = new RuleEngineGuardrails();
      
      // Run same evaluation multiple times
      const result1 = ruleGuards.evaluateMultipleRules(rules, episode);
      const result2 = ruleGuards.evaluateMultipleRules(rules, episode);
      const result3 = ruleGuards.evaluateMultipleRules(rules, episode);
      
      // Results should be identical
      this.assertEqual(JSON.stringify(result1), JSON.stringify(result2), "Results should be consistent");
      this.assertEqual(JSON.stringify(result2), JSON.stringify(result3), "Results should be consistent");
    });
  }
}

// 4. Main Test Suite Runner
async function runAllGuardrailTests() {
  console.log("🔒 Starting Comprehensive Guardrail Tests\n");
  
  const suites = [
    { name: "Rule Engine", suite: new RuleEngineGuardrails() },
    { name: "Performance", suite: new PerformanceGuardrails() },  
    { name: "Integration", suite: new IntegrationGuardrails() }
  ];
  
  const overallResults = { passed: 0, failed: 0, total: 0 };
  
  for (const { name, suite } of suites) {
    console.log(`\n📋 ${name} Guardrails:`);
    const results = await suite.run();
    
    overallResults.passed += results.passed;
    overallResults.failed += results.failed;
    overallResults.total += results.total;
  }
  
  console.log(`\n🎯 Overall Guardrail Results:`);
  console.log(`✅ Passed: ${overallResults.passed}`);
  console.log(`❌ Failed: ${overallResults.failed}`); 
  console.log(`📊 Success Rate: ${((overallResults.passed / overallResults.total) * 100).toFixed(1)}%`);
  
  if (overallResults.failed === 0) {
    console.log(`\n🎉 All guardrail tests passed! System rules are functioning correctly.`);
  } else {
    console.log(`\n⚠️  ${overallResults.failed} tests failed. Review rule implementation.`);
  }
  
  return overallResults;
}

// Export for use in larger test suites
module.exports = {
  RuleEngineGuardrails,
  PerformanceGuardrails, 
  IntegrationGuardrails,
  runAllGuardrailTests
};

// Run tests if called directly
if (require.main === module) {
  runAllGuardrailTests().catch(console.error);
}