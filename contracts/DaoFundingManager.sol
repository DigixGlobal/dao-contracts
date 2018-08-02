pragma solidity ^0.4.19;
import "./common/DaoCommon.sol";
import "./Dao.sol";

/// @title Contract to manage DAO funds
/// @author Digix Holdings
contract DaoFundingManager is DaoCommon {

    function DaoFundingManager(address _resolver) public {
        require(init(CONTRACT_DAO_FUNDING_MANAGER, _resolver));
    }

    function dao() internal returns (Dao _contract) {
        _contract = Dao(get_contract(CONTRACT_DAO));
    }

    /// @notice Call function to claim ETH allocated by DAO (transferred to caller)
    /// @param _proposalId ID of the proposal
    /// @param _index Index of the proposal voting round
    /// @return _success Boolean, true if claim successful, revert otherwise
    function claimFunding(bytes32 _proposalId, uint256 _index)
        public
        returns (bool _success)
    {
        require(is_from_proposer(_proposalId));

        // proposal should not be paused/stopped
        require(!isProposalPaused(_proposalId));

        require(!daoStorage().readIfMilestoneFunded(_proposalId, _index));
        require(daoStorage().readProposalVotingResult(_proposalId, _index));
        require(daoStorage().isClaimed(_proposalId, _index));

        uint256 _funding;
        (, _funding) = daoStorage().readProposalMilestone(_proposalId, _index);

        daoFundingStorage().withdrawEth(_funding);
        daoStorage().setMilestoneFunded(_proposalId, _index);

        msg.sender.transfer(_funding);
        _success = true;
    }

    /// @notice Function to claim unlocked collateral
    /// @dev Collaterals are unlocked only when proposals fail at/before the initial voting or on completion of all milestones
    /// @param _proposalId Proposal ID to claim collateral for
    /// @return _success Boolean, true if claim is successful
    function claimCollateral(bytes32 _proposalId)
        public
        returns (bool _success)
    {
        require(is_from_proposer(_proposalId));

        // proposal should not be paused/stopped
        require(isProposalPaused(_proposalId) == false);

        // require unlocked collateral to be enough
        uint256 _unlockedCollateral = daoCollateralStorage().readUnlockedCollateral(msg.sender);
        address _endorser;
        (,,_endorser,,,,,,,) = daoStorage().readProposal(_proposalId);
        require(
            (_unlockedCollateral >= get_uint_config(CONFIG_PREPROPOSAL_DEPOSIT)) ||
            (_endorser != EMPTY_ADDRESS)
        );

        daoCollateralStorage().withdrawCollateral(msg.sender, _unlockedCollateral);
        msg.sender.transfer(_unlockedCollateral);
        _success = true;
    }

    /// @notice Function to move funds to a new DAO
    /// @param _destinationForDaoFunds Ethereum contract address of the new DaoFundingManager
    function moveFundsToNewDao(address _destinationForDaoFunds)
        public
    {
        require(sender_is(CONTRACT_DAO));
        uint256 _remainingBalance = address(this).balance;
        daoFundingStorage().withdrawEth(_remainingBalance);
        _destinationForDaoFunds.transfer(_remainingBalance);
    }

    /// @notice Payable function to receive ETH funds from DigixDAO crowdsale contract
    function () payable public {
        daoFundingStorage().addEth(msg.value);
    }
}
