pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Claimable.sol";
import "./common/DaoCommon.sol";
import "./DaoFundingManager.sol";

// @title Interactive DAO contract for creating/modifying/endorsing proposals
// @author Digix Holdings
contract Dao is DaoCommon, Claimable {

    function Dao(address _resolver) public {
        require(init(CONTRACT_DAO, _resolver));
    }

    function daoFundingManager()
        internal
        returns (DaoFundingManager _contract)
    {
        _contract = DaoFundingManager(get_contract(CONTRACT_DAO_FUNDING_MANAGER));
    }

    // @notice Migrate this DAO to a new DAO contract
    // @param _newDaoFundingManager Address of the new DaoFundingManager contract
    // @param _newDaoContract Address of the new DAO contract
    function migrateToNewDao(
        address _newDaoFundingManager,
        address _newDaoContract
    )
        public
        onlyOwner()
    {
        daoStorage().updateForDaoMigration(_newDaoFundingManager, _newDaoContract);
        daoFundingManager().moveFundsToNewDao(_newDaoFundingManager);
    }

    // @notice Call this function to mark the start of the DAO's first quarter
    // @param _start Start time of the first quarter in the DAO
    function setStartOfFirstQuarter(uint256 _start) public if_founder() {
        daoStorage().setStartOfFirstQuarter(_start);
    }

    // @notice Submit a new preliminary idea / Pre-proposal
    // @param _docIpfsHash Hash of the IPFS doc containing details of proposal
    // @param _milestonesDurations Array of durations of the proposal milestones (in seconds)
    // @param _milestonesFundings Array of fundings of the proposal milestones (in wei)
    // @param _finalReward Final reward asked by proposer at successful completion of all milestones of proposal
    // @return Whether pre-proposal was successfully created
    function submitPreproposal(
        bytes32 _docIpfsHash,
        uint256[] _milestonesDurations,
        uint256[] _milestonesFundings,
        uint256 _finalReward
    )
        public
        if_main_phase()
        if_participant()
        if_valid_milestones(_milestonesDurations.length, _milestonesFundings.length)
        returns (bool _success)
    {
        address _proposer = msg.sender;
        require(identity_storage().is_kyc_approved(_proposer));
        require(daoStorage().addProposal(_docIpfsHash, _proposer, _milestonesDurations, _milestonesFundings, _finalReward));
        _success = true;
    }

    // @notice Modify a proposal (this can be done only before setting the final version)
    // @param _proposalId Proposal ID (hash of IPFS doc of the first version of the proposal)
    // @param _docIpfsHash Hash of IPFS doc of the modified version of the proposal
    // @param _milestonesDurations Array of durations of the modified version of the proposal (in seconds)
    // @param _milestonesFundings Array of fundings of the modified version of the proposal (in wei)
    // @param _finalReward Final reward on successful completion of all milestones of the modified version of proposal (in wei)
    // @param _isFinalVersion Boolean value if this is the final version of the proposal or not
    // @return Whether the proposal was modified successfully
    function modifyProposal(
        bytes32 _proposalId,
        bytes32 _docIpfsHash,
        uint256[] _milestonesDurations,
        uint256[] _milestonesFundings,
        uint256 _finalReward
    )
        public
        if_main_phase()
        if_participant()
        if_editable(_proposalId)
        if_valid_milestones(_milestonesDurations.length, _milestonesFundings.length)
        returns (bool _success)
    {
        require(daoStorage().readProposalProposer(_proposalId) == msg.sender);
        uint256 _currentState = daoStorage().readProposalState(_proposalId);
        require(_currentState == PROPOSAL_STATE_PREPROPOSAL ||
          _currentState == PROPOSAL_STATE_INITIAL);
        require(identity_storage().is_kyc_approved(msg.sender));
        require(daoStorage().editProposal(_proposalId, _docIpfsHash, _milestonesDurations, _milestonesFundings, _finalReward));
        _success = true;
    }

    function finalizeProposal(bytes32 _proposalId)
        public
        if_main_phase()
        if_participant()
        if_editable(_proposalId)
    {
        require(daoStorage().readProposalProposer(_proposalId) == msg.sender);
        daoStorage().finalizeProposal(_proposalId);
        daoStorage().setProposalDraftVotingTime(_proposalId, now);
    }

    // @notice Function to endorse a pre-proposal (can be called only by DAO Moderator)
    // @param _proposalId ID of the proposal (hash of IPFS doc of the first version of the proposal)
    // @return Whether the proposal was endorsed successfully or not
    function endorseProposal(bytes32 _proposalId)
        public
        if_main_phase()
        if_moderator()
        returns (bool _success)
    {
        address _endorser = msg.sender;
        require(daoStorage().readProposalState(_proposalId) == PROPOSAL_STATE_PREPROPOSAL);
        require(daoStorage().updateProposalEndorse(_proposalId, _endorser));
        _success = true;
    }

    // @notice Function to update the PRL (regulatory status) status of a proposal
    // @param _proposalId ID of the proposal
    // @param _stop Boolean, true if proposal is to be stopped ASAP
    // @param _pause Boolean, true if proposal is to be paused for now
    // @param _unpause Boolean, true if an already paused proposal is to be unpaused
    // @param _doc hash of IPFS uploaded document, containing details of PRL Action
    // @return _success Boolean, whether the PRL status was updated successfully
    function updatePRL(
        bytes32 _proposalId,
        bool _stop,
        bool _pause,
        bool _unpause,
        bytes32 _doc
    )
        public
        if_prl()
        if_valid_prl_action(_stop, _pause, _unpause)
        returns (bool _success)
    {
        checkPrlConditions(_proposalId, _pause, _unpause);
        daoStorage().updateProposalPRL(_proposalId, _stop, _pause, _unpause, _doc, now);
        _success = true;
    }

    function checkPrlConditions(bytes32 _proposalId, bool _pause, bool _unpause)
        internal
    {
        uint256 _noOfActions = daoStorage().readTotalPrlActions(_proposalId);
        if (_noOfActions > 0) {
            DaoStructs.PrlAction memory _lastAction;
            (
                _lastAction.actionId,
                _lastAction.at,
                _lastAction.doc
            ) = daoStorage().readPrlAction(_proposalId, _noOfActions - 1);

            // if pausing, the last action should should have been unpause or nothing
            if (_pause) {
                require(_lastAction.actionId == PRL_ACTION_UNPAUSE);
            }
            // if unpausing, the last action should have been pausing
            if (_unpause) {
                require(_lastAction.actionId == PRL_ACTION_PAUSE);
                handleUnpauseProposal(_proposalId, _lastAction.at);
            }
        }
    }

    // TODO
    function handleUnpauseProposal(bytes32 _proposalId, uint256 _lastPausedAt)
        internal
    {
        uint256 _pausedFor = now - _lastPausedAt;
    }

    // @notice Function to create a Special Proposal (can only be created by the founders)
    // @param _doc hash of the IPFS doc of the special proposal details
    // @param _uintConfigs Array of the new UINT256 configs
    // @param _addressConfigs Array of the new Address configs
    // @param _bytesConfigs Array of the new Bytes32 configs
    // @return _success true if created special successfully
    function createSpecialProposal(
        bytes32 _doc,
        uint256[] _uintConfigs,
        address[] _addressConfigs,
        bytes32[] _bytesConfigs
    )
        public
        if_founder()
        if_main_phase()
        returns (bool _success)
    {
        require(getTimeFromNextLockingPhase(now) > get_uint_config(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL));
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

    // @notice Function to set start of voting round for special proposal
    // @param _proposalId ID of the special proposal
    // @param _time start time of voting round (time stamp in seconds)
    // @return _success Boolean, true if voting time was set successfully
    function startSpecialProposalVoting(
        bytes32 _proposalId,
        uint256 _time
    )
        public
        if_main_phase()
        returns (bool _success)
    {
        require(daoSpecialStorage().readProposalProposer(_proposalId) == msg.sender);
        require(daoSpecialStorage().readVotingTime(_proposalId) == 0);
        daoSpecialStorage().setVotingTime(_proposalId, _time);
        _success = true;
    }
}
