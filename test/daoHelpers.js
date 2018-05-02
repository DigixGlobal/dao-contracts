const proposalStates = function (bN) {
  return {
    PROPOSAL_STATE_PREPROPOSAL : bN(1),
    PROPOSAL_STATE_INITIAL : bN(2),
    PROPOSAL_STATE_VETTED : bN(3),
    PROPOSAL_STATE_FUNDED : bN(4)
  }
}

module.exports = {
  proposalStates
};
