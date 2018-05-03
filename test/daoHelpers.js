const proposalStates = function (bN) {
  return {
    PROPOSAL_STATE_PREPROPOSAL : bN(1),
    PROPOSAL_STATE_INITIAL : bN(2),
    PROPOSAL_STATE_VETTED : bN(3),
    PROPOSAL_STATE_FUNDED : bN(4)
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

module.exports = {
  proposalStates,
  timeLags,
  sampleBadgeWeights,
  sampleStakeWeights,
  EMPTY_BYTES,
};
