pragma solidity ^0.4.24;

import "../../storage/DaoProposalCounterStorage.sol";

contract MockDaoProposalCounterStorage is DaoProposalCounterStorage {

    constructor(address _resolver) public DaoProposalCounterStorage(_resolver) {
    }

    function mock_set_proposal_count(uint256 _quarterId, uint256 _count)
        public
    {
        proposalCountByQuarter[_quarterId] = _count;
    }
}
