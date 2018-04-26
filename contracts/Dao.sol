pragma solidity ^0.4.19;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "./common/DaoCommon.sol";

contract Dao is DaoCommon {

    function Dao(address _resolver) public {
        require(init(CONTRACT_DAO, _resolver));
    }

    function submitPreproposal(
        bytes32 docIpfsHash,
        uint256[] milestoneDurations,
        uint256[] milestonesFundings
    )
        public
        returns (bool _success)
    {
        address _proposer = msg.sender;
        require(identity_storage().is_kyc_approved(_proposer));
        /* createProposal(docIpfsHash, milestoneDurations, milestonesFundings); */
        _success = true;
    }

}
