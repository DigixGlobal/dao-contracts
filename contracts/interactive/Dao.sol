pragma solidity ^0.4.24;

import "../common/DaoCommon.sol";
import "./DaoFundingManager.sol";
import "./DaoRewardsManager.sol";
import "./DaoVotingClaims.sol";

/**
@title Interactive DAO contract for creating/modifying/endorsing proposals
@author Digix Holdings
*/
contract Dao is DaoCommon {

    event NewProposal(bytes32 _proposalId, address _proposer);
    event ModifyProposal(bytes32 _proposalId, bytes32 _newDoc);
    event ChangeProposalFunding(bytes32 _proposalId);
    event FinalizeProposal(bytes32 _proposalId);
    event FinishMilestone(bytes32 _proposalId, uint256 _milestoneIndex);
    event AddProposalDoc(bytes32 _proposalId, bytes32 _newDoc);
    event PRLAction(bytes32 _proposalId, uint256 _actionId, bytes32 _doc);

    constructor(address _resolver) public {
        require(init(CONTRACT_DAO, _resolver));
    }

    function daoFundingManager()
        internal
        constant
        returns (DaoFundingManager _contract)
    {
        _contract = DaoFundingManager(get_contract(CONTRACT_DAO_FUNDING_MANAGER));
    }

    function daoRewardsManager()
        internal
        constant
        returns (DaoRewardsManager _contract)
    {
        _contract = DaoRewardsManager(get_contract(CONTRACT_DAO_REWARDS_MANAGER));
    }

    function daoVotingClaims()
        internal
        constant
        returns (DaoVotingClaims _contract)
    {
        _contract = DaoVotingClaims(get_contract(CONTRACT_DAO_VOTING_CLAIMS));
    }

    /**
    @notice Set addresses for the new Dao and DaoFundingManager contracts
    @dev This is the first step of the 2-step migration
    @param _newDaoContract Address of the new Dao contract
    @param _newDaoFundingManager Address of the new DaoFundingManager contract
    @param _newDaoRewardsManager Address of the new daoRewardsManager contract
    */
    function setNewDaoContracts(
        address _newDaoContract,
        address _newDaoFundingManager,
        address _newDaoRewardsManager
    )
        public
        if_root()
    {
        require(daoUpgradeStorage().isReplacedByNewDao() == false);
        daoUpgradeStorage().setNewContractAddresses(
            _newDaoContract,
            _newDaoFundingManager,
            _newDaoRewardsManager
        );
    }

    /**
    @notice Migrate this DAO to a new DAO contract
    @dev This is the second step of the 2-step migration
         Migration can only be done during the locking phase, after the global rewards for current quarter are set.
         This is to make sure that there is no rewards calculation pending before the DAO is migrated to new contracts
         The addresses of the new Dao contracts have to be provided again, and be double checked against the addresses that were set in setNewDaoContracts()
    @param _newDaoContract Address of the new DAO contract
    @param _newDaoFundingManager Address of the new DaoFundingManager contract, which would receive the remaining ETHs in this DaoFundingManager
    @param _newDaoRewardsManager Address of the new daoRewardsManager contract, which would receive the claimableDGXs from this daoRewardsManager
    */
    function migrateToNewDao(
        address _newDaoContract,
        address _newDaoFundingManager,
        address _newDaoRewardsManager
    )
        public
        if_root()
        ifGlobalRewardsSet(currentQuarterIndex())
    {
        require(isLockingPhase());
        require(daoUpgradeStorage().isReplacedByNewDao() == false);
        require(
          (daoUpgradeStorage().newDaoContract() == _newDaoContract) &&
          (daoUpgradeStorage().newDaoFundingManager() == _newDaoFundingManager) &&
          (daoUpgradeStorage().newDaoRewardsManager() == _newDaoRewardsManager)
        );
        daoUpgradeStorage().updateForDaoMigration();
        daoFundingManager().moveFundsToNewDao(_newDaoFundingManager);
        daoRewardsManager().moveDGXsToNewDao(_newDaoRewardsManager);
    }

    /**
    @notice Call this function to mark the start of the DAO's first quarter. This can only be done once, by a founder
    @param _start Start time of the first quarter in the DAO
    */
    function setStartOfFirstQuarter(uint256 _start) public if_founder() {
        require(daoUpgradeStorage().startOfFirstQuarter() == 0);
        require(_start > 0);
        daoUpgradeStorage().setStartOfFirstQuarter(_start);
    }

    /**
    @notice Submit a new preliminary idea / Pre-proposal
    @dev The proposer has to send in a collateral == getUintConfig(CONFIG_PREPROPOSAL_DEPOSIT)
         which he could claim back in these scenarios:
          - Before the proposal is finalized, by calling closeProposal()
          - After all milestones are done and the final voting round is passed

    @param _docIpfsHash Hash of the IPFS doc containing details of proposal
    @param _milestonesFundings Array of fundings of the proposal milestones (in wei)
    @param _finalReward Final reward asked by proposer at successful completion of all milestones of proposal
    */
    function submitPreproposal(
        bytes32 _docIpfsHash,
        uint256[] _milestonesFundings,
        uint256 _finalReward
    )
        public
        payable
        ifFundingPossible(_milestonesFundings, _finalReward)
    {
        senderCanDoProposerOperations();
        bool _isFounder = is_founder();

        require(msg.value == getUintConfig(CONFIG_PREPROPOSAL_DEPOSIT));
        require(address(daoFundingManager()).call.value(msg.value)());

        checkNonDigixFundings(_milestonesFundings, _finalReward);

        daoStorage().addProposal(_docIpfsHash, msg.sender, _milestonesFundings, _finalReward, _isFounder);
        daoStorage().setProposalCollateralStatus(_docIpfsHash, COLLATERAL_STATUS_UNLOCKED);
        daoStorage().setProposalCollateralAmount(_docIpfsHash, msg.value);

        emit NewProposal(_docIpfsHash, msg.sender);
    }

    /**
    @notice Modify a proposal (this can be done only before setting the final version)
    @param _proposalId Proposal ID (hash of IPFS doc of the first version of the proposal)
    @param _docIpfsHash Hash of IPFS doc of the modified version of the proposal
    @param _milestonesFundings Array of fundings of the modified version of the proposal (in wei)
    @param _finalReward Final reward on successful completion of all milestones of the modified version of proposal (in wei)
    */
    function modifyProposal(
        bytes32 _proposalId,
        bytes32 _docIpfsHash,
        uint256[] _milestonesFundings,
        uint256 _finalReward
    )
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));

        require(isEditable(_proposalId));
        bytes32 _currentState;
        (,,,_currentState,,,,,,) = daoStorage().readProposal(_proposalId);
        require(_currentState == PROPOSAL_STATE_PREPROPOSAL ||
          _currentState == PROPOSAL_STATE_DRAFT);

        checkNonDigixFundings(_milestonesFundings, _finalReward);

        daoStorage().editProposal(_proposalId, _docIpfsHash, _milestonesFundings, _finalReward);

        emit ModifyProposal(_proposalId, _docIpfsHash);
    }

    /**
    @notice Function to change the funding structure for a proposal
    @dev Proposers can only change fundings for the subsequent milestones,
    during the duration of an on-going milestone (so, cannot be before proposal finalization or during any voting phase)
    @param _proposalId ID of the proposal
    @param _milestonesFundings Array of fundings for milestones
    @param _finalReward Final reward needed for completion of proposal
    @param _currentMilestone the milestone number the proposal is currently in
    */
    function changeFundings(
        bytes32 _proposalId,
        uint256[] _milestonesFundings,
        uint256 _finalReward,
        uint256 _currentMilestone
    )
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));

        checkNonDigixFundings(_milestonesFundings, _finalReward);

        uint256[] memory _currentFundings;
        (_currentFundings,) = daoStorage().readProposalFunding(_proposalId);

        // If there are N milestones, the milestone index must be < N. Otherwise, putting a milestone index of N will actually return a valid timestamp that is
        // right after the final voting round (voting round index N is the final voting round)
        // Which could be abused ( to add more milestones even after the final voting round)
        require(_currentMilestone < _currentFundings.length);

        uint256 _startOfCurrentMilestone = startOfMilestone(_proposalId, _currentMilestone);

        // must be after the start of the milestone, and the milestone has not been finished yet (next voting hasnt started)
        require(now > _startOfCurrentMilestone);
        require(daoStorage().readProposalVotingTime(_proposalId, _currentMilestone.add(1)) == 0);

        // can only modify the fundings after _currentMilestone
        // so, all the fundings from 0 to _currentMilestone must be the same
        for (uint256 i=0;i<=_currentMilestone;i++) {
            require(_milestonesFundings[i] == _currentFundings[i]);
        }

        daoStorage().changeFundings(_proposalId, _milestonesFundings, _finalReward);

        emit ChangeProposalFunding(_proposalId);
    }

    /**
    @notice Finalize a proposal
    @dev After finalizing a proposal, no more proposal version can be added. Proposer will only be able to change fundings and add more docs
         Right after finalizing a proposal, the draft voting round starts. The proposer would also not be able to closeProposal() anymore
         (hence, cannot claim back the collateral anymore, until the final voting round passes)
    @param _proposalId ID of the proposal
    */
    function finalizeProposal(bytes32 _proposalId)
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));
        require(isEditable(_proposalId));
        checkNonDigixProposalLimit(_proposalId);

        // make sure we have reasonably enough time left in the quarter to conduct the Draft Voting.
        // Otherwise, the proposer must wait until the next quarter to finalize the proposal
        require(getTimeLeftInQuarter(now) > getUintConfig(CONFIG_DRAFT_VOTING_PHASE).add(getUintConfig(CONFIG_VOTE_CLAIMING_DEADLINE)));
        address _endorser;
        (,,_endorser,,,,,,,) = daoStorage().readProposal(_proposalId);
        require(_endorser != EMPTY_ADDRESS);
        daoStorage().finalizeProposal(_proposalId);
        daoStorage().setProposalDraftVotingTime(_proposalId, now);

        emit FinalizeProposal(_proposalId);
    }

    /**
    @notice Function to set milestone to be completed
    @dev This can only be called in the Main Phase of DigixDAO by the proposer. It sets the
         voting time for the next milestone, which is immediately, for most of the times. If there is not enough time left in the current
         quarter, then the next voting is postponed to the start of next quarter
    @param _proposalId ID of the proposal
    @param _milestoneIndex Index of the milestone. Index starts from 0 (for the first milestone)
    */
    function finishMilestone(bytes32 _proposalId, uint256 _milestoneIndex)
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));

        uint256[] memory _currentFundings;
        (_currentFundings,) = daoStorage().readProposalFunding(_proposalId);

        // If there are N milestones, the milestone index must be < N. Otherwise, putting a milestone index of N will actually return a valid timestamp that is
        // right after the final voting round (voting round index N is the final voting round)
        // Which could be abused ( to "finish" a milestone even after the final voting round)
        require(_milestoneIndex < _currentFundings.length);

        // must be after the start of this milestone, and the milestone has not been finished yet (voting hasnt started)
        uint256 _startOfCurrentMilestone = startOfMilestone(_proposalId, _milestoneIndex);
        require(now > _startOfCurrentMilestone);
        require(daoStorage().readProposalVotingTime(_proposalId, _milestoneIndex.add(1)) == 0);

        daoStorage().setProposalVotingTime(
            _proposalId,
            _milestoneIndex.add(1),
            getTimelineForNextVote(_milestoneIndex.add(1), now)
        ); // set the voting time of next voting

        emit FinishMilestone(_proposalId, _milestoneIndex);
    }

    /**
    @notice Add IPFS docs to a proposal
    @dev This is allowed only after a proposal is finalized. Before finalizing
         a proposal, proposer can modifyProposal and basically create a different ProposalVersion. After the proposal is finalized,
         they can only allProposalDoc to the final version of that proposal
    @param _proposalId ID of the proposal
    @param _newDoc hash of the new IPFS doc
    */
    function addProposalDoc(bytes32 _proposalId, bytes32 _newDoc)
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));
        bytes32 _finalVersion;
        (,,,,,,,_finalVersion,,) = daoStorage().readProposal(_proposalId);
        require(_finalVersion != EMPTY_BYTES);
        daoStorage().addProposalDoc(_proposalId, _newDoc);

        emit AddProposalDoc(_proposalId, _newDoc);
    }

    /**
    @notice Function to endorse a pre-proposal (can be called only by DAO Moderator)
    @param _proposalId ID of the proposal (hash of IPFS doc of the first version of the proposal)
    */
    function endorseProposal(bytes32 _proposalId)
        public
        isProposalState(_proposalId, PROPOSAL_STATE_PREPROPOSAL)
    {
        require(isMainPhase());
        require(isModerator(msg.sender));
        daoStorage().updateProposalEndorse(_proposalId, msg.sender);
    }

    /**
    @notice Function to update the PRL (regulatory status) status of a proposal
    @dev if a proposal is paused or stopped, the proposer wont be able to withdraw the funding
    @param _proposalId ID of the proposal
    @param _doc hash of IPFS uploaded document, containing details of PRL Action
    */
    function updatePRL(
        bytes32 _proposalId,
        uint256 _action,
        bytes32 _doc
    )
        public
        if_prl()
    {
        require(_action == PRL_ACTION_STOP || _action == PRL_ACTION_PAUSE || _action == PRL_ACTION_UNPAUSE);
        daoStorage().updateProposalPRL(_proposalId, _action, _doc, now);

        emit PRLAction(_proposalId, _action, _doc);
    }

    /**
    @notice Function to close proposal (also get back collateral)
    @dev Can only be closed if the proposal has not been finalized yet
    @param _proposalId ID of the proposal
    */
    function closeProposal(bytes32 _proposalId)
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));
        bytes32 _finalVersion;
        bytes32 _status;
        (,,,_status,,,,_finalVersion,,) = daoStorage().readProposal(_proposalId);
        require(_finalVersion == EMPTY_BYTES);
        require(_status != PROPOSAL_STATE_CLOSED);
        require(daoStorage().readProposalCollateralStatus(_proposalId) == COLLATERAL_STATUS_UNLOCKED);

        daoStorage().closeProposal(_proposalId);
        daoStorage().setProposalCollateralStatus(_proposalId, COLLATERAL_STATUS_CLAIMED);
        require(daoFundingManager().refundCollateral(msg.sender, _proposalId));
    }

    /**
    @notice Function for founders to close all the dead proposals
    @dev Dead proposals = all proposals who are not yet finalized, and been there for more than the threshold time
         The proposers of dead proposals will not get the collateral back
    @param _proposalIds Array of proposal IDs
    */
    function founderCloseProposals(bytes32[] _proposalIds)
        public
        if_founder()
    {
        uint256 _length = _proposalIds.length;
        uint256 _timeCreated;
        bytes32 _finalVersion;
        for (uint256 _i = 0; _i < _length; _i++) {
            (,,,,_timeCreated,,,_finalVersion,,) = daoStorage().readProposal(_proposalIds[_i]);
            require(_finalVersion == EMPTY_BYTES);
            require(now > _timeCreated.add(getUintConfig(CONFIG_PROPOSAL_DEAD_DURATION)));
            daoStorage().closeProposal(_proposalIds[_i]);
        }
    }
}
