pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Claimable.sol";
import "./common/DaoCommon.sol";
import "./DaoFundingManager.sol";
import "./DaoVotingClaims.sol";

/// @title Interactive DAO contract for creating/modifying/endorsing proposals
/// @author Digix Holdings
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
    /// @param _milestonesDurations Array of durations of the proposal milestones (in seconds)
    /// @param _milestonesFundings Array of fundings of the proposal milestones (in wei)
    /// @param _finalReward Final reward asked by proposer at successful completion of all milestones of proposal
    /// @return Whether pre-proposal was successfully created
    function submitPreproposal(
        bytes32 _docIpfsHash,
        uint256[] _milestonesDurations,
        uint256[] _milestonesFundings,
        uint256 _finalReward
    )
        public
        if_main_phase()
        if_participant()
        if_funding_possible(_milestonesFundings)
        if_valid_milestones(_milestonesDurations.length, _milestonesFundings.length)
        returns (bool _success)
    {
        address _proposer = msg.sender;
        require(identity_storage().is_kyc_approved(_proposer));
        daoStorage().addProposal(_docIpfsHash, _proposer, _milestonesDurations, _milestonesFundings, _finalReward);
        _success = true;
    }

    /// @notice Modify a proposal (this can be done only before setting the final version)
    /// @param _proposalId Proposal ID (hash of IPFS doc of the first version of the proposal)
    /// @param _docIpfsHash Hash of IPFS doc of the modified version of the proposal
    /// @param _milestonesDurations Array of durations of the modified version of the proposal (in seconds)
    /// @param _milestonesFundings Array of fundings of the modified version of the proposal (in wei)
    /// @param _finalReward Final reward on successful completion of all milestones of the modified version of proposal (in wei)
    /// @return Whether the proposal was modified successfully
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
        bytes32 _currentState;
        (,,,_currentState,,,,,) = daoStorage().readProposal(_proposalId);
        require(_currentState == PROPOSAL_STATE_PREPROPOSAL ||
          _currentState == PROPOSAL_STATE_DRAFT);
        require(identity_storage().is_kyc_approved(msg.sender));
        daoStorage().editProposal(_proposalId, _docIpfsHash, _milestonesDurations, _milestonesFundings, _finalReward);
        _success = true;
    }

    /// @notice Finalize a proposal
    /// @dev After finalizing a proposal, it cannot be modified further
    /// @param _proposalId ID of the proposal
    function finalizeProposal(bytes32 _proposalId)
        public
        if_main_phase()
        if_participant()
        if_editable(_proposalId)
    {
        require(daoStorage().readProposalProposer(_proposalId) == msg.sender);
        require(identity_storage().is_kyc_approved(msg.sender));
        require(getTimeLeftInQuarter(now) > get_uint_config(CONFIG_DRAFT_VOTING_PHASE).add(get_uint_config(CONFIG_VOTE_CLAIMING_DEADLINE)));
        address _endorser;
        (,,_endorser,,,,,,) = daoStorage().readProposal(_proposalId);
        require(_endorser != EMPTY_ADDRESS);
        daoStorage().finalizeProposal(_proposalId);
        daoStorage().setProposalDraftVotingTime(_proposalId, now);
    }

    /// @notice Function to endorse a pre-proposal (can be called only by DAO Moderator)
    /// @param _proposalId ID of the proposal (hash of IPFS doc of the first version of the proposal)
    /// @return Whether the proposal was endorsed successfully or not
    function endorseProposal(bytes32 _proposalId)
        public
        if_main_phase()
        if_moderator()
        is_proposal_state(_proposalId, PROPOSAL_STATE_PREPROPOSAL)
        returns (bool _success)
    {
        address _endorser = msg.sender;
        daoStorage().updateProposalEndorse(_proposalId, _endorser);
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
        if (_action == PRL_ACTION_UNPAUSE) {
            //if the last action was pause, and it happened before a release of funding
            // then we need to push back the milestone, and set the startTime of the voting accordingly.
            uint256 _prlActionCount = daoStorage().readTotalPrlActions(_proposalId);
            if (_prlActionCount > 0) {
                uint256 _lastAction;
                uint256 _lastActionTime;
                (_lastAction, _lastActionTime, ) = daoStorage().readPrlAction(_proposalId, _prlActionCount.sub(1));

                // find out the last voting round that has just happened
                // hence, it is also the index of the current milestone
                uint256 _lastVotingRound = 0;
                while (true) {
                    uint256 _nextMilestoneStartOfNextVotingRound = daoStorage().readProposalNextMilestoneStart(_proposalId, _lastVotingRound + 1);
                    if (_nextMilestoneStartOfNextVotingRound == 0 || _nextMilestoneStartOfNextVotingRound > now) break;
                    _lastVotingRound = _lastVotingRound.add(1);
                }

                // if it's before even the start of the first milestone: no need to do anything
                if (now < daoStorage().readProposalNextMilestoneStart(_proposalId, 0)) {
                    return true;
                }

                // update the startOfNextMilestone and setTimelineForNextMilestone() accordingly if we just delayed the proposal
                // this is the case when _lastVotingRound was claimed
                if (
                    (_lastAction == PRL_ACTION_PAUSE) &&
                    (_lastActionTime < daoStorage().readProposalNextMilestoneStart(_proposalId, _lastVotingRound))
                )
                {
                    daoStorage().setProposalNextMilestoneStart(_proposalId, _lastVotingRound, now);

                    // fetch milestone info
                    uint256 _milestoneDuration;
                    (,_milestoneDuration,) = daoStorage().readProposalMilestone(_proposalId, _lastVotingRound);
                    daoVotingClaims().updateTimelineForNextMilestone(
                        _proposalId,
                        _lastVotingRound.add(1),
                        _milestoneDuration,
                        now
                    );
                }
            }
        }
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
        if_main_phase()
        returns (bool _success)
    {
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
        if_main_phase()
        returns (bool _success)
    {
        require(daoSpecialStorage().readProposalProposer(_proposalId) == msg.sender);
        require(daoSpecialStorage().readVotingTime(_proposalId) == 0);
        require(getTimeLeftInQuarter(now) > get_uint_config(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL));
        daoSpecialStorage().setVotingTime(_proposalId, now);
        _success = true;
    }
}
