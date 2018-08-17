pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Claimable.sol";
import "../common/DaoCommon.sol";
import "./DaoFundingManager.sol";
import "./DaoVotingClaims.sol";

/**
@title Interactive DAO contract for creating/modifying/endorsing proposals
@author Digix Holdings
*/
contract Dao is DaoCommon, Claimable {

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

    function daoVotingClaims()
        internal
        constant
        returns (DaoVotingClaims _contract)
    {
        _contract = DaoVotingClaims(get_contract(CONTRACT_DAO_VOTING_CLAIMS));
    }

    /**
    @notice Migrate this DAO to a new DAO contract
    @param _newDaoFundingManager Address of the new DaoFundingManager contract, which would receive the remaining ETHs in this DAO
    @param _newDaoContract Address of the new DAO contract
    */
    function migrateToNewDao(
        address _newDaoFundingManager,
        address _newDaoContract
    )
        public
        onlyOwner()
    {
        require(daoUpgradeStorage().isReplacedByNewDao() == false);
        daoUpgradeStorage().updateForDaoMigration(_newDaoFundingManager, _newDaoContract);
        daoFundingManager().moveFundsToNewDao(_newDaoFundingManager);
    }

    /**
    @notice Call this function to mark the start of the DAO's first quarter. This can only be done once, by a founder
    @param _start Start time of the first quarter in the DAO
    */
    function setStartOfFirstQuarter(uint256 _start) public if_founder() {
        require(daoUpgradeStorage().startOfFirstQuarter() == 0);
        daoUpgradeStorage().setStartOfFirstQuarter(_start);
    }

    /**
    @notice Submit a new preliminary idea / Pre-proposal
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

        require(msg.value == get_uint_config(CONFIG_PREPROPOSAL_DEPOSIT));
        require(address(daoFundingManager()).call.value(msg.value)());

        checkNonDigixFundings(_milestonesFundings, _finalReward);

        daoStorage().addProposal(_docIpfsHash, msg.sender, _milestonesFundings, _finalReward, _isFounder);
        daoStorage().setProposalCollateralStatus(_docIpfsHash, COLLATERAL_STATUS_UNLOCKED);
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
    }

    /**
    @notice Function to change the funding structure for a proposal
    @dev Proposers can only change fundings for the subsequent milestones,
    during the duration of an on-going milestone (so, cannot be during any voting phase)
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

        uint256 _startOfCurrentMilestone = startOfMilestone(_proposalId, _currentMilestone);

        // start of milestone must be more than 1st Jan 2000, otherwise the voting for this milestone hasn't even started yet
        require(_startOfCurrentMilestone > 946684800);

        // must be after the start of the milestone, and the milestone has not been finished yet (voting hasnt started)
        require(now > _startOfCurrentMilestone);
        require(daoStorage().readProposalVotingTime(_proposalId, _currentMilestone.add(1)) == 0);

        // can only modify the fundings after _currentMilestone
        //so, all the fundings from 0 to _currentMilestone must be the same
        for (uint256 i=0;i<=_currentMilestone;i++) {
            require(_milestonesFundings[i] == _currentFundings[i]);
        }

        daoStorage().changeFundings(_proposalId, _milestonesFundings, _finalReward);
    }

    /**
    @notice Finalize a proposal
    @dev After finalizing a proposal, it cannot be modified further
    @param _proposalId ID of the proposal
    */
    function finalizeProposal(bytes32 _proposalId)
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));
        require(isEditable(_proposalId));
        checkNonDigixProposalLimit(_proposalId);

        require(getTimeLeftInQuarter(now) > get_uint_config(CONFIG_DRAFT_VOTING_PHASE).add(get_uint_config(CONFIG_VOTE_CLAIMING_DEADLINE)));
        address _endorser;
        (,,_endorser,,,,,,,) = daoStorage().readProposal(_proposalId);
        require(_endorser != EMPTY_ADDRESS);
        daoStorage().finalizeProposal(_proposalId);
        daoStorage().setProposalDraftVotingTime(_proposalId, now);
    }

    /**
    @notice Function to set milestone to be completed
    @dev This can only be called in the Main Phase of DigixDAO by the proposer. It sets the
         voting time for the next milestone. If not enough time left in the current
         quarter, then the next voting is postponed to the start of next quarter
    @param _proposalId ID of the proposal
    @param _milestoneIndex Index of the milestone. Index starts from 0 (for the first milestone)
    */
    function finishMilestone(bytes32 _proposalId, uint256 _milestoneIndex)
        public
    {
        senderCanDoProposerOperations();
        require(isFromProposer(_proposalId));

        // must be after the start of this milestone, and the milestone has not been finished yet (voting hasnt started)
        uint256 _startOfCurrentMilestone = startOfMilestone(_proposalId, _milestoneIndex);
        require(_startOfCurrentMilestone > 946684800);
        require(now > _startOfCurrentMilestone);
        require(daoStorage().readProposalVotingTime(_proposalId, _milestoneIndex.add(1)) == 0);

        daoStorage().setProposalVotingTime(
            _proposalId,
            _milestoneIndex.add(1),
            getTimelineForNextVote(_milestoneIndex.add(1), now)
        ); // set the voting time of next voting
    }

    /**
    @notice Add IPFS docs to a proposal
    @dev This is allowed only after a proposal is finalized. Before finalizing
         a proposal, proposer must modifyProposal. After the proposal is finalized,
         they can allProposalDoc to that proposal
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
    }

    /**
    @notice Function to create a Special Proposal (can only be created by the founders)
    @param _doc hash of the IPFS doc of the special proposal details
    @param _uintConfigs Array of the new UINT256 configs
    @param _addressConfigs Array of the new Address configs
    @param _bytesConfigs Array of the new Bytes32 configs
    @return {
      "_success": "true if created special successfully"
    }
    */
    function createSpecialProposal(
        bytes32 _doc,
        uint256[] _uintConfigs,
        address[] _addressConfigs,
        bytes32[] _bytesConfigs
    )
        public
        if_founder()
        returns (bool _success)
    {
        require(isMainPhase());
        address _proposer = msg.sender;
        daoSpecialStorage().addSpecialProposal(
            _doc,
            _proposer,
            _uintConfigs,
            _addressConfigs,
            _bytesConfigs
        );
        _success = true;
    }

    /**
    @notice Function to set start of voting round for special proposal
    @param _proposalId ID of the special proposal
    */
    function startSpecialProposalVoting(
        bytes32 _proposalId
    )
        public
    {
        require(isMainPhase());
        require(daoSpecialStorage().readProposalProposer(_proposalId) == msg.sender);
        require(daoSpecialStorage().readVotingTime(_proposalId) == 0);
        require(getTimeLeftInQuarter(now) > get_uint_config(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL));
        daoSpecialStorage().setVotingTime(_proposalId, now);
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
        require(daoFundingManager().refundCollateral(msg.sender));
    }

    /**
    @notice Function for founders to close all the dead proposals
    @dev all proposals who are not yet finalized, and been there for more than the threshold time
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
            require(now > _timeCreated.add(get_uint_config(CONFIG_PROPOSAL_DEAD_DURATION)));
            daoStorage().closeProposal(_proposalIds[_i]);
        }
    }
}
