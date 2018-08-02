pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Claimable.sol";
import "./common/DaoCommon.sol";
import "./DaoFundingManager.sol";
import "./DaoVotingClaims.sol";
import "./lib/MathHelper.sol";

/// @title Interactive DAO contract for creating/modifying/endorsing proposals
/// @author Digix Holdings
contract Dao is DaoCommon, Claimable {
    using MathHelper for MathHelper;

    function Dao(address _resolver) public {
        require(init(CONTRACT_DAO, _resolver));
    }

    function daoFundingManager()
        internal
        returns (DaoFundingManager _contract)
    {
        _contract = DaoFundingManager(get_contract(CONTRACT_DAO_FUNDING_MANAGER));
    }

    function daoVotingClaims()
        internal
        returns (DaoVotingClaims _contract)
    {
        _contract = DaoVotingClaims(get_contract(CONTRACT_DAO_VOTING_CLAIMS));
    }

    /// @notice Migrate this DAO to a new DAO contract
    /// @param _newDaoFundingManager Address of the new DaoFundingManager contract
    /// @param _newDaoContract Address of the new DAO contract
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

    /// @notice Call this function to mark the start of the DAO's first quarter
    /// @param _start Start time of the first quarter in the DAO
    function setStartOfFirstQuarter(uint256 _start) public if_founder() {
        daoUpgradeStorage().setStartOfFirstQuarter(_start);
    }

    /// @notice Submit a new preliminary idea / Pre-proposal
    /// @param _docIpfsHash Hash of the IPFS doc containing details of proposal
    /// @param _milestonesFundings Array of fundings of the proposal milestones (in wei)
    /// @param _finalReward Final reward asked by proposer at successful completion of all milestones of proposal
    /// @return Whether pre-proposal was successfully created
    function submitPreproposal(
        bytes32 _docIpfsHash,
        uint256[] _milestonesFundings,
        uint256 _finalReward
    )
        public
        payable
        if_funding_possible(_milestonesFundings)
        returns (bool _success)
    {
        require(is_main_phase());
        require(isParticipant(msg.sender));
        bool _isFounder = is_founder();

        require(msg.value >= get_uint_config(CONFIG_PREPROPOSAL_DEPOSIT));
        require(address(daoFundingManager()).call.value(msg.value)());

        if (!_isFounder) {
            require(MathHelper.sumNumbers(_milestonesFundings).add(_finalReward) <= get_uint_config(CONFIG_MAX_FUNDING_FOR_NON_DIGIX));
            require(_milestonesFundings.length <= get_uint_config(CONFIG_MAX_MILESTONES_FOR_NON_DIGIX));
        }

        address _proposer = msg.sender;
        require(identity_storage().is_kyc_approved(_proposer));

        daoCollateralStorage().lockCollateral(msg.sender, get_uint_config(CONFIG_PREPROPOSAL_DEPOSIT));
        daoStorage().addProposal(_docIpfsHash, _proposer, _milestonesFundings, _finalReward, _isFounder);
        _success = true;
    }

    /// @notice Modify a proposal (this can be done only before setting the final version)
    /// @param _proposalId Proposal ID (hash of IPFS doc of the first version of the proposal)
    /// @param _docIpfsHash Hash of IPFS doc of the modified version of the proposal
    /// @param _milestonesFundings Array of fundings of the modified version of the proposal (in wei)
    /// @param _finalReward Final reward on successful completion of all milestones of the modified version of proposal (in wei)
    /// @return Whether the proposal was modified successfully
    function modifyProposal(
        bytes32 _proposalId,
        bytes32 _docIpfsHash,
        uint256[] _milestonesFundings,
        uint256 _finalReward
    )
        public
        returns (bool _success)
    {
        require(is_main_phase());
        require(isParticipant(msg.sender));
        require(daoStorage().readProposalProposer(_proposalId) == msg.sender);
        require(is_editable(_proposalId));
        bytes32 _currentState;
        (,,,_currentState,,,,,,) = daoStorage().readProposal(_proposalId);
        require(_currentState == PROPOSAL_STATE_PREPROPOSAL ||
          _currentState == PROPOSAL_STATE_DRAFT);
        require(identity_storage().is_kyc_approved(msg.sender));

        if (!is_founder()) {
            require(MathHelper.sumNumbers(_milestonesFundings).add(_finalReward) <= get_uint_config(CONFIG_MAX_FUNDING_FOR_NON_DIGIX));
            require(_milestonesFundings.length <= get_uint_config(CONFIG_MAX_MILESTONES_FOR_NON_DIGIX));
        }

        daoStorage().editProposal(_proposalId, _docIpfsHash, _milestonesFundings, _finalReward);
        _success = true;
    }

    function changeFundings(
        bytes32 _proposalId,
        uint256[] _milestonesFundings,
        uint256 _finalReward,
        uint256 _currentMilestone
    )
        public
    {
        require(is_main_phase());
        require(isParticipant(msg.sender));
        require(daoStorage().readProposalProposer(_proposalId) == msg.sender);
        require(identity_storage().is_kyc_approved(msg.sender));
        if (!is_founder()) {
            require(MathHelper.sumNumbers(_milestonesFundings).add(_finalReward) <= get_uint_config(CONFIG_MAX_FUNDING_FOR_NON_DIGIX));
            require(_milestonesFundings.length <= get_uint_config(CONFIG_MAX_MILESTONES_FOR_NON_DIGIX));
        }
        uint256[] memory _currentFundings;
        (_currentFundings, _finalReward) = daoStorage().readProposalFunding(_proposalId);

        // must be after the start of the milestone, and the milestone has not been finished yet (voting hasnt started)
        require(now > startOfMilestone(_proposalId, _currentMilestone));
        require(daoStorage().readProposalVotingTime(_proposalId, _currentMilestone.add(1)) == 0);

        // can only modify the fundings after _currentMilestone
        //so, all the fundings from 0 to _currentMilestone must be the same
        for (uint256 i=0;i<=_currentMilestone;i++) {
            require(_milestonesFundings[i] == _currentFundings[i]);
        }

        daoStorage().changeFundings(_proposalId, _milestonesFundings, _finalReward);
    }

    /// @notice Finalize a proposal
    /// @dev After finalizing a proposal, it cannot be modified further
    /// @param _proposalId ID of the proposal
    function finalizeProposal(bytes32 _proposalId)
        public
    {
        require(is_main_phase());
        require(isParticipant(msg.sender));
        require(daoStorage().readProposalProposer(_proposalId) == msg.sender);
        require(is_editable(_proposalId));
        require(identity_storage().is_kyc_approved(msg.sender));
        bool _isDigixProposal;
        (,,,,,,,,,_isDigixProposal) = daoStorage().readProposal(_proposalId);
        if (!_isDigixProposal) {
            require(daoStorage().proposalCountByQuarter(currentQuarterIndex()) < get_uint_config(CONFIG_PROPOSAL_CAP_PER_QUARTER));
        }
        require(getTimeLeftInQuarter(now) > get_uint_config(CONFIG_DRAFT_VOTING_PHASE).add(get_uint_config(CONFIG_VOTE_CLAIMING_DEADLINE)));
        address _endorser;
        (,,_endorser,,,,,,,) = daoStorage().readProposal(_proposalId);
        require(_endorser != EMPTY_ADDRESS);
        daoStorage().finalizeProposal(_proposalId);
        daoStorage().setProposalDraftVotingTime(_proposalId, now);
    }

    function finishMilestone(bytes32 _proposalId, uint256 _milestoneIndex)
        public
    {
        require(is_main_phase());
        require(isParticipant(msg.sender));
        require(is_from_proposer(_proposalId));
        require(identity_storage().is_kyc_approved(msg.sender));

        // must be after the start of this milestone, and the milestone has not been finished yet (voting hasnt started)
        require(now > startOfMilestone(_proposalId, _milestoneIndex));
        require(daoStorage().readProposalVotingTime(_proposalId, _milestoneIndex.add(1)) == 0);

        daoStorage().setProposalVotingTime(
            _proposalId,
            _milestoneIndex.add(1),
            getTimelineForNextVote(_milestoneIndex.add(1), now)
        ); // set the voting time of next voting
    }

    function addProposalDoc(bytes32 _proposalId, bytes32 _newDoc)
        public
    {
        require(is_main_phase());
        require(isParticipant(msg.sender));
        require(is_from_proposer(_proposalId));
        require(identity_storage().is_kyc_approved(msg.sender));
        daoStorage().addProposalDoc(_proposalId, _newDoc);
    }

    /// @notice Function to endorse a pre-proposal (can be called only by DAO Moderator)
    /// @param _proposalId ID of the proposal (hash of IPFS doc of the first version of the proposal)
    /// @return Whether the proposal was endorsed successfully or not
    function endorseProposal(bytes32 _proposalId)
        public
        is_proposal_state(_proposalId, PROPOSAL_STATE_PREPROPOSAL)
        returns (bool _success)
    {
        require(is_main_phase());
        require(isModerator(msg.sender));
        daoStorage().updateProposalEndorse(_proposalId, msg.sender);
        _success = true;
    }

    /// @notice Function to update the PRL (regulatory status) status of a proposal
    /// @param _proposalId ID of the proposal
    /// @param _doc hash of IPFS uploaded document, containing details of PRL Action
    /// @return _success Boolean, whether the PRL status was updated successfully
    function updatePRL(
        bytes32 _proposalId,
        uint256 _action,
        bytes32 _doc
    )
        public
        if_prl()
        returns (bool _success)
    {
        require(_action == PRL_ACTION_STOP || _action == PRL_ACTION_PAUSE || _action == PRL_ACTION_UNPAUSE);
        daoStorage().updateProposalPRL(_proposalId, _action, _doc, now);
        _success = true;
    }

    /// @notice Function to create a Special Proposal (can only be created by the founders)
    /// @param _doc hash of the IPFS doc of the special proposal details
    /// @param _uintConfigs Array of the new UINT256 configs
    /// @param _addressConfigs Array of the new Address configs
    /// @param _bytesConfigs Array of the new Bytes32 configs
    /// @return _success true if created special successfully
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
        require(is_main_phase());
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

    /// @notice Function to set start of voting round for special proposal
    /// @param _proposalId ID of the special proposal
    /// @return _success Boolean, true if voting time was set successfully
    function startSpecialProposalVoting(
        bytes32 _proposalId
    )
        public
        returns (bool _success)
    {
        require(is_main_phase());
        require(daoSpecialStorage().readProposalProposer(_proposalId) == msg.sender);
        require(daoSpecialStorage().readVotingTime(_proposalId) == 0);
        require(getTimeLeftInQuarter(now) > get_uint_config(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL));
        daoSpecialStorage().setVotingTime(_proposalId, now);
        _success = true;
    }
}
