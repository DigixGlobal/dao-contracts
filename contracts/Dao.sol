pragma solidity ^0.4.19;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import 'zeppelin-solidity/contracts/ownership/Claimable.sol';
import "./common/DaoCommon.sol";
import "./service/DaoCalculatorService.sol";
import "./DaoFundingManager.sol";

contract Dao is DaoCommon, Claimable {
    using DoublyLinkedList for DoublyLinkedList.Address;

    function Dao(address _resolver) public {
        require(init(CONTRACT_DAO, _resolver));
    }

    function daoCalculatorService()
        internal
        returns (DaoCalculatorService _contract)
    {
        _contract = DaoCalculatorService(get_contract(CONTRACT_DAO_CALCULATOR_SERVICE));
    }

    function daoFundingManager()
        internal
        returns (DaoFundingManager _contract)
    {
        _contract = DaoFundingManager(get_contract(CONTRACT_DAO_FUNDING_MANAGER));
    }

    function migrateToNewDao(address _newDaoFundingManager, address _newDaoContract) public onlyOwner() {
        daoStorage().updateForDaoMigration(_newDaoFundingManager, _newDaoContract);
        daoFundingManager().moveFundsToNewDao(_newDaoFundingManager);
    }

    function setStartOfFirstQuarter(uint256 _start) public if_founder() {
        daoStorage().setStartOfFirstQuarter(_start);
    }

    modifier is_proposal_state(bytes32 _proposalId, uint256 _STATE) {
      require(daoStorage().readProposalState(_proposalId) == _STATE);
      _;
    }

    modifier if_valid_nonce(uint256 _nonce) {
      require(daoStorage().readLastNonce(msg.sender) < _nonce);
      _;
    }

    modifier if_participant() {
      require(daoInfoService().isParticipant(msg.sender));
      _;
    }

    modifier if_badge_participant() {
      require(daoInfoService().isBadgeParticipant(msg.sender));
      _;
    }

    modifier if_valid_milestones(uint256 a, uint256 b) {
      require(a == b);
      _;
    }

    function submitPreproposal(
        bytes32 _docIpfsHash,
        uint256[] _milestonesDurations,
        uint256[] _milestonesFundings
    )
        public
        if_main_phase()
        if_participant()
        if_valid_milestones(_milestonesDurations.length, _milestonesFundings.length)
        returns (bool _success)
    {
        address _proposer = msg.sender;
        require(identity_storage().is_kyc_approved(_proposer));
        require(daoStorage().addProposal(_docIpfsHash, _proposer, _milestonesDurations, _milestonesFundings));
        _success = true;
    }

    function modifyProposal(
        bytes32 _proposalId,
        bytes32 _docIpfsHash,
        uint256[] _milestonesDurations,
        uint256[] _milestonesFundings
    )
        public
        if_main_phase()
        if_participant()
        if_valid_milestones(_milestonesDurations.length, _milestonesFundings.length)
        returns (bool _success)
    {
        require(daoStorage().readProposalProposer(_proposalId) == msg.sender);
        uint256 _currentState = daoStorage().readProposalState(_proposalId);
        require(_currentState == PROPOSAL_STATE_PREPROPOSAL ||
          _currentState == PROPOSAL_STATE_INITIAL);
        require(identity_storage().is_kyc_approved(msg.sender));
        require(daoStorage().editProposal(_proposalId, _docIpfsHash, _milestonesDurations, _milestonesFundings));
        daoStorage().updateProposalPRL(_proposalId, false);
        _success = true;
    }

    function endorseProposal(bytes32 _proposalId)
        public
        if_main_phase()
        if_badge_participant()
        returns (bool _success)
    {
        address _endorser = msg.sender;

        // proposal must be a preproposal
        require(daoStorage().readProposalState(_proposalId) == PROPOSAL_STATE_PREPROPOSAL);

        // update storage layer
        require(daoStorage().updateProposalEndorse(_proposalId, _endorser));
        _success = true;
    }

    function updatePRL(bytes32 _proposalId, bool _valid)
        public
        if_prl()
        returns (bool _success)
    {
        daoStorage().updateProposalPRL(_proposalId, _valid);
        _success = true;
    }

    function voteOnDraft(
        bytes32 _proposalId,
        bool _voteYes,
        uint256 _nonce
    )
        public
        if_main_phase()
        if_badge_participant()
        returns (bool _success)
    {
        address _badgeHolder = msg.sender;
        uint256 _badgeStake = daoStakeStorage().readUserLockedBadge(_badgeHolder);

        // _nonce should be greater than the last used nonce by this address
        require(daoStorage().readLastNonce(msg.sender) < _nonce);

        bool _voted;
        (_voted,,) = daoStorage().readDraftVote(_proposalId, _badgeHolder);

        require(daoStorage().addDraftVote(_proposalId, _badgeHolder, _voteYes, _badgeStake, _nonce));

        if (_voted == false) {
          daoQuarterPoint().add(_badgeHolder, get_uint_config(QUARTER_POINT_DRAFT_VOTE));
        }

        _success = true;
    }

    function commitVoteOnProposal(
        bytes32 _proposalId,
        bytes32 _commitHash,
        uint256 _nonce
    )
        public
        if_commit_phase(_proposalId)
        is_proposal_state(_proposalId, PROPOSAL_STATE_VETTED)
        if_valid_nonce(_nonce)
        if_participant()
        returns (bool _success)
    {
        require(daoStorage().isCommitUsed(_proposalId, _commitHash) == false);
        daoStorage().commitVote(_proposalId, _commitHash, msg.sender, _nonce);
        _success = true;
    }

    function revealVoteOnProposal(
        bytes32 _proposalId,
        bool _vote,
        uint256 _salt
    )
        public
        if_reveal_phase(_proposalId)
        is_proposal_state(_proposalId, PROPOSAL_STATE_VETTED)
        if_participant()
        returns (bool _success)
    {
        require(keccak256(_vote, _salt) == daoStorage().readCommitVote(_proposalId, msg.sender));
        uint256 _weight;
        (, _weight) = daoStakeStorage().readUserDGDStake(msg.sender);
        daoStorage().revealVote(_proposalId, msg.sender, _vote, _weight);

        // TODO: give quarter point

        _success = true;
    }

    function commitVoteOnInterim(
        bytes32 _proposalId,
        uint8 _index,
        bytes32 _commitHash,
        uint256 _nonce
    )
        public
        if_interim_commit_phase(_proposalId, _index)
        is_proposal_state(_proposalId, PROPOSAL_STATE_FUNDED)
        if_valid_nonce(_nonce)
        if_participant()
        returns (bool _success)
    {
        require(daoStorage().isInterimCommitUsed(_proposalId, _index, _commitHash) == false);
        daoStorage().commitInterimVote(_proposalId, _commitHash, msg.sender, _index, _nonce);
        _success = true;
    }

    function revealVoteOnInterim(
        bytes32 _proposalId,
        uint8 _index,
        bool _vote,
        uint256 _salt
    )
        public
        if_interim_reveal_phase(_proposalId, _index)
        is_proposal_state(_proposalId, PROPOSAL_STATE_FUNDED)
        if_participant()
        returns (bool _success)
    {
        require(keccak256(_vote, _salt) == daoStorage().readInterimCommitVote(_proposalId, _index, msg.sender));
        uint256 _weight;
        (, _weight) = daoStakeStorage().readUserDGDStake(msg.sender);
        daoStorage().revealInterimVote(_proposalId, msg.sender, _vote, _weight, _index);

        // TODO: give quarter point

        _success = true;
    }

    function claimDraftVotingResult(bytes32 _proposalId)
        public
        if_main_phase()
        if_from_proposer(_proposalId)
        returns (bool _passed)
    {
        address[] memory _allBadgeHolders = daoListingService().listBadgeParticipants(10000, true);
        // calculate
        uint256 _n = _allBadgeHolders.length;
        uint256 _for;
        uint256 _against;
        (_for, _against) = daoStorage().readDraftVotingCount(_proposalId, _allBadgeHolders);
        uint256 _quorum = _for + _against;
        require(_quorum > daoCalculatorService().minimumDraftQuorum(_proposalId));
        if (daoCalculatorService().draftQuotaPass(_for, _against)) {
            _passed = true;
            daoStorage().setProposalDraftPass(_proposalId, true);
        }
    }

    function claimVotingResult(bytes32 _proposalId)
        public
        if_main_phase()
        if_from_proposer(_proposalId)
        returns (bool _passed)
    {
        address[] memory _allStakeHolders = daoListingService().listParticipants(10000, true);
        // calculate
        uint256 _n = _allStakeHolders.length;
        uint256 _for;
        uint256 _against;
        (_for, _against) = daoStorage().readVotingCount(_proposalId, _allStakeHolders);
        uint256 _quorum = _for + _against;
        require(_quorum > daoCalculatorService().minimumVotingQuorum(_proposalId, 0));
        if (daoCalculatorService().votingQuotaPass(_for, _against)) {
            _passed = true;
            daoStorage().setProposalPass(_proposalId, true);
        }
    }

    function claimInterimVotingResult(bytes32 _proposalId, uint256 _index)
        public
        if_main_phase()
        if_from_proposer(_proposalId)
        returns (bool _passed)
    {
        address[] memory _allStakeHolders = daoListingService().listParticipants(10000, true);
        // calculate
        uint256 _n = _allStakeHolders.length;
        uint256 _for;
        uint256 _against;
        (_for, _against) = daoStorage().readInterimVotingCount(_proposalId, _index, _allStakeHolders);
        uint256 _quorum = _for + _against;
        require(_quorum > daoCalculatorService().minimumVotingQuorum(_proposalId, _index));
        if (daoCalculatorService().votingQuotaPass(_for, _against)) {
            _passed = true;
            daoStorage().setProposalInterimPass(_proposalId, _index, true);
        }
        if (_passed) {
          // give bonus points for all those who
          // voted correct in the previous round
        }
    }

    function setMilestoneDone(bytes32 _proposalId, uint256 _milestone_id)
        public
        if_main_phase()
        if_from_proposer(_proposalId)
        returns (bool _success)
    {
        // revert if voting for this _milstone_id has already begun
        require(daoStorage().readProposalInterimVotingTime(_proposalId, _milestone_id) == 0);
        daoStorage().setProposalInterimVoting(_proposalId, _milestone_id);
    }
}
