pragma solidity ^0.4.19;

import "@digix/solidity-collections/contracts/abstract/BytesIteratorStorage.sol";
import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoCommon.sol";
import "../common/DaoConstants.sol";
import "../lib/DaoStructs.sol";

contract DaoStorage is ResolverClient, DaoConstants, BytesIteratorStorage {
  using DoublyLinkedList for DoublyLinkedList.Bytes;

  DoublyLinkedList.Bytes allProposals;
  mapping (bytes32 => DaoStructs.Proposal) proposalsById;
  mapping (uint256 => DoublyLinkedList.Bytes) proposalsByState;
  mapping (address => uint256) lastNonce;
  uint256 public startOfFirstQuarter;

  function DaoStorage(address _resolver) public {
    require(init(CONTRACT_DAO_STORAGE, _resolver));
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

  function readProposalVoting(bytes32 _proposalId)
    public
    constant
    returns (uint256 _start)
  {
    _start = proposalsById[_proposalId].votingRound.startTime;
  }

  function readProposalInterimVoting(bytes32 _proposalId, uint8 _index)
    public
    constant
    returns (uint256 _start)
  {
    _start = proposalsById[_proposalId].interimRounds[_index].startTime;
  }

  /// @notice returns the last used nonce for an address
  /// @param _voter address of the dao member
  /// @return {
  ///   "_lastNonce": ""
  /// }
  function readLastNonce(address _voter)
    public
    constant
    returns (uint256 _lastNonce)
  {
    _lastNonce = lastNonce[_voter];
  }

  /// @notice returns the latest committed vote by a voter on a proposal
  /// @param _proposalId proposal ID
  /// @param _voter address of the voter
  /// @return {
  ///   "_commitHash": ""
  /// }
  function readCommitVote(bytes32 _proposalId, address _voter)
    public
    constant
    returns (bytes32 _commitHash)
  {
    _commitHash = proposalsById[_proposalId].votingRound.commits[_voter];
  }

  /// @notice returns the latest committed vote by a voter on a proposal interim voting round
  /// @param _proposalId proposal ID
  /// @param _index index of the interim round
  /// @param _voter address of the voter
  /// @return {
  ///   "_commitHash": ""
  /// }
  function readInterimCommitVote(
    bytes32 _proposalId,
    uint8 _index,
    address _voter
  )
    public
    constant
    returns (bytes32 _commitHash)
  {
    _commitHash = proposalsById[_proposalId].interimRounds[_index].commits[_voter];
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
  ///   "_milestoneFundings": "",
  ///   "_prlValid": ""
  /// }
  function readProposalVersion(bytes32 _proposalId, bytes32 _version)
    public
    constant
    returns (
      bytes32 _doc,
      uint256 _created,
      uint256[] _milestoneDurations,
      uint256[] _milestoneFundings,
      bool _prlValid
    )
  {
    DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
    DaoStructs.ProposalVersion memory _proposalVersion = _proposal.proposalVersions[_version];
    _doc = _proposalVersion.docIpfsHash;
    _created = _proposalVersion.created;
    _milestoneDurations = _proposalVersion.milestoneDurations;
    _milestoneFundings = _proposalVersion.milestoneFundings;
    _prlValid = _proposalVersion.draftVoting.prlValid;
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

  ///////////////////////////// PRIVATE FUNCTIONS /////////////////////////////

  /// @notice nullify vote of a voter during draft voting
  /// @param _proposalId proposal ID
  /// @param _version latest version of proposal, on which draft voting is done
  /// @param _voter address of the voter
  function nullifyVote(
    bytes32 _proposalId,
    bytes32 _version,
    address _voter
  )
    private
  {
    DaoStructs.ProposalVersion storage _proposalVersion = proposalsById[_proposalId].proposalVersions[_version];
    if (_proposalVersion.draftVoting.yesVotes[_voter] > 0) {
      _proposalVersion.draftVoting.yesVotes[_voter] = 0;
    } else if (_proposalVersion.draftVoting.noVotes[_voter] > 0) {
      _proposalVersion.draftVoting.noVotes[_voter] = 0;
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
    uint256[] _milestoneFundings
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
    uint256[] _newMilestoneFundings
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
    _success = true;
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
    bytes32 _latestVersion = read_last_from_bytesarray(_proposal.proposalVersionDocs);
    _proposal.proposalVersions[_latestVersion].draftVoting.startTime = now;
    _success = true;
  }

  /// @notice update the PRL status of the latest voting in a proposal
  /// @param _proposalId Proposal ID
  /// @param _valid PRL validity, true if legal, false if illegal
  /// @return {
  ///   "_success": "if proposal's PRL status was updated successfully"
  /// }
  function updateProposalPRL(
    bytes32 _proposalId,
    bool _valid
  )
    public
    if_sender_is(CONTRACT_DAO)
    returns (bool _success, bool _release)
  {

  }

  /// @notice add/update draft vote for an initial proposal
  /// @param _proposalId Proposal ID
  /// @param _voter address of participant/voter
  /// @param _vote true if voting for, false if voting against
  /// @param _weight weight of the vote, or number of badges staked in this case
  /// @param _nonce nonce used for this vote
  /// @return {
  ///   "_success": "if draft vote for proposal added/updated successfully"
  /// }
  function addDraftVote(
    bytes32 _proposalId,
    address _voter,
    bool _vote,
    uint256 _weight,
    uint256 _nonce
  )
    public
    if_sender_is(CONTRACT_DAO)
    returns (bool _success)
  {
    DaoStructs.Proposal storage _proposal = proposalsById[_proposalId];
    bytes32 _latestVersion = read_last_from_bytesarray(_proposal.proposalVersionDocs);
    DaoStructs.ProposalVersion storage _proposalVersion = _proposal.proposalVersions[_latestVersion];
    if ((_proposalVersion.draftVoting.yesVotes[_voter] > 0) ||
          (_proposalVersion.draftVoting.noVotes[_voter] > 0)) {
      nullifyVote(_proposalId, _latestVersion, _voter);
    }
    lastNonce[_voter] = _nonce;
    if (_vote) {
      _proposalVersion.draftVoting.yesVotes[_voter] = _weight;
    } else {
      _proposalVersion.draftVoting.noVotes[_voter] = _weight;
    }
    _success = true;
  }

  /// @notice commit vote for a proposal in VOTING phase
  /// @param _proposalId Proposal ID
  /// @param _hash committed hash
  /// @param _voter address of the participant/voter
  /// @param _nonce nonce used for this transaction
  /// @return {
  ///   "_success": "if vote was committed successfully"
  /// }
  function commitVote(
    bytes32 _proposalId,
    bytes32 _hash,
    address _voter,
    uint256 _nonce
  )
    public
    if_sender_is(CONTRACT_DAO)
    returns (bool _success)
  {
    DaoStructs.Proposal _proposal = proposalsById[_proposalId];
    lastNonce[_voter] = _nonce;
    _proposal.votingRound.commits[_voter] = _hash;
    _success = true;
  }

  /// @notice reveal vote for a proposal in VOTING phase
  /// @param _proposalId Proposal ID
  /// @param _voter address of the participant/voter
  /// @param _vote true if voted for, false if voted against
  /// @param _weight weight of the vote as of the reveal time
  /// @return {
  ///   "_success": "if vote was counted successfully"
  /// }
  function revealVote(
    bytes32 _proposalId,
    address _voter,
    bool _vote,
    uint256 _weight
  )
    public
    if_sender_is(CONTRACT_DAO)
    returns (bool _success)
  {
    DaoStructs.Proposal _proposal = proposalsById[_proposalId];
    if (_vote) {
      _proposal.votingRound.yesVotes[_voter] = _weight;
    } else {
      _proposal.votingRound.noVotes[_voter] = _weight;
    }
    _success = true;
  }

  /// @notice commit vote for a proposal in the INTERIM VOTING phase
  /// @param _proposalId Proposal ID
  /// @param _hash committed hash
  /// @param _voter address of the participant/voter
  /// @param _index index of the interim voting round
  /// @param _nonce nonce of this transaction
  /// @return {
  ///   "_success": "if vote was committed successfully"
  /// }
  function commitInterimVote(
    bytes32 _proposalId,
    bytes32 _hash,
    address _voter,
    uint8 _index,
    uint256 _nonce
  )
    public
    if_sender_is(CONTRACT_DAO)
    returns (bool _success)
  {
    DaoStructs.Proposal _proposal = proposalsById[_proposalId];
    lastNonce[_voter] = _nonce;
    _proposal.interimRounds[_index].commits[_voter] = _hash;
    _success = true;
  }

  /// @notice reveal vote for a proposal in INTERIM VOTING phase
  /// @param _proposalId Proposal ID
  /// @param _voter address of the participant/voter
  /// @param _salt random number used with which commit was concetenated
  /// @param _vote true if voted for, false if voted against
  /// @param _weight weight of the vote as of the reveal time
  /// @param _index index of the interim voting round
  /// @return {
  ///   "_success": "if vote was counted successfully"
  /// }
  function revealInterimVote(
    bytes32 _proposalId,
    address _voter,
    uint256 _salt,
    bool _vote,
    uint256 _weight,
    uint8 _index
  )
    public
    if_sender_is(CONTRACT_DAO)
    returns (bool _success)
  {
    DaoStructs.Proposal _proposal = proposalsById[_proposalId];
    if (_vote) {
      _proposal.interimRounds[_index].yesVotes[_voter] = _weight;
    } else {
      _proposal.interimRounds[_index].noVotes[_voter] = _weight;
    }
    _success = true;
  }
}
