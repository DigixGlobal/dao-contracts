pragma solidity ^0.4.23;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

library DaoStructs {
    using DoublyLinkedList for DoublyLinkedList.Bytes;
    using SafeMath for uint256;

    struct PrlAction {
        uint256 at;
        bytes32 doc;
        uint256 actionId;
    }

    struct Voting {
        uint256 startTime;
        mapping (bytes32 => bool) usedCommits;
        mapping (address => bytes32) commits;
        mapping (address => uint256) yesVotes;
        mapping (address => uint256) noVotes;
        bool passed;
        bool claimed;
        bool funded;
    }

    struct ProposalVersion {
        bytes32 docIpfsHash;
        uint256 created;
        uint256 milestoneCount;
        uint256[] milestoneFundings;
        uint256 finalReward;
        bytes32[] moreDocs;
    }

    // Each Proposal can have different versions.
    struct Proposal {
        // This is a bytes32 that is used to identify proposals
        // It is also the docIpfsHash of the first ProposalVersion
        bytes32 proposalId;
        address proposer;
        address endorser;
        bytes32 currentState;
        uint256 timeCreated;
        DoublyLinkedList.Bytes proposalVersionDocs;
        mapping (bytes32 => ProposalVersion) proposalVersions;
        Voting draftVoting;
        mapping (uint256 => Voting) votingRounds;
        bool isPaused;
        bool isDigix;
        uint256 collateralStatus;
        bytes32 finalVersion;
        PrlAction[] prlActions;
    }

    function countVotes(Voting storage _voting, address[] memory _allUsers)
        public
        constant
        returns (uint256 _for, uint256 _against, uint256 _quorum)
    {
        uint256 _n = _allUsers.length;
        for (uint256 i = 0; i < _n; i++) {
            if (_voting.yesVotes[_allUsers[i]] > 0) {
                _for = _for.add(_voting.yesVotes[_allUsers[i]]);
            } else if (_voting.noVotes[_allUsers[i]] > 0) {
                _against = _against.add(_voting.noVotes[_allUsers[i]]);
            }
        }
        _quorum = _for.add(_against);
    }

    function listVotes(Voting storage _voting, address[] _allUsers, bool _vote)
        public
        constant
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
        constant
        returns (bool _vote, uint256 _weight)
    {
        if (_voting.yesVotes[_voter] > 0) {
            _weight = _voting.yesVotes[_voter];
            _vote = true;
        } else {
            _weight = _voting.noVotes[_voter];
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
        constant
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

    function readProposalMilestone(Proposal storage _proposal, uint256 _milestoneIndex)
        public
        constant
        returns (uint256 _milestoneId, uint256 _funding)
    {
        require(_milestoneIndex >= 0);
        bytes32 _finalVersion = _proposal.finalVersion;
        if (_milestoneIndex < _proposal.proposalVersions[_finalVersion].milestoneFundings.length) {
            _milestoneId = _milestoneIndex;
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
        bytes32 proposalId;
        address proposer;
        uint256 timeCreated;
        Voting voting;
        uint256[] uintConfigs;
        address[] addressConfigs;
        bytes32[] bytesConfigs;
    }

    struct DaoQuarterInfo {
        uint256 minimalParticipationPoint;
        uint256 quarterPointScalingFactor;
        uint256 reputationPointScalingFactor;
        uint256 totalEffectiveDGDLastQuarter;

        uint256 moderatorMinimalParticipationPoint;
        uint256 moderatorQuarterPointScalingFactor;
        uint256 moderatorReputationPointScalingFactor;
        uint256 totalEffectiveModeratorDGDLastQuarter;

        uint256 dgxDistributionDay; // the timestamp when DGX rewards is distributable to Holders
        uint256 dgxRewardsPoolLastQuarter;
        uint256 sumRewardsFromBeginning;
        mapping (address => uint256) reputationPoint;
    }

    struct IntermediateResults {
        address countedUntil;
        uint256 currentForCount;
        uint256 currentAgainstCount;
        uint256 currentQuorum;

        uint256 currentSumOfEffectiveBalance;
    }
}
