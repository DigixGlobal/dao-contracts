pragma solidity ^0.4.19;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoCommon.sol";
import "../common/DaoConstants.sol";

contract DaoStorage is ResolverClient, DaoConstants {
  using DoublyLinkedList for DoublyLinkedList.Bytes;

  struct Voting {
    uint256 start_time;
    mapping (address => bytes32) commits;
    mapping (address => bool) yesVotes;
    mapping (address => bool) noVotes;
    uint256 totalYesVotes;
    uint256 totalNoVotes;
    bool prlValid;
  }

  struct ProposalVersion {
    bytes32 doc_ipfs_hash;
    uint256 created;
    Voting draftVoting;
    uint256 milestoneCount;
    uint256[] milestoneDurations;
    uint256[] milestoneFundings;
  }

  struct Proposal {
    DoublyLinkedList.Bytes proposalVersionDocs;
    mapping (bytes32 => ProposalVersion) proposalVersions;
    address proposer;
    address endorser;
    Voting votingRound;
    Voting[] interimRounds;
    uint8 currentState;
    uint256 timeCreated;

    // this will always be the doc_ipfs_hash of the last proposal version
    bytes32 proposalId;
  }

  DoublyLinkedList.Bytes allProposals;
  mapping (bytes32 => Proposal) proposalsById;
  mapping (uint8 => DoublyLinkedList.Bytes) proposalsByState;
  uint256 public startOfFirstQuarter;

  function DaoStorage(address _resolver) public {
    require(init(CONTRACT_DAO_STORAGE, _resolver));
  }

  /// @notice get basic information of proposal
  /// @param _proposalId
  /// return {
  ///   "_doc": "",
  ///   "_proposal": "",
  ///   "_endorser": "",
  ///   "_state": "",
  ///   "_timeCreated": ""
  /// }
  function getProposalInfo(bytes32 _proposalId)
    public
    returns (
      bytes32 _doc,
      address _proposer,
      address _endorser,
      uint8 _state,
      uint256 _timeCreated
    )
  {

  }

  /// @notice get proposal version details for the latest version
  /// @param _proposalId
  /// return {
  ///   "_doc": "",
  ///   "_lastModifiedTime": "",
  ///   "_milestoneCount": "",
  ///   "_milestoneDurations": "",
  ///   "_milestoneFundings": "",
  ///   "_draftVotesYes": "",
  ///   "_draftVotesNo": ""
  /// }
  function getProposalDetails(bytes _proposalId)
    public
    returns (
      bytes32 _doc,
      uint256 _lastModifiedTime,
      uint256 _milestoneCount,
      uint256[] _milestoneDurations,
      uint256[] _milestoneFundings,
      uint256 _draftVotesYes,
      uint256 _draftVotesNo
    )
  {

  }

  /// @notice get proposal version details for a specific version
  /// @param _proposalId
  /// @param _version
  /// return {
  ///   "_doc": "",
  ///   "_lastModifiedTime": "",
  ///   "_milestoneCount": "",
  ///   "_milestoneDurations": "",
  ///   "_milestoneFundings": "",
  ///   "_draftVotesYes": "",
  ///   "_draftVotesNo": ""
  /// }
  function getProposalDetailsByVersion(bytes _proposalId, bytes32 _version)
    public
    returns (
      bytes32 _doc,
      uint256 _lastModifiedTime,
      uint256 _milestoneCount,
      uint256[] _milestoneDurations,
      uint256[] _milestoneFundings,
      uint256 _draftVotesYes,
      uint256 _draftVotesNo
    )
  {

  }

  /// @notice get proposal version details for the next version to _version
  /// @param _proposalId
  /// @param _version
  /// return {
  ///   "_doc": "",
  ///   "_lastModifiedTime": "",
  ///   "_milestoneCount": "",
  ///   "_milestoneDurations": "",
  ///   "_milestoneFundings": "",
  ///   "_draftVotesYes": "",
  ///   "_draftVotesNo": ""
  /// }
  function getProposalDetailsNext(bytes32 _proposalId, bytes32 _version)
    public
    returns (
      bytes32 _doc,
      uint256 _lastModifiedTime,
      uint256 _milestoneCount,
      uint256[] _milestoneDurations,
      uint256[] _milestoneFundings,
      uint256 _draftVotesYes,
      uint256 _draftVotesNo
    )
  {

  }

  /// @notice get proposal version details for the previous version to _version
  /// @param _proposalId
  /// @param _version
  /// return {
  ///   "_doc": "",
  ///   "_lastModifiedTime": "",
  ///   "_milestoneCount": "",
  ///   "_milestoneDurations": "",
  ///   "_milestoneFundings": "",
  ///   "_draftVotesYes": "",
  ///   "_draftVotesNo": ""
  /// }
  function getProposalDetailsPrevious(bytes32 _proposalId, bytes32 _version)
    public
    returns (
      bytes32 _doc,
      uint256 _lastModifiedTime,
      uint256 _milestoneCount,
      uint256[] _milestoneDurations,
      uint256[] _milestoneFundings,
      uint256 _draftVotesYes,
      uint256 _draftVotesNo
    )
  {

  }

  /// @notice add a new proposal, added to the PREPROPOSAL state
  /// @param _doc
  /// @param _milestoneDurations
  /// @param _milestoneFundings
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

  }

  /// @notice edit/modify a proposal
  /// @param _proposalId
  /// @param _newDoc
  /// @param _newMilestoneDurations
  /// @param _newMilestoneDurations
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
    // fetch from proposalsById
    // delete from proposalsById for _proposalId
    // set _newDoc as new proposal ID
    // reset the draftVoting of the new version
  }

  /// @notice add an endorser for a pre-proposal
  /// @param _proposalId
  /// @param _endorser
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
    // fetch from proposalsById
    // update endorser of proposal
    // update state of the proposal
    // delete from proposalsByState
    // add to proposalsByState for newState
  }

  /// @notice update the PRL status of the latest voting in a proposal
  /// @param _proposalId
  /// @param _valid
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
    // fetch from proposalsById
    // update prlValid of the correct Voting[item] based on current state
    // based on `item`, set _release whether to release next funds or not
  }

  /// @notice add/update draft vote for an initial proposal
  /// @param _proposalId
  /// @param _voter
  /// @param _vote
  /// @return {
  ///   "_success": "if draft vote for proposal added/updated successfully",
  ///   "_outcome": "if draft voting outcome is pass/fail"
  /// }
  function addDraftVote(
    bytes32 _proposalId,
    address _voter,
    bool _vote
  )
    public
    if_sender_is(CONTRACT_DAO)
    returns (bool _success, bool _outcome)
  {

  }

  /// @notice commit vote for a proposal in VOTING phase
  /// @param _proposalId
  /// @param _hash
  /// @param _voter
  /// @return {
  ///   "_success": "if vote was committed successfully"
  /// }
  function commitVote(
    bytes32 _proposalId,
    bytes32 _hash,
    address _voter
  )
    public
    if_sender_is(CONTRACT_DAO)
    returns (bool _success)
  {

  }

  /// @notice reveal vote for a proposal in VOTING phase
  /// @param _proposalId
  /// @param _voter
  /// @param _salt
  /// @param _vote
  /// @return {
  ///   "_success": "if vote was counted successfully"
  /// }
  function revealVote(
    bytes32 _proposalId,
    address _voter,
    uint256 _salt,
    bool _vote
  )
    public
    if_sender_is(CONTRACT_DAO)
    returns (bool _success)
  {

  }

  /// @notice commit vote for a proposal in the INTERIM VOTING phase
  /// @param _proposalId
  /// @param _hash
  /// @param _voter
  /// @param _index
  /// @return {
  ///   "_success": "if vote was committed successfully"
  /// }
  function commitInterimVote(
    bytes32 _proposalId,
    bytes32 _hash,
    address _voter,
    uint8 _index
  )
    public
    if_sender_is(CONTRACT_DAO)
    returns (bool _success)
  {

  }

  /// @notice reveal vote for a proposal in INTERIM VOTING phase
  /// @param _proposalId
  /// @param _voter
  /// @param _salt
  /// @param _vote
  /// @return {
  ///   "_success": "if vote was counted successfully"
  /// }
  function revealInterimVote(
    bytes32 _proposalId,
    address _voter,
    uint256 _salt,
    bool _vote,
    uint8 _index
  )
    public
    if_sender_is(CONTRACT_DAO)
    returns (bool _success)
  {

  }
}
