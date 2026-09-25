import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSections, chunkSections, detectCode, clauseLabel } from '../server/chunker.js';
import { BM25, tokenize } from '../server/bm25.js';

const SAMPLE = `IS 11639 (Part 1) : 1986
5 DESIGN CRITERIA
5.1 General
The penstock shall be designed for the internal pressure.
5.2 Shell Thickness
The minimum thickness shall be computed from hoop stress with corrosion allowance.
6 SUPPORTS
6.1 Saddle Supports
Saddles shall be spaced to limit beam stresses.`;

test('detectCode finds IS code with part and year', () => {
  assert.equal(detectCode(SAMPLE), 'IS 11639 (Part 1):1986');
  assert.equal(detectCode('as per IS 4622'), 'IS 4622');
  assert.equal(detectCode('no code here'), null);
});

test('toSections keeps clause numbers and heading path', () => {
  const secs = toSections([{ page: 3, text: SAMPLE }]);
  const s52 = secs.find((s) => s.clause === '5.2');
  assert.ok(s52);
  assert.equal(s52.page, 3);
  assert.deepEqual(s52.path, ['5 DESIGN CRITERIA', '5.2 Shell Thickness']);
});

test('chunkSections merges small clauses within the same top clause only', () => {
  const chunks = chunkSections(toSections([{ page: 1, text: SAMPLE }]), { size: 1000, overlap: 50 });
  const c5 = chunks.find((c) => c.clauses.includes('5.2'));
  assert.ok(c5.clauses.includes('5.1'));
  assert.ok(!c5.clauses.includes('6.1'));
  assert.equal(clauseLabel(['5', '5.1', '5.2']), '5–5.2');
});

test('chunkSections splits long sections', () => {
  const long = '7.1 Long clause\n' + 'Water hammer pressure rise is significant. '.repeat(100);
  const chunks = chunkSections(toSections([{ page: 1, text: long }]), { size: 500, overlap: 50 });
  assert.ok(chunks.length > 3);
  assert.ok(chunks.every((c) => c.text.length <= 500));
});

test('tokenize keeps clause numbers and drops stopwords', () => {
  assert.deepEqual(tokenize('What is clause 5.2.1 of the penstocks?'), ['clause', '5.2.1', 'penstock']);
});

test('BM25 ranks relevant document first and supports synonyms', () => {
  const idx = new BM25();
  idx.add('a', 'fixed wheel gate skin plate thickness and horizontal girder deflection');
  idx.add('b', 'penstock shell thickness hoop stress corrosion allowance');
  idx.add('c', 'trash rack bar vibration vortex shedding');
  assert.equal(idx.search('penstock thickness')[0].id, 'b');
  assert.equal(idx.search('trashrack vibration')[0].id, 'c');
  idx.remove('b');
  assert.ok(!idx.search('penstock thickness').some((r) => r.id === 'b'));
});
