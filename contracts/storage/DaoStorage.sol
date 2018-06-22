pragma solidity ^0.4.19;

import "@digix/solidity-collections/contracts/abstract/BytesIteratorStorage.sol";
import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";
import "../lib/DaoStructs.sol";

contract DaoStorage is ResolverClient, DaoConstants, BytesIteratorStorage {
    using DoublyLinkedList for DoublyLinkedList.Bytes;
    using DaoStructs for DaoStructs.Voting;
    using DaoStructs for DaoStructs.Proposal;
    using DaoStructs for DaoStructs.ProposalVersion;

    bool public isReplacedByNewDao;
    address public newDaoContract;
    address public newDaoFundingManager;

    DoublyLinkedList.Bytes allProposals;
    mapping (bytes32 => DaoStructs.Proposal) proposalsById;
    mapping (uint256 => DoublyLinkedList.Bytes) proposalsByState;
    uint256 public startOfFirstQuarter;

    function DaoStorage(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO, _resolver));
    }

    function setStartOfFirstQuarter(uint256 _start)
        if_sender_is(CONTRACT_DAO)
        public
    {
        require(startOfFirstQuarter == 0);
        startOfFirstQuarter = _start;
    }

    function updateForDaoMigration(address _newDaoFundingManager, address _newDaoContract)
        if_sender_is(CONTRACT_DAO)
        public
    {
      isReplacedByNewDao = true;
      newDaoContract = _newDaoContract;
      newDaoFundingManager = _newDaoFundingManager;
    }

    /////////////////////////////// READ FUNCTIONS //////////////////////////////

    /// @notice read all information and details of proposal
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc Proposal ID, i.e. hash of IPFS doc
    /// return {
    ///   "_doc": "",
    ///   "_proposer": "",
    ///   "_endorser": "",
    ///   "_state": "",
    ///   "_timeCreated": "",
    ///   "_nVersions": "",
    ///   "_latestVersionDoc": ""
    /// }
    function readProposal(bytes32 _proposalId)
        public
        constant
        returns (
            bytes32 _doc,
            address _proposer,
            address _endorser,
            uint256 _state,
            uint256 _timeCreated,
            uint256 _nVersions,
            bytes32 _latestVersionDoc
        )
    {
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        _doc = _proposal.proposalId;
        _proposer = _proposal.proposer;
        _endorser = _proposal.endorser;
        _state = _proposal.currentState;
        _timeCreated = _proposal.timeCreated;
        _nVersions = read_total_bytesarray(_proposal.proposalVersionDocs);
        _latestVersionDoc = read_last_from_bytesarray(_proposal.proposalVersionDocs);
    }

    /// @notice returns the current state of a proposal
    /// @param _proposalId proposal ID
    /// @return {
    ///   "_stateId": ""
    /// }
    function readProposalState(bytes32 _proposalId)
        public
        constant
        returns (uint256 _stateId)
    {
        _stateId = proposalsById[_proposalId].currentState;
    }

    function readProposalProposer(bytes32 _proposalId)
        public
        constant
        returns (address _proposer)
    {
        _proposer = proposalsById[_proposalId].proposer;
    }

    function readFinalVersion(bytes32 _proposalId)
        public
        constant
        returns (bytes32 _finalVersion)
    {
        _finalVersion = proposalsById[_proposalId].finalVersion;
    }

    function readProposalPRL(bytes32 _proposalId, uint256 _index)
        public
        constant
        returns (bool _valid)
    {
        if (_index == 0) {
            _valid = proposalsById[_proposalId].votingRound.prlValid;
        } else {
            _valid = proposalsById[_proposalId].interimRounds[_index].prlValid;
        }
    }

    function readProposalDraftVotingResult(bytes32 _proposalId)
        public
        constant
        returns (bool _result)
    {
        _result = proposalsById[_proposalId].draftVoting.passed;
    }

    function readProposalVotingResult(bytes32 _proposalId, uint256 _index)
        public
        constant
        returns (bool _result)
    {
        if (_index == 0) {
            _result = proposalsById[_proposalId].votingRound.passed;
        } else {
            _result = proposalsById[_proposalId].interimRounds[_index].passed;
        }
    }

    function readProposalDraftVotingTime(bytes32 _proposalId)
        public
        constant
        returns (uint256 _start)
    {
        _start = proposalsById[_proposalId].draftVoting.startTime;
    }

    function readProposalVotingTime(bytes32 _proposalId, uint256 _index)
        public
        constant
        returns (uint256 _start)
    {
        if (_index == 0) {
            _start = proposalsById[_proposalId].votingRound.startTime;
        } else {
            _start = proposalsById[_proposalId].interimRounds[_index].startTime;
        }
    }

    function readDraftVotingCount(bytes32 _proposalId, address[] memory _allUsers)
        public
        constant
        returns (uint256 _for, uint256 _against, uint256 _quorum)
    {
        DaoStructs.Voting _voting = proposalsById[_proposalId].draftVoting;
        uint256 _n = _allUsers.length;
        for (uint256 i = 0; i < _n; i++) {
            if (_voting.yesVotes[_allUsers[i]] > 0) {
                _for += _voting.yesVotes[_allUsers[i]];
            } else if (_voting.noVotes[_allUsers[i]] > 0) {
                _against += _voting.noVotes[_allUsers[i]];
            }
        }
        _quorum = _for + _against;
    }

    function readVotingCount(bytes32 _proposalId, uint256 _index, address[] _allUsers)
        public
        constant
        returns (uint256 _for, uint256 _against, uint256 _quorum)
    {
        DaoStructs.Voting storage _voting;
        if (_index == 0) {
            _voting = proposalsById[_proposalId].votingRound;
        } else {
            _voting = proposalsById[_proposalId].interimRounds[_index];
        }
        uint256 _n = _allUsers.length;
        for (uint256 i = 0; i < _n; i++) {
            if (_voting.yesVotes[_allUsers[i]] > 0) {
                _for += _voting.yesVotes[_allUsers[i]];
            } else if (_voting.noVotes[_allUsers[i]] > 0) {
                _against += _voting.noVotes[_allUsers[i]];
            }
        }
        _quorum = _for + _against;
    }

    function readVotingRoundVotes(bytes32 _proposalId, uint256 _index, address[] _allUsers, bool _vote)
        public
        returns (address[] memory _voters, uint256 _length)
    {
        DaoStructs.Voting storage _voting;
        if (_index == 0) {
            _voting = proposalsById[_proposalId].votingRound;
        } else {
            _voting = proposalsById[_proposalId].interimRounds[_index];
        }
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

    function readDraftVote(bytes32 _proposalId, address _voter)
        public
        constant
        returns (bool _voted, bool _vote, uint256 _weight)
    {
        DaoStructs.Voting _draftVoting = proposalsById[_proposalId].draftVoting;
        if (_draftVoting.yesVotes[_voter] > 0) {
            _voted = true;
            _vote = true;
            _weight = _draftVoting.yesVotes[_voter];
        } else if (_draftVoting.noVotes[_voter] > 0) {
            _voted = true;
            _vote = false;
            _weight = _draftVoting.noVotes[_voter];
        }
    }

    /// @notice returns the latest committed vote by a voter on a proposal
    /// @param _proposalId proposal ID
    /// @param _voter address of the voter
    /// @return {
    ///   "_commitHash": ""
    /// }
    function readCommitVote(bytes32 _proposalId, uint256 _index, address _voter)
        public
        constant
        returns (bytes32 _commitHash)
    {
        if (_index == 0) {
            _commitHash = proposalsById[_proposalId].votingRound.commits[_voter];
        } else {
            _commitHash = proposalsById[_proposalId].interimRounds[_index].commits[_voter];
        }
    }

    function readVote(bytes32 _proposalId, uint256 _index, address _voter)
        public
        constant
        returns (uint256 _weight)
    {
        DaoStructs.Voting _voting;
        if (_index == 0) {
            _voting = proposalsById[_proposalId].votingRound;
        } else {
            _voting = proposalsById[_proposalId].interimRounds[_index];
        }
        if (_voting.yesVotes[_voter] > 0) {
            _weight = _voting.yesVotes[_voter];
        } else {
            _weight = _voting.noVotes[_voter];
        }
    }

    /// @notice get all information and details of the first proposal
    /// return {
    ///   "_id": ""
    /// }
    function getFirstProposal()
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_first_from_bytesarray(allProposals);
    }

    /// @notice get all information and details of the last proposal
    /// return {
    ///   "_id": ""
    /// }
    function getLastProposal()
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_last_from_bytesarray(allProposals);
    }

    /// @notice get all information and details of proposal next to _proposalId
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc
    /// return {
    ///   "_id": ""
    /// }
    function getNextProposal(bytes32 _proposalId)
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_next_from_bytesarray(
            allProposals,
            _proposalId
        );
    }

    /// @notice get all information and details of proposal previous to _proposalId
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc
    /// return {
    ///   "_id": ""
    /// }
    function getPreviousProposal(bytes32 _proposalId)
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_previous_from_bytesarray(
            allProposals,
            _proposalId
        );
    }

    /// @notice get all information and details of the first proposal in state _stateId
    /// @param _stateId State ID of the proposal
    /// return {
    ///   "_id": ""
    /// }
    function getFirstProposalInState(uint8 _stateId)
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_first_from_bytesarray(proposalsByState[_stateId]);
    }

    /// @notice get all information and details of the last proposal in state _stateId
    /// @param _stateId State ID of the proposal
    /// return {
    ///   "_id": ""
    /// }
    function getLastProposalInState(uint8 _stateId)
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_last_from_bytesarray(proposalsByState[_stateId]);
    }

    /// @notice get all information and details of the next proposal to _proposalId in state _stateId
    /// @param _stateId State ID of the proposal
    /// return {
    ///   "_id": ""
    /// }
    function getNextProposalInState(uint8 _stateId, bytes32 _proposalId)
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_next_from_bytesarray(
            proposalsByState[_stateId],
            _proposalId
        );
    }

    /// @notice get all information and details of the previous proposal to _proposalId in state _stateId
    /// @param _stateId State ID of the proposal
    /// return {
    ///   "_id": ""
    /// }
    function getPreviousProposalInState(uint8 _stateId, bytes32 _proposalId)
        public
        constant
        returns (bytes32 _id)
    {
        _id = read_previous_from_bytesarray(
            proposalsByState[_stateId],
            _proposalId
        );
    }

    /// @notice read proposal version details for a specific version
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc
    /// @param _version Version of proposal, i.e. hash of IPFS doc for specific version
    /// return {
    ///   "_doc": "",
    ///   "_created": "",
    ///   "_milestoneDurations": "",
    ///   "_milestoneFundings": ""
    /// }
    function readProposalVersion(bytes32 _proposalId, bytes32 _version)
        public
        constant
        returns (
            bytes32 _doc,
            uint256 _created,
            uint256[] _milestoneDurations,
            uint256[] _milestoneFundings,
            uint256 _finalReward
        )
    {
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        DaoStructs.ProposalVersion memory _proposalVersion = _proposal.proposalVersions[_version];
        _doc = _proposalVersion.docIpfsHash;
        _created = _proposalVersion.created;
        _milestoneDurations = _proposalVersion.milestoneDurations;
        _milestoneFundings = _proposalVersion.milestoneFundings;
        _finalReward = _proposalVersion.finalReward;
    }

    function readProposalFunding(bytes32 _proposalId)
        public
        constant
        returns (uint256[] memory _fundings, uint256 _totalFunding)
    {
        bytes32 _finalVersion = proposalsById[_proposalId].finalVersion;
        _fundings = proposalsById[_proposalId].proposalVersions[_finalVersion].milestoneFundings;
        uint256 _n = _fundings.length;
        for (uint256 i = 0; i < _n; i++) {
            _totalFunding += _fundings[i];
        }
    }

    function readProposalMilestone(bytes32 _proposalId, uint256 _index)
        public
        constant
        returns (uint256 _milestoneId, uint256 _duration, uint256 _funding, uint256 _finalReward)
    {
        require(_index >= 0);
        bytes32 _finalVersion = proposalsById[_proposalId].finalVersion;
        if (_index < proposalsById[_proposalId].proposalVersions[_finalVersion].milestoneDurations.length) {
            _milestoneId = _index;
            _duration = proposalsById[_proposalId].proposalVersions[_finalVersion].milestoneDurations[_index];
            _funding = proposalsById[_proposalId].proposalVersions[_finalVersion].milestoneFundings[_index];
        } else {
            _milestoneId = 0;
            _duration = 0;
            _funding = 0;
            _finalReward = proposalsById[_proposalId].proposalVersions[_finalVersion].finalReward;
        }
    }

    function readProposalDuration(bytes32 _proposalId)
        public
        constant
        returns (uint256[] memory _durations, uint256 _totalDuration)
    {
        bytes32 _finalVersion = proposalsById[_proposalId].finalVersion;
        _durations = proposalsById[_proposalId].proposalVersions[_finalVersion].milestoneFundings;
        uint256 _n = _durations.length;
        for (uint256 i = 0; i < _n; i++) {
            _totalDuration += _durations[i];
        }
    }

    /// @notice get proposal version details for the first version
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc
    /// return {
    ///   "_version": ""
    /// }
    function getFirstProposalVersion(bytes32 _proposalId)
        public
        constant
        returns (bytes32 _version)
    {
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        _version = read_first_from_bytesarray(_proposal.proposalVersionDocs);
    }

    /// @notice get proposal version details for the last version
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc
    /// return {
    ///   "_version": ""
    /// }
    function getLastProposalVersion(bytes32 _proposalId)
        public
        constant
        returns (bytes32 _version)
    {
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        _version = read_last_from_bytesarray(_proposal.proposalVersionDocs);
    }

    /// @notice get proposal version details for the next version to _version
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc
    /// @param _version Version of proposal
    /// return {
    ///   "_nextVersion": ""
    /// }
    function getNextProposalVersion(bytes32 _proposalId, bytes32 _version)
        public
        constant
        returns (bytes32 _nextVersion)
    {
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        _nextVersion = read_next_from_bytesarray(
            _proposal.proposalVersionDocs,
            _version
        );
    }

    /// @notice get proposal version details for the previous version to _version
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc
    /// @param _version Version of proposal
    /// return {
    ///   "_previousVersion": ""
    /// }
    function getPreviousProposalVersion(bytes32 _proposalId, bytes32 _version)
        public
        constant
        returns (bytes32 _previousVersion)
    {
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        _previousVersion = read_previous_from_bytesarray(
            _proposal.proposalVersionDocs,
            _version
        );
    }

    function isDraftClaimed(bytes32 _proposalId)
        public
        returns (bool _claimed)
    {
        _claimed = proposalsById[_proposalId].draftVoting.claimed;
    }

    function isClaimed(bytes32 _proposalId, uint256 _index)
        public
        returns (bool _claimed)
    {
        if (_index == 0) {
            _claimed = proposalsById[_proposalId].votingRound.claimed;
        } else {
            _claimed = proposalsById[_proposalId].interimRounds[_index].claimed;
        }
    }

    ///////////////////////////// PRIVATE FUNCTIONS /////////////////////////////

    /// @notice nullify vote of a voter during draft voting
    /// @param _proposalId proposal ID
    /// @param _voter address of the voter
    function nullifyVote(
        bytes32 _proposalId,
        address _voter
    )
        private
    {
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        if (_proposal.draftVoting.yesVotes[_voter] > 0) {
            _proposal.draftVoting.yesVotes[_voter] = 0;
        } else if (_proposal.draftVoting.noVotes[_voter] > 0) {
            _proposal.draftVoting.noVotes[_voter] = 0;
        } else {
            return;
        }
    }

    ////////////////////////////// WRITE FUNCTIONS //////////////////////////////

    /// @notice add a new proposal, added to the PREPROPOSAL state
    /// @param _doc hash of IPFS document
    /// @param _proposer address of proposer of the proposal
    /// @param _milestoneDurations array of time durations for milestones
    /// @param _milestoneFundings array of required fundings for milestones
    /// @return {
    ///    "_success": "if pre-proposal was created successfully"
    /// }
    function addProposal(
        bytes32 _doc,
        address _proposer,
        uint256[] _milestoneDurations,
        uint256[] _milestoneFundings,
        uint256 _finalReward
    )
        public
        if_sender_is(CONTRACT_DAO)
        returns (bool _success)
    {
        allProposals.append(_doc);
        proposalsByState[PROPOSAL_STATE_PREPROPOSAL].append(_doc);
        proposalsById[_doc].proposalId = _doc;
        proposalsById[_doc].proposer = _proposer;
        proposalsById[_doc].currentState = PROPOSAL_STATE_PREPROPOSAL;
        proposalsById[_doc].timeCreated = now;
        proposalsById[_doc].proposalVersionDocs.append(_doc);
        proposalsById[_doc].proposalVersions[_doc].docIpfsHash = _doc;
        proposalsById[_doc].proposalVersions[_doc].created = now;
        proposalsById[_doc].proposalVersions[_doc].milestoneCount = _milestoneFundings.length;
        proposalsById[_doc].proposalVersions[_doc].milestoneDurations = _milestoneDurations;
        proposalsById[_doc].proposalVersions[_doc].milestoneFundings = _milestoneFundings;
        proposalsById[_doc].proposalVersions[_doc].finalReward = _finalReward;
        _success = true;
    }

    /// @notice edit/modify a proposal
    /// @param _proposalId Proposal ID
    /// @param _newDoc hash of IPFS document for newer version
    /// @param _newMilestoneDurations new array of time durations for milestones
    /// @param _newMilestoneDurations new array of req fundings for milestones
    /// @return {
    ///    "_success": "if proposal was edited successfully"
    /// }
    function editProposal(
        bytes32 _proposalId,
        bytes32 _newDoc,
        uint256[] _newMilestoneDurations,
        uint256[] _newMilestoneFundings,
        uint256 _finalReward
    )
        public
        if_sender_is(CONTRACT_DAO)
        returns (bool _success)
    {
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        _proposal.proposalVersionDocs.append(_newDoc);
        _proposal.proposalVersions[_newDoc].docIpfsHash = _newDoc;
        _proposal.proposalVersions[_newDoc].created = now;
        _proposal.proposalVersions[_newDoc].milestoneCount = _newMilestoneFundings.length;
        _proposal.proposalVersions[_newDoc].milestoneDurations = _newMilestoneDurations;
        _proposal.proposalVersions[_newDoc].milestoneFundings = _newMilestoneFundings;
        _proposal.proposalVersions[_newDoc].finalReward = _finalReward;
        _success = true;
    }

    function finalizeProposal(bytes32 _proposalId)
        public
        if_sender_is(CONTRACT_DAO)
    {
        proposalsById[_proposalId].finalVersion = getLastProposalVersion(_proposalId);
    }

    /// @notice add an endorser for a pre-proposal
    /// @param _proposalId Proposal ID
    /// @param _endorser address of badge holding participant, endorsing pre-proposal
    /// @return {
    ///   "_success": "if proposal was endorsed successfully"
    /// }
    function updateProposalEndorse(
        bytes32 _proposalId,
        address _endorser
    )
        public
        if_sender_is(CONTRACT_DAO)
        returns (bool _success)
    {
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        _proposal.endorser = _endorser;
        _proposal.currentState = PROPOSAL_STATE_INITIAL;
        proposalsByState[PROPOSAL_STATE_PREPROPOSAL].remove_item(_proposalId);
        proposalsByState[PROPOSAL_STATE_INITIAL].append(_proposalId);
        _success = true;
    }

    function setProposalDraftPass(bytes32 _proposalId, bool _result)
        public
        if_sender_is(CONTRACT_DAO_VOTING_CLAIMS)
        returns (bool _success)
    {
        proposalsById[_proposalId].draftVoting.passed = _result;
        if (_result) {
            proposalsByState[PROPOSAL_STATE_INITIAL].remove_item(_proposalId);
            proposalsByState[PROPOSAL_STATE_VETTED].append(_proposalId);
            proposalsById[_proposalId].currentState = PROPOSAL_STATE_VETTED;
        }
        _success = true;
    }

    function setProposalPass(bytes32 _proposalId, uint256 _index, bool _result)
        public
        if_sender_is(CONTRACT_DAO_VOTING_CLAIMS)
        returns (bool _success)
    {
        if (_index == 0) {
            proposalsById[_proposalId].votingRound.passed = _result;
            if (_result) {
                proposalsByState[PROPOSAL_STATE_VETTED].remove_item(_proposalId);
                proposalsByState[PROPOSAL_STATE_FUNDED].append(_proposalId);
                proposalsById[_proposalId].currentState = PROPOSAL_STATE_FUNDED;
            }
        } else {
            proposalsById[_proposalId].interimRounds[_index].passed = _result;
        }
        _success = true;
    }

    function setProposalDraftVotingTime(
        bytes32 _proposalId,
        uint256 _time
    )
        public
        if_sender_is(CONTRACT_DAO)
    {
        proposalsById[_proposalId].draftVoting.startTime = _time;
    }

    function setProposalVotingTime(
        bytes32 _proposalId,
        uint256 _index,
        uint256 _time
    )
        public
        if_sender_is(CONTRACT_DAO_VOTING_CLAIMS)
    {
        if (_index == 0) {
            proposalsById[_proposalId].votingRound.startTime = _time;
        } else {
            proposalsById[_proposalId].interimRounds[_index].startTime = _time;
        }
    }

    function setDraftVotingClaim(bytes32 _proposalId, bool _claimed)
        public
        if_sender_is(CONTRACT_DAO_VOTING_CLAIMS)
    {
        proposalsById[_proposalId].draftVoting.claimed = _claimed;
    }

    function setVotingClaim(bytes32 _proposalId, uint256 _index, bool _claimed)
        public
        if_sender_is(CONTRACT_DAO_VOTING_CLAIMS)
    {
        DaoStructs.Proposal _proposal = proposalsById[_proposalId];
        if (_index == 0) {
            _proposal.votingRound.claimed = _claimed;
        } else {
            _proposal.interimRounds[_index].claimed = _claimed;
        }
    }

    /// @notice update the PRL status of the voting in a proposal
    /// @param _proposalId Proposal ID
    /// @param _index Index of the voting round
    /// @param _valid PRL validity, true if legal, false if illegal
    function updateProposalPRL(
        bytes32 _proposalId,
        uint256 _index,
        bool _valid
    )
        public
        if_sender_is(CONTRACT_DAO)
    {
        if (_index == 0) {
            proposalsById[_proposalId].votingRound.prlValid = _valid;
        } else {
            proposalsById[_proposalId].interimRounds[_index].prlValid = _valid;
        }
    }

    /// @notice add/update draft vote for an initial proposal
    /// @param _proposalId Proposal ID
    /// @param _voter address of participant/voter
    /// @param _vote true if voting for, false if voting against
    /// @param _weight weight of the vote, or number of badges staked in this case
    /// @return {
    ///   "_success": "if draft vote for proposal added/updated successfully"
    /// }
    function addDraftVote(
        bytes32 _proposalId,
        address _voter,
        bool _vote,
        uint256 _weight
    )
        public
        if_sender_is(CONTRACT_DAO_VOTING)
        returns (bool _success)
    {
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        if ((_proposal.draftVoting.yesVotes[_voter] > 0) ||
            (_proposal.draftVoting.noVotes[_voter] > 0)) {
            nullifyVote(_proposalId, _voter);
        }
        if (_vote) {
            _proposal.draftVoting.yesVotes[_voter] = _weight;
        } else {
            _proposal.draftVoting.noVotes[_voter] = _weight;
        }
        _success = true;
    }

    /// @notice commit vote for a proposal in VOTING phase
    /// @param _proposalId Proposal ID
    /// @param _hash committed hash
    /// @param _voter address of the participant/voter
    /// @param _index index of voting round (0 for votingRound, 1 onwards for interimVotingRound)
    /// @return {
    ///   "_success": "if vote was committed successfully"
    /// }
    function commitVote(
        bytes32 _proposalId,
        bytes32 _hash,
        address _voter,
        uint256 _index
    )
        public
        if_sender_is(CONTRACT_DAO_VOTING)
        returns (bool _success)
    {
        DaoStructs.Proposal _proposal = proposalsById[_proposalId];
        if (_index == 0) {
            _proposal.votingRound.commits[_voter] = _hash;
        } else {
            _proposal.interimRounds[_index].commits[_voter] = _hash;
        }
        _success = true;
    }

    /// @notice reveal vote for a proposal in VOTING phase
    /// @param _proposalId Proposal ID
    /// @param _voter address of the participant/voter
    /// @param _vote true if voted for, false if voted against
    /// @param _weight weight of the vote as of the reveal time
    /// @param _index index of the voting round (0 for votingRound, 1 onwards for interim voting rounds)
    /// @return {
    ///   "_success": "if vote was counted successfully"
    /// }
    function revealVote(
        bytes32 _proposalId,
        address _voter,
        bool _vote,
        uint256 _weight,
        uint256 _index
    )
        public
        if_sender_is(CONTRACT_DAO_VOTING)
        returns (bool _success)
    {
        DaoStructs.Voting _voting;
        if (_index == 0) {
            _voting = proposalsById[_proposalId].votingRound;
        } else {
            _voting = proposalsById[_proposalId].interimRounds[_index];
        }
        if (_vote) {
            _voting.yesVotes[_voter] = _weight;
        } else {
            _voting.noVotes[_voter] = _weight;
        }
        _success = true;
    }
}
