/**
 * Test script to find optimal sigmoid parameters
 */

// Test different parameter combinations
function testSigmoid(score, k, center) {
  return Math.max(0, Math.min(1, 1 / (1 + Math.exp(-k * (score - center)))));
}

console.log('Finding optimal sigmoid parameters:');
console.log('=====================================');

const testScores = [0.5, 0.7, 0.8, 0.9, 1.0];
const kValues = [2.0, 2.2, 2.4, 2.6];
const centerValues = [0.15, 0.18, 0.20, 0.22];

let bestParams = { k: 2.2, center: 0.20, score: 0 };

console.log('Testing parameter combinations...\n');

for (const k of kValues) {
  for (const center of centerValues) {
    const conf_50 = testSigmoid(0.5, k, center);
    const conf_80 = testSigmoid(0.8, k, center); 
    const conf_100 = testSigmoid(1.0, k, center);
    
    // Score based on: high confidence at 1.0, good spread, reasonable at 0.5
    const score = conf_100 * 0.5 + (conf_80 - conf_50) * 0.3 + (conf_50 > 0.6 ? 0.2 : 0);
    
    if (score > bestParams.score) {
      bestParams = { k, center, score };
    }
    
    console.log(`k=${k}, center=${center}: 50%→${(conf_50*100).toFixed(1)}%, 80%→${(conf_80*100).toFixed(1)}%, 100%→${(conf_100*100).toFixed(1)}%, score=${score.toFixed(3)}`);
  }
  console.log('');
}

console.log(`Best parameters: k=${bestParams.k}, center=${bestParams.center}`);
console.log(`\nOptimal confidence curve:`);

for (const score of [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]) {
  const conf = testSigmoid(score, bestParams.k, bestParams.center);
  console.log(`Score ${score.toFixed(1)} → Confidence ${(conf*100).toFixed(1)}%`);
}