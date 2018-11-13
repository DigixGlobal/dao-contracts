pragma solidity ^0.4.25;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

contract DaoProposalCounterStorage is ResolverClient, DaoConstants {

    constructor(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO_COUNTER, _resolver));
    }

    // This is to mark the number of proposals that have been funded in a specific quarter
    // this is to take care of the cap on the number of funded proposals in a quarter
    mapping (uint256 => uint256) public proposalCountByQuarter;

    function addNonDigixProposalCountInQuarter(uint256 _quarterIndex)
        public
    {
        require(sender_is(CONTRACT_DAO_VOTING_CLAIMS));
        proposalCountByQuarter[_quarterIndex] = proposalCountByQuarter[_quarterIndex].add(1);
    }
}
