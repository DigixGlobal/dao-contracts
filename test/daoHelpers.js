const assert = require('assert');

const proposalStates = function (bN) {
  return {
    PROPOSAL_STATE_PREPROPOSAL: bN(1),
    PROPOSAL_STATE_INITIAL: bN(2),
    PROPOSAL_STATE_VETTED: bN(3),
    PROPOSAL_STATE_FUNDED: bN(4),
  };
};

const configs = function (bN) {
  return {
    CONFIG_MINIMUM_LOCKED_DGD: bN(10 ** 18),
  };
};

const roles = function (bN) {
  return {
    FOUNDERS: bN(2),
    PRLS: bN(3),
    KYC_ADMINS: bN(4),
  };
};

const phases = {
  LOCKING_PHASE: 1,
  MAIN_PHASE: 2,
};

const quarters = {
  QUARTER_1: 1,
  QUARTER_2: 2,
  QUARTER_3: 3,
};

const assertQuarter = function (timeNow, startOfDao, lockingPhaseDuration, quarterDuration, quarterId) {
  const quarterNow = Math.floor((timeNow - startOfDao) / quarterDuration) + 1;
  assert.strictEqual(quarterId, quarterNow);
};

// Locking phase : 1
// Main phase : 2
const getPhase = function (timeNow, startOfDao, lockingPhaseDuration, quarterDuration) {
  let phaseNow;
  if (((timeNow - startOfDao) % quarterDuration) < lockingPhaseDuration) {
    phaseNow = phases.LOCKING_PHASE;
  } else {
    phaseNow = phases.MAIN_PHASE;
  }
  return phaseNow;
};

const getTimeToNextPhase = function (timeNow, startOfDao, lockingPhaseDuration, quarterDuration) {
  const currentPhase = getPhase(timeNow, startOfDao, lockingPhaseDuration, quarterDuration);
  let timeToNextPhase;
  if (currentPhase === phases.LOCKING_PHASE) {
    timeToNextPhase = lockingPhaseDuration - ((timeNow - startOfDao) % quarterDuration);
  } else {
    timeToNextPhase = quarterDuration - ((timeNow - startOfDao) % quarterDuration);
  }
  return timeToNextPhase;
};

const daoConstantsKeys = function () {
  return {
    CONFIG_LOCKING_PHASE_DURATION: 'locking_phase_duration',
    CONFIG_QUARTER_DURATION: 'quarter_duration',
    CONFIG_VOTING_COMMIT_PHASE: 'voting_commit_phase',
    CONFIG_VOTING_PHASE_TOTAL: 'voting_phase_total',
    CONFIG_INTERIM_COMMIT_PHASE: 'interim_voting_commit_phase',
    CONFIG_INTERIM_PHASE_TOTAL: 'interim_voting_phase_total',
    CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR: 'draft_quorum_fixed_numerator',
    CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR: 'draft_quorum_fixed_denominator',
    CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR: 'draft_quorum_sfactor_numerator',
    CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR: 'draft_quorum_sfactor_denominator',
    CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR: 'vote_quorum_fixed_numerator',
    CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR: 'vote_quorum_fixed_denominator',
    CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR: 'vote_quorum_sfactor_numerator',
    CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR: 'vote_quorum_sfactor_denominator',
    CONFIG_DRAFT_QUOTA_NUMERATOR: 'draft_quota_numerator',
    CONFIG_DRAFT_QUOTA_DENOMINATOR: 'draft_quota_denominator',
    CONFIG_VOTING_QUOTA_NUMERATOR: 'voting_quota_numerator',
    CONFIG_VOTING_QUOTA_DENOMINATOR: 'voting_quota_denominator',
    QUARTER_POINT_DRAFT_VOTE: 'quarter_point_draft_vote',
    QUARTER_POINT_VOTE: 'quarter_point_vote',
    QUARTER_POINT_INTERIM_VOTE: 'quarter_point_interim_vote',
    QUARTER_POINT_MILESTONE_COMPLETION: 'q_p_milestone_completion',
    CONFIG_MINIMAL_PARTICIPATION_POINT: 'CONFIG_MINIMAL_PARTICIPATION_POINT',
    CONFIG_MINIMAL_BADGE_PARTICIPATION_POINT: 'CONFIG_MINIMAL_B_QP',
    SPECIAL_PROPOSAL_COMMIT_PHASE: 'special_proposal_commit_phase',
    SPECIAL_PROPOSAL_PHASE_TOTAL: 'special_proposal_phase_total',
  };
};

const daoConstantsValues = function (bN) {
  return {
    CONFIG_LOCKING_PHASE_DURATION: bN(864000),
    CONFIG_QUARTER_DURATION: bN(7776000),
    CONFIG_VOTING_COMMIT_PHASE: bN(1814400),
    CONFIG_VOTING_PHASE_TOTAL: bN(2419200),
    CONFIG_INTERIM_COMMIT_PHASE: bN(604800),
    CONFIG_INTERIM_PHASE_TOTAL: bN(864000),
    CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR: bN(20),
    CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR: bN(100),
    CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR: bN(60),
    CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR: bN(100),
    CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR: bN(20),
    CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR: bN(100),
    CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR: bN(60),
    CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR: bN(100),
    CONFIG_DRAFT_QUOTA_NUMERATOR: bN(30),
    CONFIG_DRAFT_QUOTA_DENOMINATOR: bN(100),
    CONFIG_VOTING_QUOTA_NUMERATOR: bN(30),
    CONFIG_VOTING_QUOTA_DENOMINATOR: bN(100),
    QUARTER_POINT_DRAFT_VOTE: bN(1),
    QUARTER_POINT_VOTE: bN(1),
    QUARTER_POINT_INTERIM_VOTE: bN(1),
    CONFIG_MINIMAL_PARTICIPATION_POINT: bN(3),
  };
};

const max = function (list) {
  let max = -1;
  for (const item of list) {
    if (item > max) max = item;
  }
  return max;
};

const timeLags = function () {
  return {
    ONE_SECOND_TIME_LAG: 1000,
  };
};

const sampleBadgeWeights = function (bN) {
  return [bN(10), bN(20), bN(30), bN(44)];
};

const sampleStakeWeights = function (bN) {
  return [
    bN(55 * (10 ** 18)),
    bN(120 * (10 ** 18)),
    bN(150 * (10 ** 18)),
    bN(175 * (10 ** 18)),
    bN(32 * (10 ** 18)),
    bN(41 * (10 ** 18)),
    bN(40 * (10 ** 18)),
    bN(30 * (10 ** 18)),
    bN(20 * (10 ** 18)),
    bN(46 * (10 ** 18)),
  ];
};

const EMPTY_BYTES = '0x0000000000000000000000000000000000000000000000000000000000000000';
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

module.exports = {
  proposalStates,
  configs,
  roles,
  daoConstantsKeys,
  daoConstantsValues,
  timeLags,
  sampleBadgeWeights,
  sampleStakeWeights,
  phases,
  quarters,
  getPhase,
  getTimeToNextPhase,
  assertQuarter,
  max,
  EMPTY_BYTES,
  EMPTY_ADDRESS,
};
