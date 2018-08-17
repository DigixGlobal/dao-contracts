pragma solidity ^0.4.24;

import "./../mock/MockDgxDemurrageCalculator.sol";
import "./../common/DaoCommon.sol";
import "./../lib/MathHelper.sol";

contract DaoCalculatorService is DaoCommon {

    address public dgxDemurrageCalculatorAddress;

    using MathHelper for MathHelper;

    constructor(address _resolver, address _dgxDemurrageCalculatorAddress)
        public
    {
        require(init(CONTRACT_SERVICE_DAO_CALCULATOR, _resolver));
        dgxDemurrageCalculatorAddress = _dgxDemurrageCalculatorAddress;
    }

    function calculateAdditionalLockedDGDStake(uint256 _additionalDgd)
        public
        constant
        returns (uint256 _additionalLockedDGDStake)
    {
        // todo: change this to fixed quarter duration
        /* _additionalLockedDGDStake = _additionalDgd.mul(QUARTER_DURATION.sub(currentTInQuarter())).div(QUARTER_DURATION.sub(get_uint_config(CONFIG_LOCKING_PHASE_DURATION))); */
        _additionalLockedDGDStake = _additionalDgd.mul((get_uint_config(CONFIG_QUARTER_DURATION).sub(MathHelper.max(currentTInQuarter(), get_uint_config(CONFIG_LOCKING_PHASE_DURATION)))))
                                    .div(get_uint_config(CONFIG_QUARTER_DURATION).sub(get_uint_config(CONFIG_LOCKING_PHASE_DURATION)));
    }

    function minimumDraftQuorum(bytes32 _proposalId)
        public
        constant
        returns (uint256 _minQuorum)
    {
        uint256[] memory _fundings;

        (_fundings,) = daoStorage().readProposalFunding(_proposalId);
        _minQuorum = calculateMinQuorum(
            daoStakeStorage().totalModeratorLockedDGDStake(),
            get_uint_config(CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR),
            get_uint_config(CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR),
            get_uint_config(CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR),
            get_uint_config(CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR),
            _fundings[0]
        );
    }

    function draftQuotaPass(uint256 _for, uint256 _against)
        public
        constant
        returns (bool _passed)
    {
        if ((_for.mul(get_uint_config(CONFIG_DRAFT_QUOTA_DENOMINATOR))) >
                (get_uint_config(CONFIG_DRAFT_QUOTA_NUMERATOR).mul(_for.add(_against)))) {
            _passed = true;
        }
    }

    function minimumVotingQuorum(bytes32 _proposalId, uint256 _milestone_id)
        public
        constant
        returns (uint256 _minQuorum)
    {
        uint256[] memory _ethAskedPerMilestone;
        uint256 _finalReward;
        (_ethAskedPerMilestone,_finalReward) = daoStorage().readProposalFunding(_proposalId);
        require(_milestone_id <= _ethAskedPerMilestone.length);
        if (_milestone_id == _ethAskedPerMilestone.length) {
            _minQuorum = calculateMinQuorum(
                daoStakeStorage().totalLockedDGDStake(),
                get_uint_config(CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR),
                get_uint_config(CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR),
                get_uint_config(CONFIG_FINAL_REWARD_SCALING_FACTOR_NUMERATOR),
                get_uint_config(CONFIG_FINAL_REWARD_SCALING_FACTOR_DENOMINATOR),
                _finalReward
            );
        } else {
            _minQuorum = calculateMinQuorum(
                daoStakeStorage().totalLockedDGDStake(),
                get_uint_config(CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR),
                get_uint_config(CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR),
                get_uint_config(CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR),
                get_uint_config(CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR),
                _ethAskedPerMilestone[_milestone_id]
            );
        }
    }

    function minimumVotingQuorumForSpecial()
        public
        constant
        returns (uint256 _minQuorum)
    {
      _minQuorum = get_uint_config(CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR).mul(
                       daoStakeStorage().totalLockedDGDStake()
                   ).div(
                       get_uint_config(CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR)
                   );
    }

    function votingQuotaPass(uint256 _for, uint256 _against)
        public
        constant
        returns (bool _passed)
    {
        if ((_for.mul(get_uint_config(CONFIG_VOTING_QUOTA_DENOMINATOR))) >
                (get_uint_config(CONFIG_VOTING_QUOTA_NUMERATOR).mul(_for.add(_against)))) {
            _passed = true;
        }
    }

    function votingQuotaForSpecialPass(uint256 _for, uint256 _against)
        public
        constant
        returns (bool _passed)
    {
        if ((_for.mul(get_uint_config(CONFIG_SPECIAL_QUOTA_DENOMINATOR))) >
                (get_uint_config(CONFIG_SPECIAL_QUOTA_NUMERATOR).mul(_for.add(_against)))) {
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
        constant
        returns (uint256 _minimumQuorum)
    {
        uint256 _ethInDao = get_contract(CONTRACT_DAO_FUNDING_MANAGER).balance;
        // add the fixed portion of the quorum
        _minimumQuorum = (_totalStake.mul(_fixedQuorumPortionNumerator)).div(_fixedQuorumPortionDenominator);

        // add the dynamic portion of the quorum
        _minimumQuorum = _minimumQuorum.add(_totalStake.mul(_ethAsked.mul(_scalingFactorNumerator)).div(_ethInDao.mul(_scalingFactorDenominator)));
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
        uint256 _baseDGDBalance = MathHelper.min(_quarterPoint, _minimalParticipationPoint).mul(_lockedDGDStake).div(_minimalParticipationPoint);
        _effectiveDGDBalance =
            _baseDGDBalance
            .mul(_quarterPointScalingFactor.add(_quarterPoint).sub(_minimalParticipationPoint))
            .mul(_reputationPointScalingFactor.add(_reputationPoint))
            .div(_quarterPointScalingFactor.mul(_reputationPointScalingFactor));
    }

    function calculateDemurrage(uint256 _balance, uint256 _daysElapsed)
        public
        view
        returns (uint256 _demurrageFees)
    {
        (_demurrageFees,) = MockDgxDemurrageCalculator(dgxDemurrageCalculatorAddress).calculateDemurrage(_balance, _daysElapsed);
    }


}
