/**
 * Final confidence calculation comparison
 */

// Original parameters (before fix)
function originalConfidence(score) {
  const k = 3.0;
  const center = 0.35;
  return Math.max(0, Math.min(1, 1 / (1 + Math.exp(-k * (score - center)))));
}

// Optimized parameters (after fix)
function optimizedConfidence(score) {
  const k = 2.6;
  const center = 0.15;
  return Math.max(0, Math.min(1, 1 / (1 + Math.exp(-k * (score - center)))));
}

console.log('🔧 MBSPro Confidence Calculation - Before vs After Fix');
console.log('======================================================');
console.log('Score\tBefore\tAfter\tImprovement');
console.log('------\t------\t-----\t-----------');

const testScores = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

for (const score of testScores) {
  const before = originalConfidence(score);
  const after = optimizedConfidence(score);
  const improvement = ((after - before) / before * 100).toFixed(1);
  const sign = improvement >= 0 ? '+' : '';
  
  console.log(`${score.toFixed(1)}\t${(before * 100).toFixed(1)}%\t${(after * 100).toFixed(1)}%\t${sign}${improvement}%`);
}

console.log('\n📊 Key Improvements:');
console.log(`✓ Maximum confidence: ${(originalConfidence(1.0) * 100).toFixed(1)}% → ${(optimizedConfidence(1.0) * 100).toFixed(1)}%`);
console.log('✓ Better distribution across all score ranges');
console.log('✓ Reduced penalties for rule failures');  
console.log('✓ Higher evidence baseline');
console.log('✓ More balanced multiplicative factors');

console.log('\n🎯 Now high-quality suggestions can achieve up to 90%+ confidence!');