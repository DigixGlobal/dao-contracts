pragma solidity ^0.4.25;

import "../common/DaoCommon.sol";
import "./Dao.sol";


/**
@title Contract to manage DAO funds
@author Digix Holdings
*/
contract DaoFundingManager is DaoCommon {

    address public FUNDING_SOURCE;

    event ClaimFunding(bytes32 indexed _proposalId, uint256 indexed _votingRound, uint256 _funding);

    constructor(address _resolver, address _fundingSource) public {
        require(init(CONTRACT_DAO_FUNDING_MANAGER, _resolver));
        FUNDING_SOURCE = _fundingSource;
    }

    function dao()
        internal
        view
        returns (Dao _contract)
    {
        _contract = Dao(get_contract(CONTRACT_DAO));
    }

    /**
    @notice Function to set the source of DigixDAO funding
    @dev only this source address will be able to fund the DaoFundingManager contract, along with CONTRACT_DAO
    @param _fundingSource address of the funding source
    */
    function setFundingSource(address _fundingSource)
        public
        if_root()
    {
        FUNDING_SOURCE = _fundingSource;
    }

    /**
    @notice Call function to claim the ETH funding for a certain milestone
    @dev Note that the proposer can do this anytime, even in the locking phase
    @param _proposalId ID of the proposal
    @param _index Index of the proposal voting round that they got passed, which is also the same as the milestone index
    */
    function claimFunding(bytes32 _proposalId, uint256 _index)
        public
    {
        require(identity_storage().is_kyc_approved(msg.sender));
        require(isFromProposer(_proposalId));

        // proposal should not be paused/stopped
        require(!isProposalPaused(_proposalId));

        require(!daoStorage().readIfMilestoneFunded(_proposalId, _index));

        require(daoStorage().readProposalVotingResult(_proposalId, _index));
        require(daoStorage().isClaimed(_proposalId, _index));

        uint256 _funding = daoStorage().readProposalMilestone(_proposalId, _index);

        daoStorage().setMilestoneFunded(_proposalId, _index);

        msg.sender.transfer(_funding);

        emit ClaimFunding(_proposalId, _index, _funding);
    }

    /**
    @notice Function to refund the collateral to _receiver
    @dev Can only be called from the Dao contract
    @param _receiver The receiver of the funds
    @return {
      "_success": "Boolean, true if refund was successful"
    }
    */
    function refundCollateral(address _receiver, bytes32 _proposalId)
        public
        returns (bool _success)
    {
        require(sender_is_from([CONTRACT_DAO, CONTRACT_DAO_VOTING_CLAIMS, EMPTY_BYTES]));
        refundCollateralInternal(_receiver, _proposalId);
        _success = true;
    }

    function refundCollateralInternal(address _receiver, bytes32 _proposalId)
        internal
    {
        uint256 _collateralAmount = daoStorage().readProposalCollateralAmount(_proposalId);
        _receiver.transfer(_collateralAmount);
    }

    /**
    @notice Function to move funds to a new DAO
    @param _destinationForDaoFunds Ethereum contract address of the new DaoFundingManager
    */
    function moveFundsToNewDao(address _destinationForDaoFunds)
        public
    {
        require(sender_is(CONTRACT_DAO));
        uint256 _remainingBalance = address(this).balance;
        _destinationForDaoFunds.transfer(_remainingBalance);
    }

    /**
    @notice Payable fallback function to receive ETH funds from DigixDAO crowdsale contract
    @dev this contract can only receive funds from FUNDING_SOURCE address or CONTRACT_DAO (when proposal is created)
    */
    function () payable external {
        require(
            (msg.sender == FUNDING_SOURCE) ||
            (msg.sender == get_contract(CONTRACT_DAO))
        );
    }
}
