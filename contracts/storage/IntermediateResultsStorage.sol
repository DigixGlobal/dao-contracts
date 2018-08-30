pragma solidity ^0.4.24;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";
import "../lib/DaoStructs.sol";

contract IntermediateResultsStorage is ResolverClient, DaoConstants {
    using DaoStructs for DaoStructs.IntermediateResults;

    constructor(address _resolver) public {
        require(init(CONTRACT_STORAGE_INTERMEDIATE_RESULTS, _resolver));
    }

    // There are scenarios in which we must loop across all participants/moderators
    // in a function call. For a big number of operations, the function call may be short of gas
    // To tackle this, we use an IntermediateResults struct to store the intermediate results
    // The same function is then called multiple times until all operations are completed
    // If the operations cannot be done in that iteration, the intermediate results are stored
    // else, the final outcome is returned
    // Please check the lib/DaoStructs for docs on this struct
    mapping (bytes32 => DaoStructs.IntermediateResults) allIntermediateResults;

    function getIntermediateResults(bytes32 _key)
        public
        constant
        returns (
            address _countedUntil,
            uint256 _currentForCount,
            uint256 _currentAgainstCount,
            uint256 _currentSumOfEffectiveBalance
        )
    {
        _countedUntil = allIntermediateResults[_key].countedUntil;
        _currentForCount = allIntermediateResults[_key].currentForCount;
        _currentAgainstCount = allIntermediateResults[_key].currentAgainstCount;
        _currentSumOfEffectiveBalance = allIntermediateResults[_key].currentSumOfEffectiveBalance;
    }

    function resetIntermediateResults(bytes32 _key)
        public
    {
        require(sender_is_from([CONTRACT_DAO_REWARDS_MANAGER, CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_SPECIAL_VOTING_CLAIMS]));
        allIntermediateResults[_key].countedUntil = address(0x0);
    }

    function setIntermediateResults(
        bytes32 _key,
        address _countedUntil,
        uint256 _currentForCount,
        uint256 _currentAgainstCount,
        uint256 _currentSumOfEffectiveBalance
    )
        public
    {
        require(sender_is_from([CONTRACT_DAO_REWARDS_MANAGER, CONTRACT_DAO_VOTING_CLAIMS, CONTRACT_DAO_SPECIAL_VOTING_CLAIMS]));
        allIntermediateResults[_key].countedUntil = _countedUntil;
        allIntermediateResults[_key].currentForCount = _currentForCount;
        allIntermediateResults[_key].currentAgainstCount = _currentAgainstCount;
        allIntermediateResults[_key].currentSumOfEffectiveBalance = _currentSumOfEffectiveBalance;
    }
}
