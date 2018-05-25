pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./common/DaoCommon.sol";
import "./lib/DaoStructs.sol";
import "./service/DaoCalculatorService.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

// this contract will receive DGXs fees from the DGX fees distributors
contract DaoRewardsManager is DaoCommon {

    using DaoStructs for DaoStructs.DaoQuarterInfo;
    using MathHelper for MathHelper;

  function DaoRewardsManager(address _resolver)
           public
  {
    require(init(CONTRACT_DAO_REWARDS_MANAGER, _resolver));
  }

  function daoCalculatorService()
      internal
      returns (DaoCalculatorService _contract)
  {
      _contract = DaoCalculatorService(get_contract(CONTRACT_DAO_CALCULATOR_SERVICE));
  }

    function claimRewards(uint256[] quarters)
        public
    {
        // withdraw from his claimableDGXs
    }

    function allocateFinalReward(bytes32 _proposalId)
      public
      if_sender_is(CONTRACT_DAO)
    {
      // allocate rewards to proposer based on how big the project was?
    }

    function updateRewardsBeforeNewQuarter(address _user)
        public
    {
        uint256 _currentQuarter = currentQuarterIndex();
        // do nothing if the rewards was already updated for the previous quarter
        if (daoRewardsStorage().lastQuarterThatRewardsWasUpdated(_user) >= _currentQuarter - 1 ) {
            return;
        }

        calculateUserRewardsLastQuarter(_user);

        // update reputationPoint for this quarter
        uint256 _userQP = daoPointsStorage().getQuarterPoint(_user, _currentQuarter - 1);
        uint256 _userRP = daoPointsStorage().getReputation(_user);

        // first, deduct RP for non participating quarters:
        uint256 _lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(_user);
        uint256 _reputationDeduction = (_currentQuarter - 1 - _lastParticipatedQuarter) *
            ( get_uint_config(CONFIG_MAXIMUM_REPUTATION_DEDUCTION) + get_uint_config(CONFIG_PUNISHMENT_FOR_NOT_LOCKING));
        daoPointsStorage().subtractReputation(_user, _reputationDeduction);

        _userRP = daoPointsStorage().getReputation(_user);

        // now, we add/deduct RP based on _userQP;
        if (_userQP < get_uint_config(MINIMUM_QUARTER_POINT)) {
            _reputationDeduction = (get_uint_config(MINIMUM_QUARTER_POINT) - _userQP)
                * get_uint_config(CONFIG_MAXIMUM_REPUTATION_DEDUCTION)
                / get_uint_config(MINIMUM_QUARTER_POINT);
            daoPointsStorage().subtractReputation(_user, _reputationDeduction);
        } else {
            daoPointsStorage().addReputation(
                _user,
                (_userQP - get_uint_config(MINIMUM_QUARTER_POINT))
                * get_uint_config(CONFIG_REPUTATION_PER_EXTRA_QP_NUM)
                / get_uint_config(CONFIG_REPUTATION_PER_EXTRA_QP_DEN)
            );
        }
    }

    // to be called to calculate and update the user rewards for the last participating quarter;
    function calculateUserRewardsLastQuarter(address _user)
        public
    {
        // the last participating quarter must be:
        // - over
        // - after the lastQuarterThatRewardsWasUpdated
        uint256 _lastParticipatedQuarter = daoRewardsStorage().lastParticipatedQuarter(_user);
        require(currentQuarterIndex() > _lastParticipatedQuarter);

        uint256 _lastQuarterThatRewardsWasUpdated = daoRewardsStorage().lastQuarterThatRewardsWasUpdated(_user);
        require(_lastParticipatedQuarter > _lastQuarterThatRewardsWasUpdated);

        // now we will calculate the user rewards based on info of the _lastParticipatedQuarter
        DaoStructs.DaoQuarterInfo memory _qInfo = readQuarterInfo(_lastParticipatedQuarter);

        // now we "deduct the demurrage" from the claimable DGXs for time period from
        // dgxDistributionDay of lastQuarterThatRewardsWasUpdated + 1 to dgxDistributionDay of lastParticipatedQuarter + 1
        uint256 _userClaimableDgx = daoRewardsStorage().claimableDGXs(_user);
        _userClaimableDgx -= daoCalculatorService().calculateDemurrage(
            _userClaimableDgx,
            (daoRewardsStorage().readDgxDistributionDay(_lastParticipatedQuarter + 1)
            - daoRewardsStorage().readDgxDistributionDay(_lastQuarterThatRewardsWasUpdated + 1))
            / (1 days) );

        // RP has been updated at the beginning of the lastParticipatedQuarter in
        // a call to updateRewardsBeforeNewQuarter();

        uint256 _dgxRewards;
        // calculate _dgxRewards; This is basically the DGXs that user can withdraw on the dgxDistributionDay of the last participated quarter
        // when user actually withdraw some time after that, he will be deducted demurrage.

        uint256 _effectiveDGDBalance = daoCalculatorService().calculateUserEffectiveDGDBalance(
            _qInfo.minimalParticipationPoint,
            _qInfo.quarterPointScalingFactor,
            _qInfo.reputationPointScalingFactor,
            daoPointsStorage().getQuarterPoint(_user, _lastParticipatedQuarter),
            daoPointsStorage().getReputation(_user),
            daoStakeStorage().lockedDGDStake(_user)
        );

        _dgxRewards = _effectiveDGDBalance *
            daoRewardsStorage().readRewardsPoolOfQuarter(_lastParticipatedQuarter)
            / _qInfo.totalEffectiveDGD;
        
        _userClaimableDgx += _dgxRewards;
        // update claimableDGXs. The calculation needs to take into account demurrage since the
        // dgxDistributionDay of the last quarter as well
        daoRewardsStorage().updateClaimableDGX(_user, _dgxRewards);

        // update lastQuarterThatRewardsWasUpdated
        daoRewardsStorage().updateLastQuarterThatRewardsWasUpdated(_user, _lastParticipatedQuarter);
    }

    // this is called by the founder after transfering the DGX fees into the DAO at
    // the beginning of the quarter
    function calculateGlobalRewardsBeforeNewQuarter()
        if_founder()
        public
    {
        // go through every participants, calculate their EffectiveDGD balance
        // and add up to get totalEffectiveDGD
        uint256 _noOfParticipants = daoStakeStorage().readTotalParticipant();
        address[] memory _allParticipants = daoListingService().listParticipants(_noOfParticipants, true);
        address _currentParticipant;
        require(currentQuarterIndex() > 0); // throw if this is the first quarter
        uint256 _previousQuarter = currentQuarterIndex() - 1;
        uint256 _totalEffectiveDGD;

        DaoStructs.DaoQuarterInfo memory _qInfo = readQuarterInfo(_previousQuarter);

        for (uint256 i=0;i<_noOfParticipants;i++) {
            _currentParticipant = _allParticipants[i];
            // check if this participant really did participate in the previous quarter
            if (daoRewardsStorage().lastParticipatedQuarter(_currentParticipant) < _previousQuarter) {
                continue;
            }
            _totalEffectiveDGD += daoCalculatorService().calculateUserEffectiveDGDBalance(
                _qInfo.minimalParticipationPoint,
                _qInfo.quarterPointScalingFactor,
                _qInfo.reputationPointScalingFactor,
                daoPointsStorage().getQuarterPoint(_currentParticipant, _previousQuarter),
                daoPointsStorage().getReputation(_currentParticipant),
                daoStakeStorage().lockedDGDStake(_currentParticipant)
            );
        }

        // calculate how much DGX rewards we got for this quarter
        uint256 _dgxRewardsPoolLastQuarter =
            ERC20(ADDRESS_DGX_TOKEN).balanceOf(address(this))
            + daoRewardsStorage().totalDGXsClaimed()
            - _qInfo.sumRewardsFromBeginning;

        // save the dgxRewardsPoolLastQuarter, totalEffectiveDGD as well as all the current configs to DaoRewardsStorage
        daoRewardsStorage().updateQuarterInfo(
            _previousQuarter + 1,
            get_uint_config(MINIMUM_QUARTER_POINT),
            get_uint_config(CONFIG_QUARTER_POINT_SCALING_FACTOR),
            get_uint_config(CONFIG_REPUTATION_POINT_SCALING_FACTOR),
            _totalEffectiveDGD,
            now,
            _dgxRewardsPoolLastQuarter,
            _qInfo.sumRewardsFromBeginning + _dgxRewardsPoolLastQuarter
        );
    }

    function readQuarterInfo(uint256 _quarterIndex)
        internal
        returns (DaoStructs.DaoQuarterInfo _qInfo)
    {
        (
            _qInfo.minimalParticipationPoint,
            _qInfo.quarterPointScalingFactor,
            _qInfo.reputationPointScalingFactor,
            _qInfo.totalEffectiveDGD,
            _qInfo.dgxDistributionDay,
            _qInfo.dgxRewardsPoolLastQuarter,
            _qInfo.sumRewardsFromBeginning
        ) = daoRewardsStorage().readQuarterInfo(_quarterIndex);
    }
}
