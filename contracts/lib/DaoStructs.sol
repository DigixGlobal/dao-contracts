pragma solidity ^0.4.25;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

library DaoStructs {
    using DoublyLinkedList for DoublyLinkedList.Bytes;
    using SafeMath for uint256;
    bytes32 constant EMPTY_BYTES = bytes32(0x0);

    struct PrlAction {
        // UTC timestamp at which the PRL action was done
        uint256 at;

        // IPFS hash of the document summarizing the action
        bytes32 doc;

        // Type of action
        // check PRL_ACTION_* in "./../common/DaoConstants.sol"
        uint256 actionId;
    }

    struct Voting {
        // UTC timestamp at which the voting round starts
        uint256 startTime;

        // Mapping of whether a commit was used in this voting round
        mapping (bytes32 => bool) usedCommits;

        // Mapping of commits by address. These are the commits during the commit phase in a voting round
        // This only stores the most recent commit in the voting round
        // In case a vote is edited, the previous commit is overwritten by the new commit
        // Only this new commit is verified at the reveal phase
        mapping (address => bytes32) commits;

        // This mapping is updated after the reveal phase, when votes are revealed
        // It is a mapping of address to weight of vote
        // Weight implies the lockedDGDStake of the address, at the time of revealing
        // If the address voted "NO", or didn't vote, this would be 0
        mapping (address => uint256) yesVotes;

        // This mapping is updated after the reveal phase, when votes are revealed
        // It is a mapping of address to weight of vote
        // Weight implies the lockedDGDStake of the address, at the time of revealing
        // If the address voted "YES", or didn't vote, this would be 0
        mapping (address => uint256) noVotes;

        // Boolean whether the voting round passed or not
        bool passed;

        // Boolean whether the voting round results were claimed or not
        // refer the claimProposalVotingResult function in "./../interative/DaoVotingClaims.sol"
        bool claimed;

        // Boolean whether the milestone following this voting round was funded or not
        // The milestone is funded when the proposer calls claimFunding in "./../interactive/DaoFundingManager.sol"
        bool funded;
    }

    struct ProposalVersion {
        // IPFS doc hash of this version of the proposal
        bytes32 docIpfsHash;

        // UTC timestamp at which this version was created
        uint256 created;

        // The number of milestones in the proposal as per this version
        uint256 milestoneCount;

        // List of fundings required by the proposal as per this version
        // The numbers are in wei
        uint256[] milestoneFundings;

        // The final reward asked by the proposer for completion of the entire proposal
        uint256 finalReward;

        // When a proposal is finalized (calling Dao.finalizeProposal), the proposer can no longer add proposal versions
        // However, they can still add more details to this final proposal version, in the form of IPFS docs.
        // These IPFS docs are stored in this array
        bytes32[] moreDocs;
    }

    struct Proposal {
        // ID of the proposal. Also the IPFS hash of the first ProposalVersion
        bytes32 proposalId;

        // Address of the user who created the proposal
        address proposer;

        // Address of the moderator who endorsed the proposal
        address endorser;

        // current state of the proposal
        // refer PROPOSAL_STATE_* in "./../common/DaoConstants.sol"
        bytes32 currentState;

        // UTC timestamp at which the proposal was created
        uint256 timeCreated;

        // DoublyLinkedList of IPFS doc hashes of the various versions of the proposal
        DoublyLinkedList.Bytes proposalVersionDocs;

        // Mapping of version (IPFS doc hash) to ProposalVersion struct
        mapping (bytes32 => ProposalVersion) proposalVersions;

        // Voting struct for the draft voting round
        Voting draftVoting;

        // Mapping of voting round index (starts from 0) to Voting struct
        // votingRounds[0] is the Voting round of the proposal, which lasts for get_uint_config(CONFIG_VOTING_PHASE_TOTAL)
        // votingRounds[i] for i>0 are the Interim Voting rounds of the proposal, which lasts for get_uint_config(CONFIG_INTERIM_PHASE_TOTAL)
        mapping (uint256 => Voting) votingRounds;

        // Boolean whether the proposal is paused/stopped at the moment
        bool isPausedOrStopped;

        // Boolean whether the proposal was created by a founder role
        bool isDigix;

        // Every proposal has a collateral tied to it with a value of
        // get_uint_config(CONFIG_PREPROPOSAL_DEPOSIT) (refer "./../storage/DaoConfigsStorage.sol")
        // Collateral can be in different states
        // refer COLLATERAL_STATUS_* in "./../common/DaoConstants.sol"
        uint256 collateralStatus;
        uint256 collateralAmount;

        // The final version of the proposal
        // Every proposal needs to be finalized before it can be voted on
        // This is the IPFS doc hash of the final version
        bytes32 finalVersion;

        // List of PrlAction structs
        // These are all the actions done by the PRL on the proposal
        PrlAction[] prlActions;
    }

    function countVotes(Voting storage _voting, address[] memory _allUsers)
        public
        view
        returns (uint256 _for, uint256 _against)
    {
        uint256 _n = _allUsers.length;
        for (uint256 i = 0; i < _n; i++) {
            if (_voting.yesVotes[_allUsers[i]] > 0) {
                _for = _for.add(_voting.yesVotes[_allUsers[i]]);
            } else if (_voting.noVotes[_allUsers[i]] > 0) {
                _against = _against.add(_voting.noVotes[_allUsers[i]]);
            }
        }
    }

    // get the list of voters who voted _vote (true-yes/false-no)
    function listVotes(Voting storage _voting, address[] _allUsers, bool _vote)
        public
        view
        returns (address[] memory _voters, uint256 _length)
    {
        uint256 _n = _allUsers.length;
        uint256 i;
        _length = 0;
        _voters = new address[](_n);
        if (_vote == true) {
            for (i = 0; i < _n; i++) {
                if (_voting.yesVotes[_allUsers[i]] > 0) {
                    _voters[_length] = _allUsers[i];
                    _length++;
                }
            }
        } else {
            for (i = 0; i < _n; i++) {
                if (_voting.noVotes[_allUsers[i]] > 0) {
                    _voters[_length] = _allUsers[i];
                    _length++;
                }
            }
        }
    }

    function readVote(Voting storage _voting, address _voter)
        public
        view
        returns (bool _vote, uint256 _weight)
    {
        if (_voting.yesVotes[_voter] > 0) {
            _weight = _voting.yesVotes[_voter];
            _vote = true;
        } else {
            _weight = _voting.noVotes[_voter]; // if _voter didnt vote at all, the weight will be 0 anyway
            _vote = false;
        }
    }

    function revealVote(
        Voting storage _voting,
        address _voter,
        bool _vote,
        uint256 _weight
    )
        public
    {
        if (_vote) {
            _voting.yesVotes[_voter] = _weight;
        } else {
            _voting.noVotes[_voter] = _weight;
        }
    }

    function readVersion(ProposalVersion storage _version)
        public
        view
        returns (
            bytes32 _doc,
            uint256 _created,
            uint256[] _milestoneFundings,
            uint256 _finalReward
        )
    {
        _doc = _version.docIpfsHash;
        _created = _version.created;
        _milestoneFundings = _version.milestoneFundings;
        _finalReward = _version.finalReward;
    }

    // read the funding for a particular milestone of a finalized proposal
    // if _milestoneId is the same as _milestoneCount, it returns the final reward
    function readProposalMilestone(Proposal storage _proposal, uint256 _milestoneIndex)
        public
        view
        returns (uint256 _funding)
    {
        bytes32 _finalVersion = _proposal.finalVersion;
        uint256 _milestoneCount = _proposal.proposalVersions[_finalVersion].milestoneFundings.length;
        require(_milestoneIndex <= _milestoneCount);
        require(_finalVersion != EMPTY_BYTES); // the proposal must have been finalized

        if (_milestoneIndex < _milestoneCount) {
            _funding = _proposal.proposalVersions[_finalVersion].milestoneFundings[_milestoneIndex];
        } else {
            _funding = _proposal.proposalVersions[_finalVersion].finalReward;
        }
    }

    function addProposalVersion(
        Proposal storage _proposal,
        bytes32 _newDoc,
        uint256[] _newMilestoneFundings,
        uint256 _finalReward
    )
        public
    {
        _proposal.proposalVersionDocs.append(_newDoc);
        _proposal.proposalVersions[_newDoc].docIpfsHash = _newDoc;
        _proposal.proposalVersions[_newDoc].created = now;
        _proposal.proposalVersions[_newDoc].milestoneCount = _newMilestoneFundings.length;
        _proposal.proposalVersions[_newDoc].milestoneFundings = _newMilestoneFundings;
        _proposal.proposalVersions[_newDoc].finalReward = _finalReward;
    }

    struct SpecialProposal {
        // ID of the special proposal
        // This is the IPFS doc hash of the proposal
        bytes32 proposalId;

        // Address of the user who created the special proposal
        // This address should also be in the ROLES_FOUNDERS group
        // refer "./../storage/DaoIdentityStorage.sol"
        address proposer;

        // UTC timestamp at which the proposal was created
        uint256 timeCreated;

        // Voting struct for the special proposal
        Voting voting;

        // List of the new uint256 configs as per the special proposal
        uint256[] uintConfigs;

        // List of the new address configs as per the special proposal
        address[] addressConfigs;

        // List of the new bytes32 configs as per the special proposal
        bytes32[] bytesConfigs;
    }

    // All configs are as per the DaoConfigsStorage values at the time when
    // calculateGlobalRewardsBeforeNewQuarter is called by founder in that quarter
    struct DaoQuarterInfo {
        // The minimum quarter points required
        // below this, reputation will be deducted
        uint256 minimalParticipationPoint;

        // The scaling factor for quarter point
        uint256 quarterPointScalingFactor;

        // The scaling factor for reputation point
        uint256 reputationPointScalingFactor;

        // The summation of effectiveDGDs in the previous quarter
        // The effectiveDGDs represents the effective participation in DigixDAO in a quarter
        // Which depends on lockedDGDStake, quarter point and reputation point
        // This value is the summation of all participant effectiveDGDs
        // It will be used to calculate the fraction of effectiveDGD a user has,
        // which will determine his portion of DGX rewards for that quarter
        uint256 totalEffectiveDGDPreviousQuarter;

        // The minimum moderator quarter point required
        // below this, reputation will be deducted for moderators
        uint256 moderatorMinimalParticipationPoint;

        // the scaling factor for moderator quarter point
        uint256 moderatorQuarterPointScalingFactor;

        // the scaling factor for moderator reputation point
        uint256 moderatorReputationPointScalingFactor;

        // The summation of effectiveDGDs (only specific to moderators)
        uint256 totalEffectiveModeratorDGDLastQuarter;

        // UTC timestamp from which the DGX rewards for the previous quarter are distributable to Holders
        uint256 dgxDistributionDay;

        // This is the rewards pool for the previous quarter. This is the sum of the DGX fees coming in from the collector, and the demurrage that has incurred
        // when user call claimRewards() in the previous quarter.
        // more graphical explanation: https://ipfs.io/ipfs/QmZDgFFMbyF3dvuuDfoXv5F6orq4kaDPo7m3QvnseUguzo
        uint256 dgxRewardsPoolLastQuarter;

        // The summation of all dgxRewardsPoolLastQuarter up until this quarter
        uint256 sumRewardsFromBeginning;
    }

    // There are many function calls where all calculations/summations cannot be done in one transaction
    // and require multiple transactions.
    // This struct stores the intermediate results in between the calculating transactions
    // These intermediate results are stored in IntermediateResultsStorage
    struct IntermediateResults {
        // Address of user until which the calculation has been done
        address countedUntil;

        // weight of "FOR" votes counted up until the current calculation step
        uint256 currentForCount;

        // weight of "AGAINST" votes counted up until the current calculation step
        uint256 currentAgainstCount;

        // summation of effectiveDGDs up until the iteration of calculation
        uint256 currentSumOfEffectiveBalance;
    }
}
