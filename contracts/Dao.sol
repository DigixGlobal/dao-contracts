pragma solidity ^0.4.23;

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

    struct MilestoneInfo {
      uint256 index;
      uint256 duration;
      uint256 funding;
    }

    struct Users {
      address[] users;
      uint256 usersLength;
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

    function setStartOfFirstQuarter(uint256 _start) public if_founder() {
        daoStorage().setStartOfFirstQuarter(_start);
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
        require(daoStorage().isCommitUsed(_proposalId, 0, _commitHash) == false);
        daoStorage().commitVote(_proposalId, _commitHash, msg.sender, 0, _nonce);
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
        has_not_revealed(_proposalId, 0)
        if_participant()
    {
        require(keccak256(_vote, _salt) == daoStorage().readCommitVote(_proposalId, 0, msg.sender));
        daoStorage().revealVote(_proposalId, msg.sender, _vote, daoStakeStorage().readUserEffectiveDGDStake(msg.sender), 0);

        // give quarter point
        daoQuarterPoint().add(msg.sender, get_uint_config(QUARTER_POINT_VOTE));
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
        require(daoStorage().isCommitUsed(_proposalId, _index, _commitHash) == false);
        daoStorage().commitVote(_proposalId, _commitHash, msg.sender, _index, _nonce);
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
        has_not_revealed(_proposalId, _index)
        if_participant()
    {
        require(keccak256(_vote, _salt) == daoStorage().readCommitVote(_proposalId, _index, msg.sender));
        daoStorage().revealVote(_proposalId, msg.sender, _vote, daoStakeStorage().readUserEffectiveDGDStake(msg.sender), _index);

        // give quarter point
        daoQuarterPoint().add(msg.sender, get_uint_config(QUARTER_POINT_INTERIM_VOTE));
    }

    function claimDraftVotingResult(bytes32 _proposalId)
        public
        if_main_phase()
        if_draft_not_claimed(_proposalId)
        if_dao_member()
        returns (bool _passed)
    {
        address[] memory _allBadgeHolders = daoListingService().listBadgeParticipants(10000, true);
        DaoStructs.VotingCount _count;
        (_count.forCount, _count.againstCount, _count.quorum) = daoStorage().readDraftVotingCount(_proposalId, _allBadgeHolders);
        require(_count.quorum > daoCalculatorService().minimumDraftQuorum(_proposalId));
        require(daoCalculatorService().draftQuotaPass(_count.forCount, _count.againstCount));
        _passed = true;
        daoStorage().setProposalDraftPass(_proposalId, true);
        daoStorage().setDraftVotingClaim(_proposalId, msg.sender);
        daoQuarterPoint().add(msg.sender, get_uint_config(QUARTER_POINT_CLAIM_RESULT));
    }

    function claimVotingResult(bytes32 _proposalId)
        public
        if_main_phase()
        if_not_claimed(_proposalId, 0)
        if_after_reveal_phase(_proposalId)
        if_dao_member()
        returns (bool _passed)
    {
        address[] memory _allStakeHolders = daoListingService().listParticipants(10000, true);
        DaoStructs.VotingCount _count;
        (_count.forCount, _count.againstCount, _count.quorum) = daoStorage().readVotingCount(_proposalId, 0, _allStakeHolders);
        require(_count.quorum > daoCalculatorService().minimumVotingQuorum(_proposalId, 0));
        require(daoCalculatorService().votingQuotaPass(_count.forCount, _count.againstCount));
        _passed = true;
        daoStorage().setProposalPass(_proposalId, 0, _passed);
        daoStorage().setVotingClaim(_proposalId, 0, msg.sender); // 0 for voting, interim starts from 1
        daoQuarterPoint().add(msg.sender, get_uint_config(QUARTER_POINT_CLAIM_RESULT));

        // set deadline of milestone 1 (set startTime for next interim voting round)
        MilestoneInfo _info;
        (_info.index, _info.duration, _info.funding) = daoStorage().readProposalMilestone(_proposalId, 0);
        daoStorage().setProposalVotingTime(_proposalId, 1, now + _info.duration);

        // update claimable funds
        daoFundingManager().allocateEth(daoStorage().readProposalProposer(_proposalId), _info.funding);
    }

    function claimInterimVotingResult(bytes32 _proposalId, uint256 _index)
        public
        if_main_phase()
        if_not_claimed(_proposalId, _index)
        if_after_interim_reveal_phase(_proposalId, _index)
        if_dao_member()
        returns (bool _passed)
    {
        address[] memory _allStakeHolders = daoListingService().listParticipants(10000, true);
        DaoStructs.VotingCount _count;
        (_count.forCount, _count.againstCount, _count.quorum) = daoStorage().readVotingCount(_proposalId, _index, _allStakeHolders);
        if ((_count.quorum > daoCalculatorService().minimumVotingQuorum(_proposalId, _index)) ||
              (daoCalculatorService().votingQuotaPass(_count.forCount, _count.againstCount))) {
          _passed = true;
        }
        daoStorage().setProposalPass(_proposalId, _index, _passed);
        daoStorage().setVotingClaim(_proposalId, _index, msg.sender);
        daoQuarterPoint().add(msg.sender, get_uint_config(QUARTER_POINT_CLAIM_RESULT));

        Users _bonusVoters;
        if (_passed) {
          // give bonus points for all those who
          // voted YES in the previous round
          (_bonusVoters.users, _bonusVoters.usersLength) = daoStorage().readVotingRoundVotes(_proposalId, _index-1, _allStakeHolders, true);

          // set deadline for next milestone (set startTime for next interim voting round)
          MilestoneInfo _info;
          (_info.index, _info.duration, _info.funding) = daoStorage().readProposalMilestone(_proposalId, _index);
          daoStorage().setProposalVotingTime(_proposalId, _index + 1, now + _info.duration);

          // update claimable funds
          daoFundingManager().allocateEth(daoStorage().readProposalProposer(_proposalId), _info.funding);
        } else {
          // give bonus points for all those who
          // voted NO in the previous round
          (_bonusVoters.users, _bonusVoters.usersLength) = daoStorage().readVotingRoundVotes(_proposalId, _index-1, _allStakeHolders, false);
        }
        if (_bonusVoters.usersLength > 0) addBonusReputation(_bonusVoters.users, _bonusVoters.usersLength);
    }

    function addBonusReputation(address[] _voters, uint256 _n)
        private
    {
        uint256 _qp = get_uint_config(QUARTER_POINT_VOTE);
        uint256 _rate = get_uint_config(BONUS_REPUTATION_NUMERATOR);
        uint256 _base = get_uint_config(BONUS_REPUTATION_DENOMINATOR);
        uint256 _p = get_uint_config(REPUTATION_PER_EXTRA_QP);
        for (uint256 i = 0; i < _n; i++) {
            daoReputationPoint().add(_voters[i], (_qp * _rate * _p)/_base);
        }
    }

    /* function setMilestoneDone(bytes32 _proposalId, uint256 _milestoneId)
        public
        if_main_phase()
        if_from_proposer(_proposalId)
        returns (bool _success)
    {
        require(daoStorage().readProposalVotingTime(_proposalId, _milestoneId) == 0);
        daoStorage().setProposalVotingTime(_proposalId, _milestoneId, now);
    } */
}
