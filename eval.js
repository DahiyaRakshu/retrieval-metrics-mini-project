const fs = require('fs');

function loadTestSet(path) {
  const lines = fs.readFileSync(path, 'utf8').trim().split('\n').slice(1);
  return lines.map(line => {
    const [query, ids] = line.split(',');
    return { query, correctIds: ids.split(';').map(Number) };
  });
}

const testSet = loadTestSet('test-set.csv');
const results = JSON.parse(fs.readFileSync('search-results.json', 'utf8'));

function rankOf(rankedIds, correctIds) {
  const correct = new Set(correctIds.map(Number));
  const index = rankedIds.findIndex(id => correct.has(Number(id)));
  return index === -1 ? null : index + 1;
}

function reciprocalRank(rankedIds, correctIds) {
  const rank = rankOf(rankedIds, correctIds);
  return rank === null ? 0 : 1 / rank;
}

const keywordRRs = [];
const semanticRRs = [];
let keywordHits = 0;
let semanticHits = 0;

for (const { query, correctIds } of testSet) {
  const queryResults = results[query];
  if (!queryResults || !Array.isArray(queryResults.keyword) || !Array.isArray(queryResults.semantic)) {
    throw new Error('Missing ranked results for query: ' + query);
  }

  const keywordRR = reciprocalRank(queryResults.keyword, correctIds);
  const semanticRR = reciprocalRank(queryResults.semantic, correctIds);
  keywordRRs.push(keywordRR);
  semanticRRs.push(semanticRR);
  if (keywordRR > 0) keywordHits++;
  if (semanticRR > 0) semanticHits++;
}

const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const keywordMRR = mean(keywordRRs);
const semanticMRR = mean(semanticRRs);
const keywordRecall = keywordHits / testSet.length;
const semanticRecall = semanticHits / testSet.length;
const displayRank = rank => rank === null ? 'miss' : rank;

console.log('| Query | Keyword rank | Semantic rank |');
console.log('|---|---|---|');
for (const { query, correctIds } of testSet) {
  const queryResults = results[query];
  console.log('| ' + query + ' | ' + displayRank(rankOf(queryResults.keyword, correctIds)) + ' | ' + displayRank(rankOf(queryResults.semantic, correctIds)) + ' |');
}
console.log('| **Summary** | **MRR ' + keywordMRR.toFixed(2) + ' · Recall@10 ' + keywordRecall.toFixed(2) + '** | **MRR ' + semanticMRR.toFixed(2) + ' · Recall@10 ' + semanticRecall.toFixed(2) + '** |');
