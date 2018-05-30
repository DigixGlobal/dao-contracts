pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Claimable.sol";
import "./common/DaoCommon.sol";

contract DaoVoting is DaoCommon, Claimable {

  function DaoVoting(address _resolver) public {
      require(init(CONTRACT_DAO_VOTING, _resolver));
  }

  function voteOnDraft(
      bytes32 _proposalId,
      bool _voteYes,
      uint256 _nonce
  )
      public
      if_main_phase()
      if_badge_participant()
      returns (bool _success)
  {
      address _badgeHolder = msg.sender;
      uint256 _badgeStake = daoStakeStorage().readUserLockedBadge(_badgeHolder);

      // _nonce should be greater than the last used nonce by this address
      require(daoStorage().readLastNonce(msg.sender) < _nonce);

      bool _voted;
      (_voted,,) = daoStorage().readDraftVote(_proposalId, _badgeHolder);

      require(daoStorage().addDraftVote(_proposalId, _badgeHolder, _voteYes, _badgeStake, _nonce));

      if (_voted == false) {
        daoQuarterPoint().add(_badgeHolder, get_uint_config(QUARTER_POINT_DRAFT_VOTE), true);
      }

      _success = true;
  }

  function commitVoteOnProposal(
      bytes32 _proposalId,
      bytes32 _commitHash,
      uint256 _nonce
  )
      public
      if_commit_phase(_proposalId)
      is_proposal_state(_proposalId, PROPOSAL_STATE_VETTED)
      if_valid_nonce(_nonce)
      if_participant()
      returns (bool _success)
  {
      require(daoStorage().isCommitUsed(_proposalId, 0, _commitHash) == false);
      daoStorage().commitVote(_proposalId, _commitHash, msg.sender, 0, _nonce);
      _success = true;
  }

  function revealVoteOnProposal(
      bytes32 _proposalId,
      bool _vote,
      /* uint256 _salt */
      string _reveal
  )
      public
      if_reveal_phase(_proposalId)
      is_proposal_state(_proposalId, PROPOSAL_STATE_VETTED)
      has_not_revealed(_proposalId, 0)
      if_participant()
  {
      require(keccak256(_reveal) == daoStorage().readCommitVote(_proposalId, 0, msg.sender));
      daoStorage().revealVote(_proposalId, msg.sender, _vote, daoStakeStorage().readUserEffectiveDGDStake(msg.sender), 0);

      // give quarter point
      daoQuarterPoint().add(msg.sender, get_uint_config(QUARTER_POINT_VOTE), false);
  }

  function commitVoteOnSpecialProposal(
      bytes32 _proposalId,
      bytes32 _commitHash,
      uint256 _nonce
  )
      public
      if_commit_phase_special(_proposalId)
      if_valid_nonce_special(_nonce)
      if_participant()
      returns (bool _success)
  {
      require(daoSpecialStorage().isCommitUsed(_proposalId, _commitHash) == false);
      daoSpecialStorage().commitVote(_proposalId, _commitHash, msg.sender, _nonce);
      _success = true;
  }

  function revealVoteOnSpecialProposal(
      bytes32 _proposalId,
      bool _vote,
      /* uint256 _salt */
      string _reveal
  )
      public
      if_reveal_phase_special(_proposalId)
      has_not_revealed_special(_proposalId)
      if_participant()
  {
      require(keccak256(_reveal) == daoSpecialStorage().readCommitVote(_proposalId, msg.sender));
      daoSpecialStorage().revealVote(_proposalId, msg.sender, _vote, daoStakeStorage().readUserEffectiveDGDStake(msg.sender));

      // give quarter point
      daoQuarterPoint().add(msg.sender, get_uint_config(QUARTER_POINT_VOTE), false);
  }

  function commitVoteOnInterim(
      bytes32 _proposalId,
      uint8 _index,
      bytes32 _commitHash,
      uint256 _nonce
  )
      public
      if_interim_commit_phase(_proposalId, _index)
      is_proposal_state(_proposalId, PROPOSAL_STATE_FUNDED)
      if_valid_nonce(_nonce)
      if_participant()
      returns (bool _success)
  {
      require(daoStorage().isCommitUsed(_proposalId, _index, _commitHash) == false);
      daoStorage().commitVote(_proposalId, _commitHash, msg.sender, _index, _nonce);
      _success = true;
  }

  function revealVoteOnInterim(
      bytes32 _proposalId,
      uint8 _index,
      bool _vote,
      /* uint256 _salt */
      string _reveal
  )
      public
      if_interim_reveal_phase(_proposalId, _index)
      is_proposal_state(_proposalId, PROPOSAL_STATE_FUNDED)
      has_not_revealed(_proposalId, _index)
      if_participant()
  {
      require(keccak256(_reveal) == daoStorage().readCommitVote(_proposalId, _index, msg.sender));
      daoStorage().revealVote(_proposalId, msg.sender, _vote, daoStakeStorage().readUserEffectiveDGDStake(msg.sender), _index);

      // give quarter point
      daoQuarterPoint().add(msg.sender, get_uint_config(QUARTER_POINT_INTERIM_VOTE), false);
  }
}
