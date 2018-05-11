pragma solidity ^0.4.19;
import "./common/DaoCommon.sol";

contract DaoFundingManager is DaoCommon {

    function DaoFundingManager(address _resolver) public {
        require(init(CONTRACT_DAO_FUNDING_MANAGER, _resolver));
    }

    function claimFunding(uint256 _proposal_id, uint256 _milestone_id)
        public
    {
        //check ....

    }

    function moveFundsToNewDao(address _destinationForDaoFunds)
        if_sender_is(CONTRACT_DAO)
        public
    {
        uint256 _remainingBalance = address(this).balance;
        daoFundingStorage().withdrawEth(_remainingBalance);
        _destinationForDaoFunds.transfer(_remainingBalance);
    }

    // receive ETH from the Crowdsale contract
    function () payable public {
        daoFundingStorage().addEth(msg.value);
    }

}
