pragma solidity ^0.4.25;

import "./../interface/DgxDemurrageCalculator.sol";
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


    /**
    @notice Calculate the additional lockedDGDStake, given the DGDs that the user has just locked in
    @dev The earlier the locking happens, the more lockedDGDStake the user will get
         The formula is: additionalLockedDGDStake = (90 - t)/80 * additionalDGD if t is more than 10. If t<=10, additionalLockedDGDStake = additionalDGD
    */
    function calculateAdditionalLockedDGDStake(uint256 _additionalDgd)
        public
        view
        returns (uint256 _additionalLockedDGDStake)
    {
        _additionalLockedDGDStake =
            _additionalDgd.mul(
                getUintConfig(CONFIG_QUARTER_DURATION)
                .sub(
                    MathHelper.max(
                        currentTimeInQuarter(),
                        getUintConfig(CONFIG_LOCKING_PHASE_DURATION)
                    )
                )
            )
            .div(
                getUintConfig(CONFIG_QUARTER_DURATION)
                .sub(getUintConfig(CONFIG_LOCKING_PHASE_DURATION))
            );
    }


    // Quorum is in terms of lockedDGDStake
    function minimumDraftQuorum(bytes32 _proposalId)
        public
        view
        returns (uint256 _minQuorum)
    {
        uint256[] memory _fundings;

        (_fundings,) = daoStorage().readProposalFunding(_proposalId);
        _minQuorum = calculateMinQuorum(
            daoStakeStorage().totalModeratorLockedDGDStake(),
            getUintConfig(CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR),
            getUintConfig(CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR),
            getUintConfig(CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR),
            getUintConfig(CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR),
            _fundings[0]
        );
    }


    function draftQuotaPass(uint256 _for, uint256 _against)
        public
        view
        returns (bool _passed)
    {
        _passed = _for.mul(getUintConfig(CONFIG_DRAFT_QUOTA_DENOMINATOR))
                > getUintConfig(CONFIG_DRAFT_QUOTA_NUMERATOR).mul(_for.add(_against));
    }


    // Quorum is in terms of lockedDGDStake
    function minimumVotingQuorum(bytes32 _proposalId, uint256 _milestone_id)
        public
        view
        returns (uint256 _minQuorum)
    {
        require(senderIsAllowedToRead());
        uint256[] memory _weiAskedPerMilestone;
        uint256 _finalReward;
        (_weiAskedPerMilestone,_finalReward) = daoStorage().readProposalFunding(_proposalId);
        require(_milestone_id <= _weiAskedPerMilestone.length);
        if (_milestone_id == _weiAskedPerMilestone.length) {
            // calculate quorum for the final voting round
            _minQuorum = calculateMinQuorum(
                daoStakeStorage().totalLockedDGDStake(),
                getUintConfig(CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR),
                getUintConfig(CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR),
                getUintConfig(CONFIG_FINAL_REWARD_SCALING_FACTOR_NUMERATOR),
                getUintConfig(CONFIG_FINAL_REWARD_SCALING_FACTOR_DENOMINATOR),
                _finalReward
            );
        } else {
            // calculate quorum for a voting round
            _minQuorum = calculateMinQuorum(
                daoStakeStorage().totalLockedDGDStake(),
                getUintConfig(CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR),
                getUintConfig(CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR),
                getUintConfig(CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR),
                getUintConfig(CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR),
                _weiAskedPerMilestone[_milestone_id]
            );
        }
    }


    // Quorum is in terms of lockedDGDStake
    function minimumVotingQuorumForSpecial()
        public
        view
        returns (uint256 _minQuorum)
    {
      _minQuorum = getUintConfig(CONFIG_SPECIAL_PROPOSAL_QUORUM_NUMERATOR).mul(
                       daoStakeStorage().totalLockedDGDStake()
                   ).div(
                       getUintConfig(CONFIG_SPECIAL_PROPOSAL_QUORUM_DENOMINATOR)
                   );
    }


    function votingQuotaPass(uint256 _for, uint256 _against)
        public
        view
        returns (bool _passed)
    {
        _passed = _for.mul(getUintConfig(CONFIG_VOTING_QUOTA_DENOMINATOR))
                > getUintConfig(CONFIG_VOTING_QUOTA_NUMERATOR).mul(_for.add(_against));
    }


    function votingQuotaForSpecialPass(uint256 _for, uint256 _against)
        public
        view
        returns (bool _passed)
    {
        _passed =_for.mul(getUintConfig(CONFIG_SPECIAL_QUOTA_DENOMINATOR))
                > getUintConfig(CONFIG_SPECIAL_QUOTA_NUMERATOR).mul(_for.add(_against));
    }


    function calculateMinQuorum(
        uint256 _totalStake,
        uint256 _fixedQuorumPortionNumerator,
        uint256 _fixedQuorumPortionDenominator,
        uint256 _scalingFactorNumerator,
        uint256 _scalingFactorDenominator,
        uint256 _weiAsked
    )
        internal
        view
        returns (uint256 _minimumQuorum)
    {
        uint256 _weiInDao = weiInDao();
        // add the fixed portion of the quorum
        _minimumQuorum = (_totalStake.mul(_fixedQuorumPortionNumerator)).div(_fixedQuorumPortionDenominator);

        // add the dynamic portion of the quorum
        _minimumQuorum = _minimumQuorum.add(_totalStake.mul(_weiAsked.mul(_scalingFactorNumerator)).div(_weiInDao.mul(_scalingFactorDenominator)));
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
        (_demurrageFees,) = DgxDemurrageCalculator(dgxDemurrageCalculatorAddress).calculateDemurrage(_balance, _daysElapsed);
    }

}
