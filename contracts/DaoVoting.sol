pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Claimable.sol";
import "./common/DaoCommon.sol";

contract DaoVoting is DaoCommon, Claimable {

  function DaoVoting(address _resolver) public {
      require(init(CONTRACT_DAO_VOTING, _resolver));
  }

  function voteOnDraft(
      bytes32 _proposalId,
      bytes32 _proposalVersion,
      bool _voteYes
  )
      public
      if_main_phase()
      if_badge_participant()
      returns (bool _success)
  {
      require(_proposalVersion == daoStorage().getLastProposalVersion(_proposalId));
      address _badgeHolder = msg.sender;
      uint256 _badgeStake = daoStakeStorage().readUserLockedBadge(_badgeHolder);

      bool _voted;
      (_voted,,) = daoStorage().readDraftVote(_proposalId, _badgeHolder);

      require(daoStorage().addDraftVote(_proposalId, _badgeHolder, _voteYes, _badgeStake));

      if (_voted == false) {
        daoPointsStorage().addQuarterBadgePoint(_badgeHolder, get_uint_config(CONFIG_QUARTER_POINT_DRAFT_VOTE), currentQuarterIndex());
      }

      _success = true;
  }

  function commitVoteOnProposal(
      bytes32 _proposalId,
      bytes32 _commitHash
  )
      public
      if_commit_phase(_proposalId)
      is_proposal_state(_proposalId, PROPOSAL_STATE_VETTED)
      if_participant()
      returns (bool _success)
  {
      daoStorage().commitVote(_proposalId, _commitHash, msg.sender, 0);
      _success = true;
  }

  function revealVoteOnProposal(
      bytes32 _proposalId,
      bool _vote,
      uint256 _salt
  )
      public
      if_reveal_phase(_proposalId)
      is_proposal_state(_proposalId, PROPOSAL_STATE_VETTED)
      has_not_revealed(_proposalId, 0)
      if_participant()
  {
      require(keccak256(msg.sender, _vote, _salt) == daoStorage().readCommitVote(_proposalId, 0, msg.sender));
      daoStorage().revealVote(_proposalId, msg.sender, _vote, daoStakeStorage().readUserEffectiveDGDStake(msg.sender), 0);

      // give quarter point
      daoPointsStorage().addQuarterPoint(msg.sender, get_uint_config(CONFIG_QUARTER_POINT_VOTE), currentQuarterIndex());
  }

  function commitVoteOnSpecialProposal(
      bytes32 _proposalId,
      bytes32 _commitHash
  )
      public
      if_commit_phase_special(_proposalId)
      if_participant()
      returns (bool _success)
  {
      daoSpecialStorage().commitVote(_proposalId, _commitHash, msg.sender, 0);
      _success = true;
  }

  function revealVoteOnSpecialProposal(
      bytes32 _proposalId,
      bool _vote,
      uint256 _salt
  )
      public
      if_reveal_phase_special(_proposalId)
      has_not_revealed_special(_proposalId)
      if_participant()
  {
      require(keccak256(msg.sender, _vote, _salt) == daoSpecialStorage().readCommitVote(_proposalId, msg.sender));
      daoSpecialStorage().revealVote(_proposalId, msg.sender, _vote, daoStakeStorage().readUserEffectiveDGDStake(msg.sender));

      // give quarter point
      daoPointsStorage().addQuarterPoint(msg.sender, get_uint_config(CONFIG_QUARTER_POINT_VOTE), currentQuarterIndex());
  }

  function commitVoteOnInterim(
      bytes32 _proposalId,
      uint8 _index,
      bytes32 _commitHash
  )
      public
      if_interim_commit_phase(_proposalId, _index)
      is_proposal_state(_proposalId, PROPOSAL_STATE_FUNDED)
      if_participant()
      returns (bool _success)
  {
      daoStorage().commitVote(_proposalId, _commitHash, msg.sender, _index);
      _success = true;
  }

  function revealVoteOnInterim(
      bytes32 _proposalId,
      uint8 _index,
      bool _vote,
      uint256 _salt
  )
      public
      if_interim_reveal_phase(_proposalId, _index)
      is_proposal_state(_proposalId, PROPOSAL_STATE_FUNDED)
      has_not_revealed(_proposalId, _index)
      if_participant()
  {
      require(keccak256(msg.sender, _vote, _salt) == daoStorage().readCommitVote(_proposalId, _index, msg.sender));
      daoStorage().revealVote(_proposalId, msg.sender, _vote, daoStakeStorage().readUserEffectiveDGDStake(msg.sender), _index);

      // give quarter point
      daoPointsStorage().addQuarterPoint(msg.sender, get_uint_config(CONFIG_QUARTER_POINT_INTERIM_VOTE), currentQuarterIndex());
  }
}
