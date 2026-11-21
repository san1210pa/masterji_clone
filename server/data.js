export const seed = {
  JEE: { full: 'Joint Entrance Examination', target: 'JEE Main 2027', rank: 'Top 8%', progress: 68, subjects: [{ name: 'Physics', done: 18, total: 24 }, { name: 'Chemistry', done: 14, total: 20 }, { name: 'Mathematics', done: 16, total: 26 }], tasks: [{ time: '09:00', title: 'Electrostatics · Practice set', tag: 'Physics', done: true }, { time: '11:30', title: 'Chemical bonding · Revision', tag: 'Chemistry', done: false }, { time: '16:00', title: 'Limits & continuity · 25 Qs', tag: 'Mathematics', done: false }] },
  NEET: { full: 'National Eligibility cum Entrance Test', target: 'NEET UG 2027', rank: 'Top 12%', progress: 61, subjects: [{ name: 'Physics', done: 15, total: 24 }, { name: 'Chemistry', done: 16, total: 22 }, { name: 'Biology', done: 22, total: 30 }], tasks: [{ time: '09:00', title: 'Human physiology · NCERT read', tag: 'Biology', done: true }, { time: '11:30', title: 'Chemical bonding · Revision', tag: 'Chemistry', done: false }, { time: '16:00', title: 'Ray optics · 25 Qs', tag: 'Physics', done: false }] },
  UPSC: { full: 'Union Public Service Commission', target: 'UPSC CSE 2027', rank: 'On track', progress: 47, subjects: [{ name: 'Polity', done: 12, total: 20 }, { name: 'History', done: 14, total: 24 }, { name: 'Geography', done: 10, total: 22 }], tasks: [{ time: '09:00', title: 'Fundamental rights · Revision', tag: 'Polity', done: true }, { time: '11:30', title: 'Modern India · Spectrum notes', tag: 'History', done: false }, { time: '16:00', title: 'Monsoon system · Map work', tag: 'Geography', done: false }] },
  SSC: { full: 'Staff Selection Commission', target: 'SSC CGL 2027', rank: 'Top 15%', progress: 56, subjects: [{ name: 'Quantitative Aptitude', done: 17, total: 28 }, { name: 'Reasoning', done: 19, total: 26 }, { name: 'English', done: 14, total: 20 }], tasks: [{ time: '09:00', title: 'Percentage · Timed practice', tag: 'Quant', done: true }, { time: '11:30', title: 'Coding-decoding · 20 Qs', tag: 'Reasoning', done: false }, { time: '16:00', title: 'Spot the error · Revision', tag: 'English', done: false }] }
};

export const resources = [
  { title: 'Previous year questions', type: 'Practice', description: 'Chapter-wise past papers and solutions' },
  { title: 'Mock test series', type: 'Tests', description: 'Full length practice tests' },
  { title: 'Short notes', type: 'Revision', description: 'Quick revision notes' },
  { title: 'Important questions', type: 'Practice', description: 'High priority questions' },
  { title: 'Chapter weightage', type: 'Insights', description: 'Subject and chapter analysis' },
  { title: 'Formula sheet', type: 'Revision', description: 'Essential formulas' }
];
