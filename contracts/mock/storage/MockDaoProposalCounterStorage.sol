pragma solidity ^0.4.25;

import "../../storage/DaoProposalCounterStorage.sol";

contract MockDaoProposalCounterStorage is DaoProposalCounterStorage {

    constructor(address _resolver) public DaoProposalCounterStorage(_resolver) {
    }

    function mock_set_proposal_count(uint256 _quarterNumber, uint256 _count)
        public
    {
        proposalCountByQuarter[_quarterNumber] = _count;
    }
}
