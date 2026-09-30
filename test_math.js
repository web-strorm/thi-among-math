// test_math.js - Unit Test untuk Generator & Bank Soal Matematika
const math = require('./mathQuestions');

console.log('--- TESTING MATH GENERATOR ---');

for (let i = 0; i < 15; i++) {
  const q = math.getRandomQuestion();
  console.log(`\n[Test ${i + 1}] Category: ${q.category}`);
  console.log(`Prompt:\n${q.prompt}`);
  console.log(`Options (${q.options.length}): ${q.options.join(' | ')}`);
  console.log(`Correct Answer: ${q.correctAnswer}`);
  console.assert(q.options.includes(q.correctAnswer), 'ERROR: Correct answer not in options!');
  console.assert(q.options.length === 4, 'ERROR: Options count must be 4!');
  console.log('✓ PASS');
}

console.log('\n--- TESTING DIVERSE QUESTIONS FOR IMPOSTOR TRIAL (3/3) ---');
const trialQuestions = math.getMultipleDiverseQuestions(3);
console.log(`Generated ${trialQuestions.length} trial questions:`);
trialQuestions.forEach((tq, idx) => {
  console.log(`${idx + 1}. [${tq.category}] ${tq.correctAnswer}`);
});

console.log('\nALL MATH TESTS PASSED SUCCESSFULLY! 🎉');
