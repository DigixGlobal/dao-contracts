pragma solidity ^0.4.24;

import "@digix/solidity-collections/contracts/abstract/BytesIteratorStorage.sol";
import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "../common/DaoWhitelistingCommon.sol";
import "../lib/DaoStructs.sol";
import "./DaoWhitelistingStorage.sol";

contract DaoStorage is DaoWhitelistingCommon, BytesIteratorStorage {
    using DoublyLinkedList for DoublyLinkedList.Bytes;
    using DaoStructs for DaoStructs.Voting;
    using DaoStructs for DaoStructs.Proposal;
    using DaoStructs for DaoStructs.ProposalVersion;

    // List of all the proposals ever created in DigixDAO
    DoublyLinkedList.Bytes allProposals;

    // mapping of Proposal struct by its ID
    // ID is also the IPFS doc hash of the first ever version of this proposal
    mapping (bytes32 => DaoStructs.Proposal) proposalsById;

    // mapping from state of a proposal to list of all proposals in that state
    // proposals are added/removed from the state's list as their states change
    // eg. when proposal is endorsed, when proposal is funded, etc
    mapping (bytes32 => DoublyLinkedList.Bytes) proposalsByState;

    // This is to mark the number of proposals that have been funded in a specific quarter
    // this is to take care of the cap on the number of funded proposals in a quarter
    mapping (uint256 => uint256) public proposalCountByQuarter;

    constructor(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO, _resolver));
    }

    /////////////////////////////// READ FUNCTIONS //////////////////////////////

    /// @notice read all information and details of proposal
    /// @param _proposalId Proposal ID, i.e. hash of IPFS doc Proposal ID, i.e. hash of IPFS doc
    /// return {
    ///   "_doc": "Original IPFS doc of proposal, also ID of proposal",
    ///   "_proposer": "Address of the proposer",
    ///   "_endorser": "Address of the moderator that endorsed the proposal",
    ///   "_state": "Current state of the proposal",
    ///   "_timeCreated": "UTC timestamp at which proposal was created",
    ///   "_nVersions": "Number of versions of the proposal",
    ///   "_latestVersionDoc": "IPFS doc hash of the latest version of this proposal",
    ///   "_finalVersion": "If finalized, the version of the final proposal",
    ///   "_pausedOrStopped": "If the proposal is paused/stopped at the moment",
    ///   "_isDigixProposal": "If the proposal has been created by founder or not"
    /// }
    function readProposal(bytes32 _proposalId)
        public
        constant
        returns (
            bytes32 _doc,
            address _proposer,
            address _endorser,
            bytes32 _state,
            uint256 _timeCreated,
            uint256 _nVersions,
            bytes32 _latestVersionDoc,
            bytes32 _finalVersion,
            bool _pausedOrStopped,
            bool _isDigixProposal
        )
    {
        require(isWhitelisted(msg.sender));
        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        _doc = _proposal.proposalId;
        _proposer = _proposal.proposer;
        _endorser = _proposal.endorser;
        _state = _proposal.currentState;
        _timeCreated = _proposal.timeCreated;
        _nVersions = read_total_bytesarray(_proposal.proposalVersionDocs);
        _latestVersionDoc = read_last_from_bytesarray(_proposal.proposalVersionDocs);
        _finalVersion = _proposal.finalVersion;
        _pausedOrStopped = _proposal.isPausedOrStopped;
        _isDigixProposal = _proposal.isDigix;
    }

    function readProposalProposer(bytes32 _proposalId)
        public
        constant
        returns (address _proposer)
    {
        _proposer = proposalsById[_proposalId].proposer;
    }

    function readTotalPrlActions(bytes32 _proposalId)
        public
        constant
        returns (uint256 _length)
    {
        _length = proposalsById[_proposalId].prlActions.length;
    }

    function readPrlAction(bytes32 _proposalId, uint256 _index)
        public
        constant
        returns (uint256 _actionId, uint256 _time, bytes32 _doc)
    {
        DaoStructs.PrlAction[] memory _actions = proposalsById[_proposalId].prlActions;
        require(_index < _actions.length);
        _actionId = _actions[_index].actionId;
        _time = _actions[_index].at;
        _doc = _actions[_index].doc;
    }

    function readProposalDraftVotingResult(bytes32 _proposalId)
        public
        constant
        returns (bool _result)
    {
        require(isWhitelisted(msg.sender));
        _result = proposalsById[_proposalId].draftVoting.passed;
    }

    function readProposalVotingResult(bytes32 _proposalId, uint256 _index)
        public
        constant
        returns (bool _result)
    {
        require(isWhitelisted(msg.sender));
        _result = proposalsById[_proposalId].votingRounds[_index].passed;
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
        require(isWhitelisted(msg.sender));
        _start = proposalsById[_proposalId].votingRounds[_index].startTime;
    }

    function readDraftVotingCount(bytes32 _proposalId, address[] memory _allUsers)
        public
        constant
        returns (uint256 _for, uint256 _against)
    {
        require(isWhitelisted(msg.sender));
        return proposalsById[_proposalId].draftVoting.countVotes(_allUsers);
    }

    function readVotingCount(bytes32 _proposalId, uint256 _index, address[] _allUsers)
        public
        constant
        returns (uint256 _for, uint256 _against)
    {
        require(isWhitelisted(msg.sender));
        return proposalsById[_proposalId].votingRounds[_index].countVotes(_allUsers);
    }

    function readVotingRoundVotes(bytes32 _proposalId, uint256 _index, address[] _allUsers, bool _vote)
        public
        constant
        returns (address[] memory _voters, uint256 _length)
    {
        require(isWhitelisted(msg.sender));
        return proposalsById[_proposalId].votingRounds[_index].listVotes(_allUsers, _vote);
    }

    function readDraftVote(bytes32 _proposalId, address _voter)
        public
        constant
        returns (bool _vote, uint256 _weight)
    {
        require(isWhitelisted(msg.sender));
        return proposalsById[_proposalId].draftVoting.readVote(_voter);
    }

    /// @notice returns the latest committed vote by a voter on a proposal
    /// @param _proposalId proposal ID
    /// @param _voter address of the voter
    /// @return {
    ///   "_commitHash": ""
    /// }
    function readComittedVote(bytes32 _proposalId, uint256 _index, address _voter)
        public
        constant
        returns (bytes32 _commitHash)
    {
        require(isWhitelisted(msg.sender));
        _commitHash = proposalsById[_proposalId].votingRounds[_index].commits[_voter];
    }

    function readVote(bytes32 _proposalId, uint256 _index, address _voter)
        public
        constant
        returns (bool _vote, uint256 _weight)
    {
        require(isWhitelisted(msg.sender));
        return proposalsById[_proposalId].votingRounds[_index].readVote(_voter);
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
    function getFirstProposalInState(bytes32 _stateId)
        public
        constant
        returns (bytes32 _id)
    {
        require(isWhitelisted(msg.sender));
        _id = read_first_from_bytesarray(proposalsByState[_stateId]);
    }

    /// @notice get all information and details of the last proposal in state _stateId
    /// @param _stateId State ID of the proposal
    /// return {
    ///   "_id": ""
    /// }
    function getLastProposalInState(bytes32 _stateId)
        public
        constant
        returns (bytes32 _id)
    {
        require(isWhitelisted(msg.sender));
        _id = read_last_from_bytesarray(proposalsByState[_stateId]);
    }

    /// @notice get all information and details of the next proposal to _proposalId in state _stateId
    /// @param _stateId State ID of the proposal
    /// return {
    ///   "_id": ""
    /// }
    function getNextProposalInState(bytes32 _stateId, bytes32 _proposalId)
        public
        constant
        returns (bytes32 _id)
    {
        require(isWhitelisted(msg.sender));
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
    function getPreviousProposalInState(bytes32 _stateId, bytes32 _proposalId)
        public
        constant
        returns (bytes32 _id)
    {
        require(isWhitelisted(msg.sender));
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
    ///   "_milestoneFundings": ""
    /// }
    function readProposalVersion(bytes32 _proposalId, bytes32 _version)
        public
        constant
        returns (
            bytes32 _doc,
            uint256 _created,
            uint256[] _milestoneFundings,
            uint256 _finalReward
        )
    {
        return proposalsById[_proposalId].proposalVersions[_version].readVersion();
    }

    /**
    @notice Read the fundings of a finalized proposal
    @return {
        "_fundings": "fundings for the milestones",
        "_finalReward": "the final reward"
    }
    */
    function readProposalFunding(bytes32 _proposalId)
        public
        constant
        returns (uint256[] memory _fundings, uint256 _finalReward)
    {
        require(isWhitelisted(msg.sender));
        bytes32 _finalVersion = proposalsById[_proposalId].finalVersion;
        require(_finalVersion != EMPTY_BYTES);
        _fundings = proposalsById[_proposalId].proposalVersions[_finalVersion].milestoneFundings;
        _finalReward = proposalsById[_proposalId].proposalVersions[_finalVersion].finalReward;
    }

    function readProposalMilestone(bytes32 _proposalId, uint256 _index)
        public
        constant
        returns (uint256 _funding)
    {
        require(isWhitelisted(msg.sender));
        _funding = proposalsById[_proposalId].readProposalMilestone(_index);
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
        constant
        returns (bool _claimed)
    {
        _claimed = proposalsById[_proposalId].draftVoting.claimed;
    }

    function isClaimed(bytes32 _proposalId, uint256 _index)
        public
        constant
        returns (bool _claimed)
    {
        _claimed = proposalsById[_proposalId].votingRounds[_index].claimed;
    }

    function readProposalCollateralStatus(bytes32 _proposalId)
        public
        constant
        returns (uint256 _status)
    {
        require(isWhitelisted(msg.sender));
        _status = proposalsById[_proposalId].collateralStatus;
    }

    function readProposalCollateralAmount(bytes32 _proposalId)
        public
        constant
        returns (uint256 _amount)
    {
        _amount = proposalsById[_proposalId].collateralAmount;
    }

    /// @notice Read the additional docs that are added after the proposal is finalized
    /// @dev Will throw if the propsal is not finalized yet
    function readProposalDocs(bytes32 _proposalId)
        public
        constant
        returns (bytes32[] _moreDocs)
    {
        bytes32 _finalVersion = proposalsById[_proposalId].finalVersion;
        require(_finalVersion != EMPTY_BYTES);
        _moreDocs = proposalsById[_proposalId].proposalVersions[_finalVersion].moreDocs;
    }

    function readIfMilestoneFunded(bytes32 _proposalId, uint256 _milestoneId)
        public
        constant
        returns (bool _funded)
    {
        require(isWhitelisted(msg.sender));
        _funded = proposalsById[_proposalId].votingRounds[_milestoneId].funded;
    }

    ////////////////////////////// WRITE FUNCTIONS //////////////////////////////

    function addProposal(
        bytes32 _doc,
        address _proposer,
        uint256[] _milestoneFundings,
        uint256 _finalReward,
        bool _isFounder
    )
        public
    {
        require(sender_is(CONTRACT_DAO));

        allProposals.append(_doc);
        proposalsByState[PROPOSAL_STATE_PREPROPOSAL].append(_doc);
        proposalsById[_doc].proposalId = _doc;
        proposalsById[_doc].proposer = _proposer;
        proposalsById[_doc].currentState = PROPOSAL_STATE_PREPROPOSAL;
        proposalsById[_doc].timeCreated = now;
        proposalsById[_doc].isDigix = _isFounder;
        proposalsById[_doc].addProposalVersion(_doc, _milestoneFundings, _finalReward);
    }

    function editProposal(
        bytes32 _proposalId,
        bytes32 _newDoc,
        uint256[] _newMilestoneFundings,
        uint256 _finalReward
    )
        public
    {
        require(sender_is(CONTRACT_DAO));

        proposalsById[_proposalId].addProposalVersion(_newDoc, _newMilestoneFundings, _finalReward);
    }

    /// @notice change fundings of a proposal
    /// @dev Will throw if the proposal is not finalized yet
    function changeFundings(bytes32 _proposalId, uint256[] _newMilestoneFundings, uint256 _finalReward)
        public
    {
        require(sender_is(CONTRACT_DAO));

        bytes32 _finalVersion = proposalsById[_proposalId].finalVersion;
        require(_finalVersion != EMPTY_BYTES);
        proposalsById[_proposalId].proposalVersions[_finalVersion].milestoneFundings = _newMilestoneFundings;
        proposalsById[_proposalId].proposalVersions[_finalVersion].finalReward = _finalReward;
    }

    /// @dev Will throw if the proposal is not finalized yet
    function addProposalDoc(bytes32 _proposalId, bytes32 _newDoc)
        public
    {
        require(sender_is(CONTRACT_DAO));

        bytes32 _finalVersion = proposalsById[_proposalId].finalVersion;
        require(_finalVersion != EMPTY_BYTES); //already checked in interactive layer, but why not
        proposalsById[_proposalId].proposalVersions[_finalVersion].moreDocs.push(_newDoc);
    }

    function finalizeProposal(bytes32 _proposalId)
        public
    {
        require(sender_is(CONTRACT_DAO));

        proposalsById[_proposalId].finalVersion = getLastProposalVersion(_proposalId);
    }

    function updateProposalEndorse(
        bytes32 _proposalId,
        address _endorser
    )
        public
    {
        require(sender_is(CONTRACT_DAO));

        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        _proposal.endorser = _endorser;
        _proposal.currentState = PROPOSAL_STATE_DRAFT;
        proposalsByState[PROPOSAL_STATE_PREPROPOSAL].remove_item(_proposalId);
        proposalsByState[PROPOSAL_STATE_DRAFT].append(_proposalId);
    }

    function setProposalDraftPass(bytes32 _proposalId, bool _result)
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING_CLAIMS));

        proposalsById[_proposalId].draftVoting.passed = _result;
        if (_result) {
            proposalsByState[PROPOSAL_STATE_DRAFT].remove_item(_proposalId);
            proposalsByState[PROPOSAL_STATE_MODERATED].append(_proposalId);
            proposalsById[_proposalId].currentState = PROPOSAL_STATE_MODERATED;
        } else {
            closeProposalInternal(_proposalId);
        }
    }

    function setProposalPass(bytes32 _proposalId, uint256 _index, bool _result)
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING_CLAIMS));

        if (!_result) {
            closeProposalInternal(_proposalId);
        } else if (_index == 0) {
            proposalsByState[PROPOSAL_STATE_MODERATED].remove_item(_proposalId);
            proposalsByState[PROPOSAL_STATE_ONGOING].append(_proposalId);
            proposalsById[_proposalId].currentState = PROPOSAL_STATE_ONGOING;
        }
        proposalsById[_proposalId].votingRounds[_index].passed = _result;
    }

    function setProposalDraftVotingTime(
        bytes32 _proposalId,
        uint256 _time
    )
        public
    {
        require(sender_is(CONTRACT_DAO));

        proposalsById[_proposalId].draftVoting.startTime = _time;
    }

    function setProposalVotingTime(
        bytes32 _proposalId,
        uint256 _index,
        uint256 _time
    )
        public
    {
        require(sender_is_from([CONTRACT_DAO, CONTRACT_DAO_VOTING_CLAIMS, EMPTY_BYTES]));

        proposalsById[_proposalId].votingRounds[_index].startTime = _time;
    }

    function setDraftVotingClaim(bytes32 _proposalId, bool _claimed)
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING_CLAIMS));
        proposalsById[_proposalId].draftVoting.claimed = _claimed;
    }

    function setVotingClaim(bytes32 _proposalId, uint256 _index, bool _claimed)
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING_CLAIMS));
        proposalsById[_proposalId].votingRounds[_index].claimed = _claimed;
    }

    function setProposalCollateralStatus(bytes32 _proposalId, uint256 _status)
        public
    {
        require(sender_is_from([CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_FUNDING_MANAGER, CONTRACT_DAO]));
        proposalsById[_proposalId].collateralStatus = _status;
    }

    function setProposalCollateralAmount(bytes32 _proposalId, uint256 _amount)
        public
    {
        require(sender_is(CONTRACT_DAO));
        proposalsById[_proposalId].collateralAmount = _amount;
    }

    function updateProposalPRL(
        bytes32 _proposalId,
        uint256 _action,
        bytes32 _doc,
        uint256 _time
    )
        public
    {
        require(sender_is(CONTRACT_DAO));
        DaoStructs.PrlAction memory prlAction;
        prlAction.at = _time;
        prlAction.doc = _doc;
        prlAction.actionId = _action;
        proposalsById[_proposalId].prlActions.push(prlAction);

        if (_action == PRL_ACTION_PAUSE) {
          proposalsById[_proposalId].isPausedOrStopped = true;
        } else if (_action == PRL_ACTION_UNPAUSE) {
          proposalsById[_proposalId].isPausedOrStopped = false;
        } else { // STOP
          proposalsById[_proposalId].isPausedOrStopped = true;
          closeProposalInternal(_proposalId);
        }
    }

    function closeProposalInternal(bytes32 _proposalId)
        internal
    {
        bytes32 _currentState = proposalsById[_proposalId].currentState;
        proposalsByState[_currentState].remove_item(_proposalId);
        proposalsByState[PROPOSAL_STATE_CLOSED].append(_proposalId);
        proposalsById[_proposalId].currentState = PROPOSAL_STATE_CLOSED;
    }

    function addDraftVote(
        bytes32 _proposalId,
        address _voter,
        bool _vote,
        uint256 _weight
    )
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING));

        DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
        if (_vote) {
            _proposal.draftVoting.yesVotes[_voter] = _weight;
            if (_proposal.draftVoting.noVotes[_voter] > 0) { // minimize number of writes to storage, since EIP-1087 is not implemented yet
                _proposal.draftVoting.noVotes[_voter] = 0;
            }
        } else {
            _proposal.draftVoting.noVotes[_voter] = _weight;
            if (_proposal.draftVoting.yesVotes[_voter] > 0) {
                _proposal.draftVoting.yesVotes[_voter] = 0;
            }
        }
    }

    function commitVote(
        bytes32 _proposalId,
        bytes32 _hash,
        address _voter,
        uint256 _index
    )
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING));

        proposalsById[_proposalId].votingRounds[_index].commits[_voter] = _hash;
    }

    function revealVote(
        bytes32 _proposalId,
        address _voter,
        bool _vote,
        uint256 _weight,
        uint256 _index
    )
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING));

        proposalsById[_proposalId].votingRounds[_index].revealVote(_voter, _vote, _weight);
    }

    function addNonDigixProposalCountInQuarter(uint256 _quarterIndex)
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING_CLAIMS));
        proposalCountByQuarter[_quarterIndex] = proposalCountByQuarter[_quarterIndex].add(1);
    }

    function closeProposal(bytes32 _proposalId)
        public
    {
        require(sender_is(CONTRACT_DAO));
        closeProposalInternal(_proposalId);
    }

    function setMilestoneFunded(bytes32 _proposalId, uint256 _milestoneId)
        public
    {
        require(sender_is(CONTRACT_DAO_FUNDING_MANAGER));
        proposalsById[_proposalId].votingRounds[_milestoneId].funded = true;
    }
}
