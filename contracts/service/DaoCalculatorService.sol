pragma solidity ^0.4.19;

import "./../common/DaoCommon.sol";

contract DaoCalculatorService is DaoCommon {

    function DaoCalculatorService(address _resolver)
      public
    {
      require(init(CONTRACT_DAO_CALCULATOR_SERVICE, _resolver));
    }

    function calculateAdditionalLockedDGDStake(uint256 _additionalDgd)
        public
        returns (uint256 _additionalLockedDGDStake)
    {
        _additionalLockedDGDStake = _additionalDgd * (QUARTER_DURATION - currentTInQuarter()) / (QUARTER_DURATION - get_uint_config(CONFIG_LOCKING_PHASE_DURATION));
    }

    function minimumDraftQuorum(bytes32 _proposalId) public returns (uint256 _minQuorum) {
        uint256 _ethAsked;
        //TODO: implement this function
        (,_ethAsked) = daoStorage().readProposalFunding(_proposalId);
        _minQuorum = calculateMinQuorum(
            daoStakeStorage().totalLockedBadges(),
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

    function votingQuotaPass(uint256 _for, uint256 _against)
        public
        returns (bool _passed)
    {
        if ((_for * get_uint_config(CONFIG_VOTING_QUOTA_DENOMINATOR)) >
                (get_uint_config(CONFIG_VOTING_QUOTA_NUMERATOR) * (_for + _against))) {
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

}
