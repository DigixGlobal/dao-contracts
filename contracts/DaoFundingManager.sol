pragma solidity ^0.4.19;
import "./common/DaoCommon.sol";

contract DaoFundingManager is DaoCommon {

    function DaoFundingManager(address _resolver) public {
        require(init(CONTRACT_DAO_FUNDING_MANAGER, _resolver));
    }

    function claimEthFunding(bytes32 _proposalId)
        public
        if_from_proposer(_proposalId)
        if_prl_approved(_proposalId)
        returns (bool _success)
    {
        uint256 _value = daoFundingStorage().readClaimableEth(msg.sender);
        daoFundingStorage().updateClaimableEth(msg.sender, 0);
        msg.sender.transfer(_value);
        _success = true;
    }

    function allocateEth(address _proposer, uint256 _value)
        public
        if_sender_is(CONTRACT_DAO)
    {
        daoFundingStorage().updateClaimableEth(_proposer, _value);
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
