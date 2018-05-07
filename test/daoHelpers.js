const proposalStates = function (bN) {
  return {
    PROPOSAL_STATE_PREPROPOSAL : bN(1),
    PROPOSAL_STATE_INITIAL : bN(2),
    PROPOSAL_STATE_VETTED : bN(3),
    PROPOSAL_STATE_FUNDED : bN(4)
  }
}

const roles = function (bN) {
  return {
    FOUNDERS : bN(2),
    PRLS : bN(3),
    KYC_ADMINS : bN(4)
  }
}

const daoConstantsKeys = function () {
  return {
    CONFIG_LOCKING_PHASE_DURATION : 'locking_phase_duration',
    CONFIG_QUARTER_DURATION : 'quarter_duration',
    CONFIG_VOTING_COMMIT_PHASE : 'voting_commit_phase',
    CONFIG_VOTING_PHASE_TOTAL : 'voting_phase_total',
    CONFIG_INTERIM_COMMIT_PHASE : 'interim_voting_commit_phase',
    CONFIG_INTERIM_PHASE_TOTAL : 'interim_voting_phase_total',
    CONFIG_QUORUM_FIXED_PORTION_NUMERATOR : 'quorum_fixed_quorum_numerator',
    CONFIG_QUORUM_FIXED_PORTION_DENOMINATOR : 'quorum_fixed_quorum_denominator',
    CONFIG_QUORUM_SCALING_FACTOR_NUMERATOR : 'quorum_sfactor_numerator',
    CONFIG_QUORUM_SCALING_FACTOR_DENOMINATOR : 'quorum_sfactor_denominator',
    CONFIG_DRAFT_QUOTA_NUMERATOR : 'draft_quota_numerator',
    CONFIG_DRAFT_QUOTA_DENOMINATOR : 'draft_quota_denominator',
    CONFIG_VOTING_QUOTA_NUMERATOR : 'voting_quota_numerator',
    CONFIG_VOTING_QUOTA_DENOMINATOR : 'voting_quota_denominator'
  }
}

const daoConstantsValues = function (bN) {
  return {
    CONFIG_LOCKING_PHASE_DURATION : bN(864000),
    CONFIG_QUARTER_DURATION : bN(7776000),
    CONFIG_VOTING_COMMIT_PHASE : bN(1814400),
    CONFIG_VOTING_PHASE_TOTAL : bN(2419200),
    CONFIG_INTERIM_COMMIT_PHASE : bN(604800),
    CONFIG_INTERIM_PHASE_TOTAL : bN(864000),
    CONFIG_QUORUM_FIXED_PORTION_NUMERATOR : bN(20),
    CONFIG_QUORUM_FIXED_PORTION_DENOMINATOR : bN(100),
    CONFIG_QUORUM_SCALING_FACTOR_NUMERATOR : bN(60),
    CONFIG_QUORUM_SCALING_FACTOR_DENOMINATOR : bN(100),
    CONFIG_DRAFT_QUOTA_NUMERATOR : bN(30),
    CONFIG_DRAFT_QUOTA_DENOMINATOR : bN(100),
    CONFIG_VOTING_QUOTA_NUMERATOR : bN(30),
    CONFIG_VOTING_QUOTA_DENOMINATOR :bN(100)
  }
}

const timeLags = function () {
  return {
    ONE_SECOND_TIME_LAG : 1000
  }
}

const sampleBadgeWeights = function (bN) {
  return {
    badgeHolder1 : bN(1),
    badgeHolder2 : bN(2),
    badgeHolder3 : bN(3),
    badgeHolder4 : bN(4)
  }
}

const sampleStakeWeights = function (bN) {
  return {
    badgeHolder1 : bN(55),
    badgeHolder2 : bN(120),
    badgeHolder3 : bN(150),
    badgeHolder4 : bN(175),
    dgdHolder1   : bN(32),
    dgdHolder2   : bN(41),
    dgdHolder3   : bN(40),
    dgdHolder4   : bN(30),
    dgdHolder5   : bN(20),
    dgdHolder6   : bN(46)
  }
}

const EMPTY_BYTES = '0x0000000000000000000000000000000000000000000000000000000000000000';
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

module.exports = {
  proposalStates,
  roles,
  daoConstantsKeys,
  daoConstantsValues,
  timeLags,
  sampleBadgeWeights,
  sampleStakeWeights,
  EMPTY_BYTES,
  EMPTY_ADDRESS,
};
