pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";
import "../lib/DaoStructs.sol";

contract IntermediateResultsStorage is ResolverClient, DaoConstants {
    using DaoStructs for DaoStructs.IntermediateResults;

    function IntermediateResultsStorage(address _resolver) public {
        require(init(CONTRACT_STORAGE_INTERMEDIATE_RESULTS, _resolver));
    }

    mapping (bytes32 => DaoStructs.IntermediateResults) allIntermediateResults;

    function getIntermediateResults(bytes32 _key)
        public
        returns (
            address _countedUntil,
            uint256 _currentForCount,
            uint256 _currentAgainstCount,
            uint256 _currentQuorum,
            uint256 _currentSumOfEffectiveBalance
        )
    {
        _countedUntil = allIntermediateResults[_key].countedUntil;
        _currentForCount = allIntermediateResults[_key].currentForCount;
        _currentAgainstCount = allIntermediateResults[_key].currentAgainstCount;
        _currentQuorum = allIntermediateResults[_key].currentQuorum;
        _currentSumOfEffectiveBalance = allIntermediateResults[_key].currentSumOfEffectiveBalance;
    }

    function resetIntermediateResults(bytes32 _key)
        public
        if_sender_is_from([CONTRACT_DAO_REWARDS_MANAGER, CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_SPECIAL_VOTING_CLAIMS])
    {
        allIntermediateResults[_key].countedUntil = address(0x0);
    }

    function setIntermediateResults(
        bytes32 _key,
        address _countedUntil,
        uint256 _currentForCount,
        uint256 _currentAgainstCount,
        uint256 _currentQuorum,
        uint256 _currentSumOfEffectiveBalance
    )
        public
        if_sender_is_from([CONTRACT_DAO_REWARDS_MANAGER, CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_SPECIAL_VOTING_CLAIMS])
    {
        allIntermediateResults[_key].countedUntil = _countedUntil;
        allIntermediateResults[_key].currentForCount = _currentForCount;
        allIntermediateResults[_key].currentAgainstCount = _currentAgainstCount;
        allIntermediateResults[_key].currentQuorum = _currentQuorum;
        allIntermediateResults[_key].currentSumOfEffectiveBalance = _currentSumOfEffectiveBalance;
    }
}
