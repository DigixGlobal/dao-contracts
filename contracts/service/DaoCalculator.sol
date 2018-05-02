pragma solidity ^0.4.19;

import "./../common/DaoCommon.sol";

contract DaoCalculator is DaoCommon {

    function DaoCalculator(address _resolver)
      public
    {
      require(init(CONTRACT_DAO_CALCULATOR_SERVICE, _resolver));
    }

    function minimumDraftQuorum(bytes32 _proposalId) public returns (uint256 _minQuorum) {
        uint256 _ethAsked;
        //TODO: implement this function
        /* _ethAsked = daoStorage().getEthAsked(_proposalId); */
        _minQuorum = calculateMinQuorum(
            daoStakeStorage().totalLockedBadges(),
            get_uint_config(CONFIG_QUORUM_FIXED_PORTION_NUMERATOR),
            get_uint_config(CONFIG_QUORUM_FIXED_PORTION_DENOMINATOR),
            get_uint_config(CONFIG_QUORUM_SCALING_FACTOR_NUMERATOR),
            get_uint_config(CONFIG_QUORUM_SCALING_FACTOR_DENOMINATOR),
            _ethAsked
        );
    }

    function minimumVotingQuorum(bytes32 _proposalId) public returns (uint256 _minQuorum) {

    }

    function minimumInterimVotingQuorum(bytes32 _proposalId) public returns (uint256 _minQuorum) {

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
        _minimumQuorum = _totalStake * _fixedQuorumPortionNumerator / _fixedQuorumPortionDenominator;

        // add the dynamic portion of the quorum
        _minimumQuorum += _totalStake * _ethAsked * _scalingFactorNumerator / (_ethInDao * _scalingFactorDenominator);
    }

}
