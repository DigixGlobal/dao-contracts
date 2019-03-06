const {
  indexRange,
  encodeHash,
  randomBytes32,
  randomBigNumber,
  randomBigNumbers,
} = require('@digix/helpers/lib/helpers');

const dijixUtil = require('../dijixUtil');

const BADGE_HOLDER_COUNT = 4;
const DGD_HOLDER_COUNT = 6;

const proposalStates = {
  IDEA: 'idea',
  ENDORSED: 'endorsed',
  DRAFT: 'draft',
  PROPOSAL: 'proposal',
  ONGOING: 'ongoing',
  REVIEW: 'review',
};

const getAccountsAndAddressOf = (accounts, addressOf) => {
  const addressOfTemp = {
    root: accounts[0],
    prl: accounts[1],
    kycadmin: accounts[2],
    founderBadgeHolder: accounts[3],
    badgeHolders: indexRange(4, 4 + BADGE_HOLDER_COUNT).map(id => accounts[id]), // accounts[4] to accounts[7]
    dgdHolders: indexRange(4 + BADGE_HOLDER_COUNT, 4 + BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT).map(id => accounts[id]), // accounts[8] to accounts[13]
    allParticipants: indexRange(4, 4 + BADGE_HOLDER_COUNT + DGD_HOLDER_COUNT).map(id => accounts[id]), // accounts[4] to accounts[13]
    multiSigUsers: indexRange(16, 19).map(id => accounts[id]), // accounts[16], accounts[17] and accounts[18]
  };
  for (const key in addressOfTemp) addressOf[key] = addressOfTemp[key];
};

const uploadAttestation = async (
  newProposal,
  bN,
  addressOf,
  proposer = addressOf.dgdHolders[0],
  endorser = addressOf.badgeHoldes[0],
) => {
  const doc = await dijixUtil.getDijix()
    .create('attestation', {
      attestation: newProposal,
      proofs: [
        { type: 'image', src: `${__dirname}/../../static/images/1.jpg` },
      ],
    });
  return _getProposalStruct(
    bN,
    proposer,
    endorser,
    [{
      versionId: encodeHash(doc.ipfsHash),
      milestoneFundings: [bN(2 * (10 ** 18)), bN(3 * (10 ** 18))],
      finalReward: bN(1 * (10 ** 18)),
    }],
  );
};

const _getProposalStruct = (bN, proposer, endorser, versions, generateRandom = false) => {
  if (generateRandom) {
    versions = [];
    for (let i = 0; i < 3; i++) {
      versions.push({
        versionId: randomBytes32(),
        milestoneCount: 3,
        milestoneFundings: randomBigNumbers(bN, 3, 20),
        milestoneDurations: randomBigNumbers(bN, 3, 1000),
        finalReward: randomBigNumber(bN, 20),
      });
    }
  }
  return {
    id: versions[0].versionId,
    proposer,
    endorser,
    versions,
  };
};

module.exports = {
  getAccountsAndAddressOf,
  uploadAttestation,
  proposalStates,
};
