pragma solidity ^0.4.23;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "openzeppelin-solidity/contracts/ownership/Claimable.sol";
import "./common/DaoCommon.sol";
import "./service/DaoCalculatorService.sol";
import "./DaoFundingManager.sol";
import "./DaoRewardsManager.sol";

contract DaoVotingClaims is DaoCommon, Claimable {

  function daoCalculatorService()
      internal
      returns (DaoCalculatorService _contract)
  {
      _contract = DaoCalculatorService(get_contract(CONTRACT_DAO_CALCULATOR_SERVICE));
  }

  function daoFundingManager()
      internal
      returns (DaoFundingManager _contract)
  {
      _contract = DaoFundingManager(get_contract(CONTRACT_DAO_FUNDING_MANAGER));
  }

  function daoRewardsManager()
      internal
      returns (DaoRewardsManager _contract)
  {
      _contract = DaoRewardsManager(get_contract(CONTRACT_DAO_REWARDS_MANAGER));
  }

  function DaoVotingClaims(address _resolver) public {
    require(init(CONTRACT_DAO_VOTING_CLAIMS, _resolver));
  }

  function claimDraftVotingResult(bytes32 _proposalId)
      public
      if_main_phase()
      if_draft_not_claimed(_proposalId)
      if_dao_member()
      returns (bool _passed)
  {
      //TODO use the real total number of badgeHolders instead of 10000
      address[] memory _allBadgeHolders = daoListingService().listBadgeParticipants(10000, true);
      DaoStructs.VotingCount _count;
      (_count.forCount, _count.againstCount, _count.quorum) = daoStorage().readDraftVotingCount(_proposalId, _allBadgeHolders);
      require(_count.quorum > daoCalculatorService().minimumDraftQuorum(_proposalId));
      require(daoCalculatorService().draftQuotaPass(_count.forCount, _count.againstCount));
      _passed = true;
      daoStorage().setProposalDraftPass(_proposalId, true);
      daoStorage().setProposalVotingTime(_proposalId, 0, calculateNextVotingTime(0, false));
      daoStorage().setDraftVotingClaim(_proposalId, msg.sender);
      daoQuarterPoint().add(msg.sender, get_uint_config(QUARTER_POINT_CLAIM_RESULT), false);
  }

  function claimVotingResult(bytes32 _proposalId)
      public
      if_main_phase()
      if_not_claimed(_proposalId, 0)
      if_after_reveal_phase(_proposalId)
      if_dao_member()
      returns (bool _passed)
  {
      address[] memory _allStakeHolders = daoListingService().listParticipants(10000, true);
      DaoStructs.VotingCount _count;
      (_count.forCount, _count.againstCount, _count.quorum) = daoStorage().readVotingCount(_proposalId, 0, _allStakeHolders);
      require(_count.quorum > daoCalculatorService().minimumVotingQuorum(_proposalId, 0));
      require(daoCalculatorService().votingQuotaPass(_count.forCount, _count.againstCount));
      _passed = true;
      daoStorage().setProposalPass(_proposalId, 0, _passed);
      daoStorage().setVotingClaim(_proposalId, 0, msg.sender); // 0 for voting, interim starts from 1
      daoQuarterPoint().add(msg.sender, get_uint_config(QUARTER_POINT_CLAIM_RESULT), false);

      // set deadline of milestone 1 (set startTime for next interim voting round)
      DaoStructs.MilestoneInfo _info;
      (_info.index, _info.duration, _info.funding,) = daoStorage().readProposalMilestone(_proposalId, 0);
      daoStorage().setProposalVotingTime(_proposalId, 1, calculateNextVotingTime(_info.duration, true));

      // update claimable funds
      daoFundingManager().allocateEth(daoStorage().readProposalProposer(_proposalId), _info.funding);
  }

  function claimInterimVotingResult(bytes32 _proposalId, uint256 _index)
      public
      if_main_phase()
      if_not_claimed(_proposalId, _index)
      if_after_interim_reveal_phase(_proposalId, _index)
      if_dao_member()
      returns (bool _passed)
  {
      address[] memory _allStakeHolders = daoListingService().listParticipants(10000, true);
      DaoStructs.VotingCount _count;
      (_count.forCount, _count.againstCount, _count.quorum) = daoStorage().readVotingCount(_proposalId, _index, _allStakeHolders);
      if ((_count.quorum > daoCalculatorService().minimumVotingQuorum(_proposalId, _index)) ||
            (daoCalculatorService().votingQuotaPass(_count.forCount, _count.againstCount))) {
        _passed = true;
      }
      daoStorage().setProposalPass(_proposalId, _index, _passed);
      daoStorage().setVotingClaim(_proposalId, _index, msg.sender);
      daoQuarterPoint().add(msg.sender, get_uint_config(QUARTER_POINT_CLAIM_RESULT), false);

      DaoStructs.Users _bonusVoters;
      if (_passed) {
        // give quarter points to proposer for finishing the milestone
        daoQuarterPoint().add(daoStorage().readProposalProposer(_proposalId), get_uint_config(QUARTER_POINT_MILESTONE_COMPLETION), false);

        // give bonus points for all those who
        // voted YES in the previous round
        (_bonusVoters.users, _bonusVoters.usersLength) = daoStorage().readVotingRoundVotes(_proposalId, _index-1, _allStakeHolders, true);

        // set deadline for next milestone (set startTime for next interim voting round)
        DaoStructs.MilestoneInfo _info;
        (_info.index, _info.duration, _info.funding, _info.finalReward) = daoStorage().readProposalMilestone(_proposalId, _index);
        if (_info.duration > 0 && _info.funding > 0) {
          daoStorage().setProposalVotingTime(_proposalId, _index + 1, calculateNextVotingTime(_info.duration, true));
          // update claimable funds
          daoFundingManager().allocateEth(daoStorage().readProposalProposer(_proposalId), _info.funding);
        } else {
          // give final reward
          daoFundingManager().allocateEth(daoStorage().readProposalProposer(_proposalId), _info.finalReward);
        }
      } else {
        // give bonus points for all those who
        // voted NO in the previous round
        (_bonusVoters.users, _bonusVoters.usersLength) = daoStorage().readVotingRoundVotes(_proposalId, _index-1, _allStakeHolders, false);
      }
      if (_bonusVoters.usersLength > 0) addBonusReputation(_bonusVoters.users, _bonusVoters.usersLength);
  }

  function claimSpecialProposalVotingResult(bytes32 _proposalId)
    public
    if_main_phase()
    if_dao_member()
    if_not_claimed_special(_proposalId)
    if_after_reveal_phase_special(_proposalId)
    returns (bool _passed)
  {
    address[] memory _allStakeHolders = daoListingService().listParticipants(10000, true);
    DaoStructs.VotingCount _count;
    (_count.forCount, _count.againstCount, _count.quorum) = daoSpecialStorage().readVotingCount(_proposalId, _allStakeHolders);
    if ((_count.quorum > daoCalculatorService().minimumVotingQuorumForSpecial()) ||
          (daoCalculatorService().votingQuotaForSpecialPass(_count.forCount, _count.againstCount))) {
      _passed = true;
    }
    daoSpecialStorage().setPass(_proposalId, _passed);
    daoSpecialStorage().setVotingClaim(_proposalId, msg.sender);
    daoQuarterPoint().add(msg.sender, get_uint_config(QUARTER_POINT_CLAIM_RESULT), false);
    if (_passed) {
      setConfigs(_proposalId);
    }
  }

  function addBonusReputation(address[] _voters, uint256 _n)
      private
  {
      uint256 _qp = get_uint_config(QUARTER_POINT_VOTE);
      uint256 _rate = get_uint_config(BONUS_REPUTATION_NUMERATOR);
      uint256 _base = get_uint_config(BONUS_REPUTATION_DENOMINATOR);
      uint256 _p = get_uint_config(REPUTATION_PER_EXTRA_QP);
      for (uint256 i = 0; i < _n; i++) {
          daoReputationPoint().add(_voters[i], (_qp * _rate * _p)/_base);
      }
  }

  function calculateNextVotingTime(uint256 _time, bool _isInterim)
    private
    returns (uint256 _votingTime)
  {
    _votingTime = now + _time;
    uint256 _timeToGo = getTimeFromNextLockingPhase(now + _time);
    if (_isInterim) {
      if (_timeToGo < get_uint_config(CONFIG_INTERIM_PHASE_TOTAL)) {
        _votingTime = now + _time + _timeToGo + get_uint_config(CONFIG_LOCKING_PHASE_DURATION);
      }
    } else {
      if (_timeToGo < get_uint_config(CONFIG_VOTING_PHASE_TOTAL)) {
        _votingTime = now + _time + _timeToGo + get_uint_config(CONFIG_LOCKING_PHASE_DURATION);
      }
    }
  }

  function setConfigs(bytes32 _proposalId)
    private
  {
    uint256[] memory _uintConfigs;
    address[] memory _addressConfigs;
    bytes32[] memory _bytesConfigs;
    (
      _uintConfigs,
      _addressConfigs,
      _bytesConfigs
    ) = daoSpecialStorage().readConfigs(_proposalId);
    daoConfigsStorage().updateUintConfigs(_uintConfigs);
  }
}
