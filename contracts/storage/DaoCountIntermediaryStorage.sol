pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./../common/DaoConstants.sol";
import "./../lib/DaoIntermediateStructs.sol";

contract DaoCountIntermediaryStorage is ResolverClient, DaoConstants {
    using DaoIntermediateStructs for DaoIntermediateStructs.CountIntermediaryStruct;

    mapping(bytes32 => DaoIntermediateStructs.CountIntermediaryStruct) countStates;

    function DaoCountIntermediaryStorage(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO_INTERMEDIARY, _resolver));
    }

    function updateIntermediaryState(
        bytes32 _proposalId,
        address _countedUntil,
        uint256 _forCount,
        uint256 _againstCount
    )
        public
        if_sender_is(CONTRACT_DAO_VOTING_CLAIMS)
    {
        countStates[_proposalId].countedUntil = _countedUntil;
        countStates[_proposalId].forCount = _forCount;
        countStates[_proposalId].againstCount = _againstCount;
    }

    function readIntermediaryState(
        bytes32 _proposalId
    )
        public
        returns (address _countedUntil, uint256 _forCount, uint256 _againstCount)
    {
        _countedUntil = countStates[_proposalId].countedUntil;
        _forCount = countStates[_proposalId].forCount;
        _againstCount = countStates[_proposalId].againstCount;
    }
}
