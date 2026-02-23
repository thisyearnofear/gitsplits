const assert = require('node:assert/strict');

const {
  buildDefaultContributorsWithQuality,
  buildQualityScoreDecisionMap,
} = require('../dist/intents/create.js');

function run() {
  {
    const decisions = buildQualityScoreDecisionMap([
      {
        username: 'ALICE',
        quality: 0.75,
        commitConfidence: 0.8,
        creditAction: 'partial_credit',
        reasons: [],
      },
    ]);
    assert.equal(decisions.get('alice').quality, 0.75);
    assert.equal(decisions.get('alice').creditAction, 'partial_credit');
  }

  {
    const result = buildDefaultContributorsWithQuality(
      [
        { username: 'Alice', percentage: 60 },
        { username: 'Bob', percentage: 40 },
      ],
      [
        {
          username: 'alice',
          quality: 0.9,
          commitConfidence: 0.9,
          creditAction: 'no_credit',
          reasons: ['flagged'],
        },
      ]
    );
    assert.deepEqual(result, [{ github_username: 'Bob', percentage: 100 }]);
  }

  {
    const result = buildDefaultContributorsWithQuality(
      [
        { username: 'Quincybob', percentage: 50 },
        { username: 'thisyearnofear', percentage: 50 },
      ],
      [
        {
          username: 'quincybob',
          quality: 0.2,
          commitConfidence: 0.2,
          creditAction: 'partial_credit',
          reasons: [],
        },
        {
          username: 'THISYEARNOFEAR',
          quality: 0.8,
          commitConfidence: 0.8,
          creditAction: 'full_credit',
          reasons: [],
        },
      ]
    );

    assert.deepEqual(result, [
      { github_username: 'Quincybob', percentage: 20 },
      { github_username: 'thisyearnofear', percentage: 80 },
    ]);
  }

  {
    const result = buildDefaultContributorsWithQuality(
      [
        { username: 'Alice', percentage: 70 },
        { username: 'Bob', percentage: 30 },
      ],
      [
        {
          username: 'alice',
          quality: 0.1,
          commitConfidence: 0.1,
          creditAction: 'no_credit',
          reasons: [],
        },
        {
          username: 'bob',
          quality: 0.2,
          commitConfidence: 0.2,
          creditAction: 'no_credit',
          reasons: [],
        },
      ]
    );

    assert.deepEqual(result, [
      { github_username: 'Alice', percentage: 70 },
      { github_username: 'Bob', percentage: 30 },
    ]);
  }
}

run();
console.log('create allocation quality tests passed');
