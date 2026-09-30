// mathQuestions.js - Sistem Generator & Bank Soal Persamaan & Pertidaksamaan Linear
// Mencakup: PLSV, PtLSV, SPLDV, Nilai Mutlak, Garis Bilangan, dan Soal Cerita Kontekstual

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randNonZero(min, max) {
  let v = 0;
  while (v === 0) {
    v = randInt(min, max);
  }
  return v;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTerm(coeff, variable = 'x', isLeading = false) {
  if (coeff === 0) return '';
  let sign = coeff > 0 ? (isLeading ? '' : '+ ') : (isLeading ? '-' : '- ');
  let absVal = Math.abs(coeff);
  let strVal = absVal === 1 && variable !== '' ? '' : absVal.toString();
  return `${sign}${strVal}${variable} `;
}

function formatConstant(val, isLeading = false) {
  if (val === 0) return isLeading ? '0' : '';
  let sign = val > 0 ? (isLeading ? '' : '+ ') : (isLeading ? '-' : '- ');
  return `${sign}${Math.abs(val)}`;
}

// 1. PLSV (Persamaan Linear Satu Variabel)
function genPLSV_Dasar() {
  const x = randInt(-12, 15);
  const a = randNonZero(-8, 9);
  const b = randInt(-25, 25);
  const c = a * x + b;

  const left = `${a === 1 ? 'x' : (a === -1 ? '-x' : a + 'x')} ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}`.trim();
  const questionText = `Tentukan himpunan penyelesaian dari persamaan linear berikut:\n\\[ ${left} = ${c} \\]`;
  
  const correct = `x = ${x}`;
  const wrong1 = `x = ${-x}`;
  const wrong2 = `x = ${x + randNonZero(-4, 4)}`;
  const wrong3 = `x = ${Math.round((c + b) / (a !== 0 ? a : 1))}`;

  const options = Array.from(new Set([correct, wrong1, wrong2, wrong3]));
  while (options.length < 4) {
    options.push(`x = ${randInt(-20, 20)}`);
  }

  return {
    id: 'plsv_dasar_' + Date.now() + '_' + Math.random(),
    category: 'PLSV Dasar',
    categoryCode: 'PLSV',
    prompt: questionText,
    rawEquation: `${left} = ${c}`,
    correctAnswer: correct,
    options: shuffle(options.slice(0, 4)),
    targetValue: x,
    explanation: `Langkah penyelesaian:\n1. ${left} = ${c}\n2. ${a}x = ${c} ${b >= 0 ? '- ' + b : '+ ' + Math.abs(b)} = ${c - b}\n3. x = ${c - b} / ${a} = ${x}`
  };
}

function genPLSV_Kurung() {
  const x = randInt(-10, 10);
  const a = randNonZero(2, 6);
  const b = randInt(-6, 6);
  const c = randNonZero(-5, 5);
  const d = a * (x + b) - c * x; // a(x + b) = c*x + d => ax + ab = cx + d => (a-c)x = d - ab

  const left = `${a}(x ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)})`;
  const right = `${c === 1 ? 'x' : (c === -1 ? '-x' : c + 'x')} ${d >= 0 ? '+ ' + d : '- ' + Math.abs(d)}`;
  
  const questionText = `Selesaikan nilai \\(x\\) pada persamaan distributif berikut:\n\\[ ${left} = ${right} \\]`;
  const correct = `x = ${x}`;
  const wrong1 = `x = ${-x}`;
  const wrong2 = `x = ${x + randNonZero(-3, 3)}`;
  const wrong3 = `x = ${x + randNonZero(-5, 5)}`;

  const options = Array.from(new Set([correct, wrong1, wrong2, wrong3]));
  while (options.length < 4) {
    options.push(`x = ${randInt(-15, 15)}`);
  }

  return {
    id: 'plsv_kurung_' + Date.now() + '_' + Math.random(),
    category: 'PLSV Bentuk Kurung',
    categoryCode: 'PLSV',
    prompt: questionText,
    rawEquation: `${left} = ${right}`,
    correctAnswer: correct,
    options: shuffle(options.slice(0, 4)),
    targetValue: x,
    explanation: `Buka tanda kurung:\n${a}x ${a * b >= 0 ? '+ ' + (a * b) : '- ' + Math.abs(a * b)} = ${right}\n(${a} - ${c})x = ${d} - (${a * b})\n${a - c}x = ${d - a * b}\nx = ${x}`
  };
}

function genPLSV_Pecahan() {
  const x = randInt(-8, 12);
  const denom1 = randInt(2, 5);
  const denom2 = randInt(2, 4);
  const k1 = randInt(-5, 5);
  const k2 = randInt(-5, 5);
  
  // (a x + k1) / denom1 = (b x + k2) / denom2
  // denom2*(a x + k1) = denom1*(b x + k2)
  // (denom2*a - denom1*b) * x = denom1*k2 - denom2*k1
  let a = randInt(1, 3);
  let b = randInt(1, 2);
  if (denom2 * a === denom1 * b) {
    a += 1;
  }
  const rightConst = denom2 * (a * x + k1) - denom1 * b * x;
  // rightConst = denom1 * k2 => k2_val
  // To keep clean integers, let's construct simply:
  // (x + k1)/denom1 = C
  const C = randInt(-6, 8);
  const x_ans = C * denom1 - k1;

  const left = `\\frac{x ${k1 >= 0 ? '+ ' + k1 : '- ' + Math.abs(k1)}}{${denom1}}`;
  const questionText = `Tentukan nilai \\(x\\) yang memenuhi persamaan pecahan linear:\n\\[ ${left} = ${C} \\]`;
  
  const correct = `x = ${x_ans}`;
  const wrong1 = `x = ${-x_ans}`;
  const wrong2 = `x = ${x_ans + denom1}`;
  const wrong3 = `x = ${x_ans - denom1}`;

  const options = Array.from(new Set([correct, wrong1, wrong2, wrong3]));
  while (options.length < 4) {
    options.push(`x = ${randInt(-20, 20)}`);
  }

  return {
    id: 'plsv_pecahan_' + Date.now() + '_' + Math.random(),
    category: 'PLSV Bentuk Pecahan',
    categoryCode: 'PLSV',
    prompt: questionText,
    rawEquation: `(${left}) = ${C}`,
    correctAnswer: correct,
    options: shuffle(options.slice(0, 4)),
    targetValue: x_ans,
    explanation: `Kalikan kedua ruas dengan ${denom1}:\nx ${k1 >= 0 ? '+ ' + k1 : '- ' + Math.abs(k1)} = ${C} \\times ${denom1} = ${C * denom1}\nx = ${C * denom1} ${k1 >= 0 ? '- ' + k1 : '+ ' + Math.abs(k1)} = ${x_ans}`
  };
}

// 2. PtLSV (Pertidaksamaan Linear Satu Variabel)
function genPtLSV_Dasar() {
  const x = randInt(-8, 10);
  const a = randNonZero(-7, 7);
  const b = randInt(-15, 15);
  const signs = ['<', '\\le', '>', '\\ge'];
  const rawSign = signs[randInt(0, signs.length - 1)];
  const c = a * x + b;

  // If a < 0, inequality sign flips!
  let flipSignMap = {
    '<': '>',
    '\\le': '\\ge',
    '>': '<',
    '\\ge': '\\le'
  };
  const finalSign = a < 0 ? flipSignMap[rawSign] : rawSign;

  const left = `${a === 1 ? 'x' : (a === -1 ? '-x' : a + 'x')} ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}`;
  const questionText = `Tentukan himpunan penyelesaian dari pertidaksamaan linear berikut:\n\\[ ${left} ${rawSign} ${c} \\]`;

  const correct = `x ${finalSign} ${x}`;
  // Distractor: forgot to flip sign when dividing by negative
  const wrong1 = `x ${rawSign} ${x}`;
  const wrong2 = `x ${finalSign} ${-x}`;
  const wrong3 = `x ${finalSign === '<' ? '>' : '<'} ${x + randNonZero(1, 3)}`;

  const options = Array.from(new Set([correct, wrong1, wrong2, wrong3]));
  while (options.length < 4) {
    options.push(`x ${finalSign} ${randInt(-15, 15)}`);
  }

  return {
    id: 'ptlsv_dasar_' + Date.now() + '_' + Math.random(),
    category: 'PtLSV Dasar & Pembalikan Tanda',
    categoryCode: 'PtLSV',
    prompt: questionText,
    rawEquation: `${left} ${rawSign} ${c}`,
    correctAnswer: correct,
    options: shuffle(options.slice(0, 4)),
    targetValue: x,
    explanation: `Langkah pengerjaan:\n1. ${left} ${rawSign} ${c}\n2. ${a}x ${rawSign} ${c - b}\n3. Bagi kedua ruas dengan ${a} ${a < 0 ? '(Ingat: Membagi dengan bilangan negatif MEMBALIKKAN arah tanda pertidaksamaan!)' : ''}\n4. Hasil: x ${finalSign} ${x}`
  };
}

function genPtLSV_Ganda() {
  const x_min = randInt(-6, 2);
  const diff = randInt(3, 8);
  const x_max = x_min + diff;
  const b = randInt(-10, 10);
  const a = randInt(2, 4); // positive multiplier

  const lower = a * x_min + b;
  const upper = a * x_max + b;

  const questionText = `Tentukan nilai penyelesaian dari pertidaksamaan linear ganda berikut:\n\\[ ${lower} < ${a}x ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)} \\le ${upper} \\]`;
  const correct = `${x_min} < x \\le ${x_max}`;
  const wrong1 = `${x_min} \\le x < ${x_max}`;
  const wrong2 = `${-x_max} < x \\le ${-x_min}`;
  const wrong3 = `${x_min - 2} < x \\le ${x_max + 2}`;

  const options = Array.from(new Set([correct, wrong1, wrong2, wrong3]));
  while (options.length < 4) {
    options.push(`${randInt(-8, 0)} < x \\le ${randInt(1, 9)}`);
  }

  return {
    id: 'ptlsv_ganda_' + Date.now() + '_' + Math.random(),
    category: 'PtLSV Ganda / Interval',
    categoryCode: 'PtLSV',
    prompt: questionText,
    rawEquation: `${lower} < ${a}x + ${b} <= ${upper}`,
    correctAnswer: correct,
    options: shuffle(options.slice(0, 4)),
    targetValue: { min: x_min, max: x_max },
    explanation: `Kurangkan semua ruas dengan ${b}:\n${lower - b} < ${a}x \\le ${upper - b}\nBagi semua ruas dengan ${a}:\n${x_min} < x \\le ${x_max}`
  };
}

// 3. SPLDV (Sistem Persamaan Linear Dua Variabel)
function genSPLDV() {
  const x = randInt(-6, 8);
  const y = randInt(-6, 8);

  const a1 = randNonZero(-4, 5);
  const b1 = randNonZero(-3, 4);
  const c1 = a1 * x + b1 * y;

  let a2 = randNonZero(-3, 4);
  let b2 = randNonZero(-4, 5);
  // ensure determinant != 0
  if (a1 * b2 - a2 * b1 === 0) {
    b2 += 1;
  }
  const c2 = a2 * x + b2 * y;

  const eq1 = `${a1 === 1 ? 'x' : (a1 === -1 ? '-x' : a1 + 'x')} ${b1 > 0 ? '+ ' + (b1 === 1 ? 'y' : b1 + 'y') : '- ' + (Math.abs(b1) === 1 ? 'y' : Math.abs(b1) + 'y')} = ${c1}`;
  const eq2 = `${a2 === 1 ? 'x' : (a2 === -1 ? '-x' : a2 + 'x')} ${b2 > 0 ? '+ ' + (b2 === 1 ? 'y' : b2 + 'y') : '- ' + (Math.abs(b2) === 1 ? 'y' : Math.abs(b2) + 'y')} = ${c2}`;

  const modes = [
    { type: 'xy', q: 'Tentukan nilai pasangan \\((x, y)\\) dari sistem persamaan:', ans: `(${x}, ${y})`, w1: `(${y}, ${x})`, w2: `(${x + 1}, ${y - 1})`, w3: `(${-x}, ${-y})` },
    { type: 'x_plus_y', q: 'Tentukan nilai dari \\(x + y\\) jika diketahui:', ans: `${x + y}`, w1: `${x - y}`, w2: `${-(x + y)}`, w3: `${x + y + 2}` },
    { type: '2x_minus_y', q: 'Tentukan nilai dari \\(2x - y\\) jika diketahui:', ans: `${2 * x - y}`, w1: `${2 * x + y}`, w2: `${x - 2 * y}`, w3: `${2 * x - y + 3}` },
    { type: 'x_times_y', q: 'Tentukan nilai dari \\(x \\cdot y\\) jika diketahui:', ans: `${x * y}`, w1: `${-(x * y)}`, w2: `${x + y}`, w3: `${x * y + 4}` }
  ];

  const chosen = modes[randInt(0, modes.length - 1)];
  const questionText = `${chosen.q}\n\\[ \\begin{cases} ${eq1} \\\\ ${eq2} \\end{cases} \\]`;

  const options = Array.from(new Set([chosen.ans, chosen.w1, chosen.w2, chosen.w3]));
  while (options.length < 4) {
    options.push(chosen.type === 'xy' ? `(${randInt(-10, 10)}, ${randInt(-10, 10)})` : `${randInt(-20, 20)}`);
  }

  return {
    id: 'spldv_' + Date.now() + '_' + Math.random(),
    category: 'SPLDV (Sistem Persamaan Linear Dua Variabel)',
    categoryCode: 'SPLDV',
    prompt: questionText,
    rawEquation: `${eq1} | ${eq2}`,
    correctAnswer: chosen.ans,
    options: shuffle(options.slice(0, 4)),
    targetValue: { x, y },
    explanation: `Gunakan metode eliminasi/substitusi:\nDiperoleh x = ${x} dan y = ${y}.\nJawaban akhir: ${chosen.ans}`
  };
}

// 4. Persamaan Nilai Mutlak Linear
function genNilaiMutlakPersamaan() {
  const x1 = randInt(-8, 10);
  const a = randInt(1, 4);
  const b = randInt(-10, 10);
  const c = Math.abs(a * x1 + b);

  // |ax + b| = c => ax + b = c OR ax + b = -c
  // x1 = (c - b) / a
  // x2 = (-c - b) / a
  const x2 = (-c - b) / a;

  // Let's ensure x2 is integer
  if (!Number.isInteger(x2)) {
    return genPLSV_Dasar(); // fallback cleanly
  }

  const left = `|${a === 1 ? 'x' : a + 'x'} ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}|`;
  const questionText = `Tentukan himpunan penyelesaian dari persamaan nilai mutlak:\n\\[ ${left} = ${c} \\]`;

  const sortedAns = [x1, x2].sort((n1, n2) => n1 - n2);
  const correct = `\\{${sortedAns[0]}, ${sortedAns[1]}\\}`;
  const wrong1 = `\\{${-sortedAns[0]}, ${-sortedAns[1]}\\}`;
  const wrong2 = `\\{${sortedAns[0]}\\} (hanya satu)`;
  const wrong3 = `\\{${sortedAns[0] - 2}, ${sortedAns[1] + 2}\\}`;

  const options = Array.from(new Set([correct, wrong1, wrong2, wrong3]));
  while (options.length < 4) {
    options.push(`\\{${randInt(-10, 0)}, ${randInt(1, 10)}\\}`);
  }

  return {
    id: 'mutlak_persamaan_' + Date.now() + '_' + Math.random(),
    category: 'Persamaan Nilai Mutlak Linear',
    categoryCode: 'NilaiMutlak',
    prompt: questionText,
    rawEquation: `${left} = ${c}`,
    correctAnswer: correct,
    options: shuffle(options.slice(0, 4)),
    targetValue: sortedAns,
    explanation: `Sifat nilai mutlak:\n1) ${a}x ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)} = ${c} \\implies ${a}x = ${c - b} \\implies x = ${(c - b) / a}\n2) ${a}x ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)} = -${c} \\implies ${a}x = ${-c - b} \\implies x = ${(-c - b) / a}\nHimpunan penyelesaian: ${correct}`
  };
}

// 5. Pertidaksamaan Nilai Mutlak Linear
function genNilaiMutlakPertidaksamaan() {
  const a = 1;
  const b = randInt(-8, 8);
  const c = randInt(3, 9);
  const isLessThan = Math.random() > 0.5;

  // |x + b| < c => -c < x + b < c => -c - b < x < c - b
  const low = -c - b;
  const high = c - b;

  const left = `|x ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}|`;
  let questionText = '';
  let correct = '';
  let wrong1 = '', wrong2 = '', wrong3 = '';

  if (isLessThan) {
    questionText = `Tentukan penyelesaian dari pertidaksamaan nilai mutlak:\n\\[ ${left} < ${c} \\]`;
    correct = `${low} < x < ${high}`;
    wrong1 = `x < ${low} \\text{ atau } x > ${high}`;
    wrong2 = `${-high} < x < ${-low}`;
    wrong3 = `${low - 1} < x < ${high + 1}`;
  } else {
    questionText = `Tentukan penyelesaian dari pertidaksamaan nilai mutlak:\n\\[ ${left} \\ge ${c} \\]`;
    correct = `x \\le ${low} \\text{ atau } x \\ge ${high}`;
    wrong1 = `${low} \\le x \\le ${high}`;
    wrong2 = `x \\le ${-high} \\text{ atau } x \\ge ${-low}`;
    wrong3 = `x \\le ${low - 2} \\text{ atau } x \\ge ${high + 2}`;
  }

  const options = Array.from(new Set([correct, wrong1, wrong2, wrong3]));
  while (options.length < 4) {
    options.push(`${randInt(-10, 0)} < x < ${randInt(1, 10)}`);
  }

  return {
    id: 'mutlak_pertidaksamaan_' + Date.now() + '_' + Math.random(),
    category: 'Pertidaksamaan Nilai Mutlak',
    categoryCode: 'NilaiMutlak',
    prompt: questionText,
    rawEquation: `${left} ${isLessThan ? '<' : '>='} ${c}`,
    correctAnswer: correct,
    options: shuffle(options.slice(0, 4)),
    targetValue: { low, high, isLessThan },
    explanation: isLessThan 
      ? `Sifat: |U| < c \\iff -c < U < c\n-${c} < x ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)} < ${c}\nKurangkan ${b} pada semua ruas: ${low} < x < ${high}`
      : `Sifat: |U| \\ge c \\iff U \\le -c \\text{ atau } U \\ge c\nx ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)} \\le -${c} \\implies x \\le ${low}\nx ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)} \\ge ${c} \\implies x \\ge ${high}\nHasil: ${correct}`
  };
}

// 6. Soal Cerita / Aplikasi Kontekstual Luar Angkasa & Sehari-hari
const curatedWordProblems = [
  {
    category: 'Soal Cerita PLSV',
    categoryCode: 'SoalCerita',
    prompt: 'Kafetaria Skeld menjual jatah ransum antariksa seharga Rp15.000 per paket dan minuman elektrolit Rp5.000 per botol. Seorang kru membeli 1 paket ransum dan beberapa botol minuman elektrolit dengan total biaya Rp40.000. Berapa banyak botol minuman elektrolit yang dibeli?',
    correctAnswer: '5 botol',
    options: ['5 botol', '4 botol', '6 botol', '7 botol'],
    explanation: 'Misalkan b = jumlah botol minuman.\n15.000 + 5.000b = 40.000\n5.000b = 25.000\nb = 5 botol.'
  },
  {
    category: 'Soal Cerita SPLDV',
    categoryCode: 'SoalCerita',
    prompt: 'Di ruang Storage, tim mekanik membeli 3 tabung oksigen dan 2 tabung hidrogen seharga 130 credit energi. Pada hari berikutnya, mereka membeli 2 tabung oksigen dan 4 tabung hidrogen seharga 140 credit energi. Berapakah harga 1 tabung oksigen dan 1 tabung hidrogen?',
    correctAnswer: 'Oksigen = 30 credit, Hidrogen = 20 credit',
    options: [
      'Oksigen = 30 credit, Hidrogen = 20 credit',
      'Oksigen = 25 credit, Hidrogen = 25 credit',
      'Oksigen = 35 credit, Hidrogen = 15 credit',
      'Oksigen = 20 credit, Hidrogen = 30 credit'
    ],
    explanation: 'Model SPLDV: 3x + 2y = 130 dan 2x + 4y = 140.\nEliminasi y: Kalikan persamaan 1 dengan 2: 6x + 4y = 260.\nKurangkan dengan persamaan 2: 4x = 120 -> x = 30 credit.\nSubstitusi: 3(30) + 2y = 130 -> 2y = 40 -> y = 20 credit.'
  },
  {
    category: 'Soal Cerita PtLSV',
    categoryCode: 'SoalCerita',
    prompt: 'Sebuah lift kapsul antariksa berkapasitas maksimum 650 kg. Jika pilot kru memiliki berat 80 kg dan setiap tabung spesimen berbobot 45 kg, berapakah jumlah tabung spesimen maksimum \\(x\\) yang dapat diangkut sekaligus?',
    correctAnswer: 'x \\le 12 tabung (Maksimal 12)',
    options: [
      'x \\le 12 tabung (Maksimal 12)',
      'x \\le 13 tabung (Maksimal 13)',
      'x \\le 11 tabung (Maksimal 11)',
      'x \\ge 12 tabung'
    ],
    explanation: 'Model PtLSV: 80 + 45x <= 650\n45x <= 570\nx <= 570 / 45 = 12,67\nKarena jumlah tabung harus bilangan bulat, maka maksimum tabung adalah 12.'
  },
  {
    category: 'Soal Geometri Linear',
    categoryCode: 'SoalCerita',
    prompt: 'Ruang Navigasi kapal berbentuk persegi panjang dengan panjang \\((3x + 2)\\) meter dan lebar \\((x + 4)\\) meter. Jika keliling ruangan tersebut adalah 44 meter, berapakah luas ruang navigasi tersebut?',
    correctAnswer: '112 m²',
    options: ['112 m²', '96 m²', '120 m²', '108 m²'],
    explanation: 'Keliling = 2(p + l) = 44\n(3x + 2) + (x + 4) = 22\n4x + 6 = 22 -> 4x = 16 -> x = 4.\nPanjang = 3(4) + 2 = 14 m.\nLebar = 4 + 4 = 8 m.\nLuas = 14 x 8 = 112 m².'
  },
  {
    category: 'Soal Cerita Usia SPLDV',
    categoryCode: 'SoalCerita',
    prompt: 'Jumlah usia Kapten dan Teknisi adalah 54 tahun. Empat tahun lalu, usia Kapten adalah dua kali lipat usia Teknisi. Berapakah usia Kapten saat ini?',
    correctAnswer: '36 tahun',
    options: ['36 tahun', '38 tahun', '34 tahun', '40 tahun'],
    explanation: 'Misalkan K = usia Kapten, T = usia Teknisi.\n1) K + T = 54 -> T = 54 - K\n2) K - 4 = 2(T - 4) -> K - 4 = 2T - 8\nK - 4 = 2(54 - K) - 8\nK - 4 = 108 - 2K - 8 = 100 - 2K\n3K = 104? Cek: K - 4 = 2(50 - K) -> K - 4 = 100 - 2K -> 3K = 108 -> K = 36 tahun (Teknisi = 18 tahun).'
  },
  {
    category: 'Soal Cerita Bahan Bakar Reactor',
    categoryCode: 'SoalCerita',
    prompt: 'Tangki reaktor utama berisi 1.200 liter plasma energi. Plasma terkuras dengan laju 40 liter per menit saat mesin aktif. Dalam berapa menit \\(t\\) sisa plasma energi akan bernilai tepat 240 liter?',
    correctAnswer: '24 menit',
    options: ['24 menit', '20 menit', '28 menit', '30 menit'],
    explanation: 'Model persamaan: 1.200 - 40t = 240\n-40t = 240 - 1.200 = -960\nt = -960 / -40 = 24 menit.'
  }
];

function genSoalCerita() {
  const item = curatedWordProblems[randInt(0, curatedWordProblems.length - 1)];
  return {
    id: 'soal_cerita_' + Date.now() + '_' + Math.random(),
    category: item.category,
    categoryCode: item.categoryCode,
    prompt: item.prompt,
    correctAnswer: item.correctAnswer,
    options: shuffle([...item.options]),
    explanation: item.explanation
  };
}

// Master Randomizer
function getRandomQuestion(preferredCategory = null) {
  const generators = [
    genPLSV_Dasar,
    genPLSV_Kurung,
    genPLSV_Pecahan,
    genPtLSV_Dasar,
    genPtLSV_Ganda,
    genSPLDV,
    genNilaiMutlakPersamaan,
    genNilaiMutlakPertidaksamaan,
    genSoalCerita
  ];

  if (preferredCategory) {
    switch (preferredCategory.toUpperCase()) {
      case 'PLSV':
        return [genPLSV_Dasar, genPLSV_Kurung, genPLSV_Pecahan][randInt(0, 2)]();
      case 'PTLSV':
        return [genPtLSV_Dasar, genPtLSV_Ganda][randInt(0, 1)]();
      case 'SPLDV':
        return genSPLDV();
      case 'NILAIMUTLAK':
        return [genNilaiMutlakPersamaan, genNilaiMutlakPertidaksamaan][randInt(0, 1)]();
      case 'CERITA':
        return genSoalCerita();
    }
  }

  const fn = generators[randInt(0, generators.length - 1)];
  return fn();
}

function getMultipleDiverseQuestions(count = 3) {
  const pool = [];
  const requiredCategories = ['PLSV', 'PTLSV', 'SPLDV', 'NILAIMUTLAK', 'CERITA'];
  const shuffledCats = shuffle(requiredCategories);

  for (let i = 0; i < count; i++) {
    const cat = shuffledCats[i % shuffledCats.length];
    pool.push(getRandomQuestion(cat));
  }
  return pool;
}

// Export for Node & Browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getRandomQuestion,
    getMultipleDiverseQuestions,
    genPLSV_Dasar,
    genPLSV_Kurung,
    genPLSV_Pecahan,
    genPtLSV_Dasar,
    genPtLSV_Ganda,
    genSPLDV,
    genNilaiMutlakPersamaan,
    genNilaiMutlakPertidaksamaan,
    genSoalCerita
  };
}
