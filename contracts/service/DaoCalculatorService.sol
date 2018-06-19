pragma solidity ^0.4.19;

import "./../mock/MockDgxDemurrageCalculator.sol";
import "./../common/DaoCommon.sol";
import "./../lib/MathHelper.sol";

contract DaoCalculatorService is DaoCommon {

    address public dgxDemurrageCalculatorAddress;

    using MathHelper for MathHelper;

    function DaoCalculatorService(address _resolver, address _dgxDemurrageCalculatorAddress)
      public
    {
      require(init(CONTRACT_SERVICE_DAO_CALCULATOR, _resolver));
      dgxDemurrageCalculatorAddress = _dgxDemurrageCalculatorAddress;
    }

    function calculateAdditionalLockedDGDStake(uint256 _additionalDgd)
        public
        returns (uint256 _additionalLockedDGDStake)
    {
        // todo: change this to fixed quarter duration
        /* _additionalLockedDGDStake = _additionalDgd * (QUARTER_DURATION - currentTInQuarter()) / (QUARTER_DURATION - get_uint_config(CONFIG_LOCKING_PHASE_DURATION)); */
        _additionalLockedDGDStake = _additionalDgd * (get_uint_config(CONFIG_QUARTER_DURATION) - MathHelper.max(currentTInQuarter(), get_uint_config(CONFIG_LOCKING_PHASE_DURATION))) /
                                    (get_uint_config(CONFIG_QUARTER_DURATION) - get_uint_config(CONFIG_LOCKING_PHASE_DURATION));
    }

    function minimumDraftQuorum(bytes32 _proposalId) public returns (uint256 _minQuorum) {
        uint256 _ethAsked;
        //TODO: implement this function
        (,_ethAsked) = daoStorage().readProposalFunding(_proposalId);
        _minQuorum = calculateMinQuorum(
            daoStakeStorage().totalModeratorLockedDGDStake(),
            get_uint_config(CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR),
            get_uint_config(CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR),
            get_uint_config(CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR),
            get_uint_config(CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR),
            _ethAsked
        );
    }

    function draftQuotaPass(uint256 _for, uint256 _against)
        public
        returns (bool _passed)
    {
        if ((_for * get_uint_config(CONFIG_DRAFT_QUOTA_DENOMINATOR)) >
                (get_uint_config(CONFIG_DRAFT_QUOTA_NUMERATOR) * (_for + _against))) {
            _passed = true;
        }
    }

    function minimumVotingQuorum(bytes32 _proposalId, uint256 _milestone_id)
        public
        returns (uint256 _minQuorum)
    {
      uint256[] memory _ethAskedPerMilestone;
      //TODO: implement this function
      (_ethAskedPerMilestone,) = daoStorage().readProposalFunding(_proposalId);
      _minQuorum = calculateMinQuorum(
          daoStakeStorage().totalLockedDGDStake(),
          get_uint_config(CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR),
          get_uint_config(CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR),
          get_uint_config(CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR),
          get_uint_config(CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR),
          _ethAskedPerMilestone[_milestone_id]
      );
    }

    function minimumVotingQuorumForSpecial()
        public
        returns (uint256 _minQuorum)
    {
      //TODO: implement this function
      _minQuorum = get_uint_config(CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR) *
                     daoStakeStorage().totalLockedDGDStake() /
                     get_uint_config(CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR);
    }

    function votingQuotaPass(uint256 _for, uint256 _against)
        public
        returns (bool _passed)
    {
        if ((_for * get_uint_config(CONFIG_VOTING_QUOTA_DENOMINATOR)) >
                (get_uint_config(CONFIG_VOTING_QUOTA_NUMERATOR) * (_for + _against))) {
            _passed = true;
        }
    }

    function votingQuotaForSpecialPass(uint256 _for, uint256 _against)
        public
        returns (bool _passed)
    {
        if ((_for * get_uint_config(CONFIG_SPECIAL_QUOTA_DENOMINATOR)) >
                (get_uint_config(CONFIG_SPECIAL_QUOTA_NUMERATOR) * (_for + _against))) {
            _passed = true;
        }
    }

    function calculateMinQuorum(
        uint256 _totalStake,
        uint256 _fixedQuorumPortionNumerator,
        uint256 _fixedQuorumPortionDenominator,
        uint256 _scalingFactorNumerator,
        uint256 _scalingFactorDenominator,
        uint256 _ethAsked
    )
        internal
        returns (uint256 _minimumQuorum)
    {
        uint256 _ethInDao = get_contract(CONTRACT_DAO_FUNDING_MANAGER).balance;
        // add the fixed portion of the quorum
        _minimumQuorum = (_totalStake * _fixedQuorumPortionNumerator) / _fixedQuorumPortionDenominator;

        // add the dynamic portion of the quorum
        _minimumQuorum += (_totalStake * _ethAsked * _scalingFactorNumerator) / (_ethInDao * _scalingFactorDenominator);
    }

    function calculateUserEffectiveBalance(
        uint256 _minimalParticipationPoint,
        uint256 _quarterPointScalingFactor,
        uint256 _reputationPointScalingFactor,
        uint256 _quarterPoint,
        uint256 _reputationPoint,
        uint256 _lockedDGDStake
    )
        public
        pure
        returns (uint256 _effectiveDGDBalance)
    {
        uint256 _baseDGDBalance = MathHelper.min(_quarterPoint, _minimalParticipationPoint) * _lockedDGDStake / _minimalParticipationPoint;
        _effectiveDGDBalance =
            _baseDGDBalance
            * (_quarterPointScalingFactor + _quarterPoint - _minimalParticipationPoint)
            * (_reputationPointScalingFactor + _reputationPoint)
            / (_quarterPointScalingFactor * _reputationPointScalingFactor);
    }

    function calculateDemurrage(uint256 _balance, uint256 _daysElapsed)
        public
        view
        returns (uint256 _demurrageFees)
    {
        (_demurrageFees,) = MockDgxDemurrageCalculator(dgxDemurrageCalculatorAddress).calculateDemurrage(_balance, _daysElapsed);
    }


}
