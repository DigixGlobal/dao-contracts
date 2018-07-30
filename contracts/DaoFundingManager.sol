pragma solidity ^0.4.19;
import "./common/DaoCommon.sol";

/// @title Contract to manage DAO funds
/// @author Digix Holdings
contract DaoFundingManager is DaoCommon {

    function DaoFundingManager(address _resolver) public {
        require(init(CONTRACT_DAO_FUNDING_MANAGER, _resolver));
    }

    /// @notice Call function to claim ETH allocated by DAO (transferred to caller)
    /// @dev _value should be at the most the milestone fundings for the specific _index milestone
    /// @param _proposalId ID of the proposal
    /// @param _index Index of the proposal voting round
    /// @param _value Eth to be withdrawn by user (in wei)
    /// @return _success Boolean, true if claim successful, revert otherwise
    function claimEthFunding(bytes32 _proposalId, uint256 _index, uint256 _value)
        public
        if_from_proposer(_proposalId)
        valid_withdraw_amount(_proposalId, _index, _value)
        returns (bool _success)
    {
        // proposal should not be paused/stopped
        require(isProposalPaused(_proposalId) == false);

        // the `index` voting round should have passed and claimed
        require(
            (daoStorage().isClaimed(_proposalId, _index) == true) &&
            (daoStorage().readProposalVotingResult(_proposalId, _index) == true)
        );

        daoFundingStorage().updateClaimableEth(msg.sender, daoFundingStorage().claimableEth(msg.sender).sub(_value));
        daoFundingStorage().withdrawEth(_value);

        msg.sender.transfer(_value);
        _success = true;
    }

    /// @notice Function to allocate ETH to a user address
    /// @param _to Ethereum address of the receiver of ETH
    /// @param _value Amount to be allocated (in wei)
    function allocateEth(address _to, uint256 _value)
        public
        if_sender_is(CONTRACT_DAO_VOTING_CLAIMS)
    {
        _value = _value.add(daoFundingStorage().claimableEth(_to));
        daoFundingStorage().updateClaimableEth(_to, _value);
    }

    /// @notice Function to move funds to a new DAO
    /// @param _destinationForDaoFunds Ethereum contract address of the new DaoFundingManager
    function moveFundsToNewDao(address _destinationForDaoFunds)
        if_sender_is(CONTRACT_DAO)
        public
    {
        uint256 _remainingBalance = address(this).balance;
        daoFundingStorage().withdrawEth(_remainingBalance);
        _destinationForDaoFunds.transfer(_remainingBalance);
    }

    /// @notice Payable function to receive ETH funds from DigixDAO crowdsale contract
    function () payable public {
        daoFundingStorage().addEth(msg.value);
    }
}
