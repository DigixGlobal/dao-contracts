pragma solidity ^0.4.19;

import "../service/DaoListingService.sol";
import "./DaoConstants.sol";
import "./IdentityCommon.sol";
import "../storage/DaoConfigsStorage.sol";
import "../storage/DaoStakeStorage.sol";
import "../storage/DaoStorage.sol";
import "../storage/DaoUpgradeStorage.sol";
import "../storage/DaoSpecialStorage.sol";
import "../storage/DaoPointsStorage.sol";
import "../storage/DaoFundingStorage.sol";
import "../storage/DaoRewardsStorage.sol";
import "../storage/DaoWhitelistingStorage.sol";
import "../storage/IntermediateResultsStorage.sol";
import "../lib/MathHelper.sol";

contract DaoCommon is IdentityCommon {

    using MathHelper for MathHelper;

    function isDaoNotReplaced() internal returns (bool) {
        return !daoUpgradeStorage().isReplacedByNewDao();
    }

    function isLockingPhase() internal returns (bool) {
        require(currentTInQuarter() < get_uint_config(CONFIG_LOCKING_PHASE_DURATION));
        return true;
    }

    function isMainPhase() internal returns (bool) {
        require(isDaoNotReplaced());
        require(currentTInQuarter() >= get_uint_config(CONFIG_LOCKING_PHASE_DURATION));
        return true;
    }

    function isProposalPaused(bytes32 _proposalId) public constant returns (bool) {
        bool _isPaused;
        (,,,,,,,,_isPaused,) = daoStorage().readProposal(_proposalId);
        return _isPaused;
    }

    function isFromProposer(bytes32 _proposalId) internal returns (bool) {
        require(msg.sender == daoStorage().readProposalProposer(_proposalId));
        return true;
    }

    function isEditable(bytes32 _proposalId) internal returns (bool) {
        bytes32 _finalVersion;
        (,,,,,,,_finalVersion,,) = daoStorage().readProposal(_proposalId);
        require(_finalVersion == EMPTY_BYTES);
        return true;
    }

    modifier ifAfterDraftVotingPhase(bytes32 _proposalId) {
        uint256 _start = daoStorage().readProposalDraftVotingTime(_proposalId);
        require(_start > 0);
        require(now > _start + get_uint_config(CONFIG_DRAFT_VOTING_PHASE));
        _;
    }

    modifier ifCommitPhase(bytes32 _proposalId, uint8 _index) {
        requireInPhase(
            daoStorage().readProposalVotingTime(_proposalId, _index),
            0,
            get_uint_config(_index == 0 ? CONFIG_VOTING_COMMIT_PHASE : CONFIG_INTERIM_COMMIT_PHASE)
        );
        _;
    }

    modifier ifRevealPhase(bytes32 _proposalId, uint256 _index) {
      requireInPhase(
          daoStorage().readProposalVotingTime(_proposalId, _index),
          get_uint_config(_index == 0 ? CONFIG_VOTING_COMMIT_PHASE : CONFIG_INTERIM_COMMIT_PHASE),
          get_uint_config(_index == 0 ? CONFIG_VOTING_PHASE_TOTAL : CONFIG_INTERIM_PHASE_TOTAL)
      );
      _;
    }

    modifier ifAfterProposalRevealPhase(bytes32 _proposalId, uint256 _index) {
      uint256 _start = daoStorage().readProposalVotingTime(_proposalId, _index);
      require(_start > 0);
      require(now >= _start.add(get_uint_config(_index == 0 ? CONFIG_VOTING_PHASE_TOTAL : CONFIG_INTERIM_PHASE_TOTAL)));
      _;
    }

    modifier ifDraftVotingPhase(bytes32 _proposalId) {
        requireInPhase(
            daoStorage().readProposalDraftVotingTime(_proposalId),
            0,
            get_uint_config(CONFIG_DRAFT_VOTING_PHASE)
        );
        _;
    }

    modifier isProposalState(bytes32 _proposalId, bytes32 _STATE) {
        bytes32 _currentState;
        (,,,_currentState,,,,,,) = daoStorage().readProposal(_proposalId);
        require(_currentState == _STATE);
        _;
    }

    modifier ifFundingPossible(uint256[] _fundings, uint256 _finalReward) {
        require(MathHelper.sumNumbers(_fundings).add(_finalReward) <= daoFundingStorage().ethInDao());
        _;
    }

    modifier ifDraftNotClaimed(bytes32 _proposalId) {
        require(daoStorage().isDraftClaimed(_proposalId) == false);
        _;
    }

    modifier ifNotClaimed(bytes32 _proposalId, uint256 _index) {
        require(daoStorage().isClaimed(_proposalId, _index) == false);
        _;
    }

    modifier ifNotClaimedSpecial(bytes32 _proposalId) {
        require(daoSpecialStorage().isClaimed(_proposalId) == false);
        _;
    }

    modifier hasNotRevealed(bytes32 _proposalId, uint256 _index) {
        uint256 _voteWeight;
        (, _voteWeight) = daoStorage().readVote(_proposalId, _index, msg.sender);
        require(_voteWeight == uint(0));
        _;
    }

    modifier hasNotRevealedSpecial(bytes32 _proposalId) {
        uint256 _weight;
        (,_weight) = daoSpecialStorage().readVote(_proposalId, msg.sender);
        require(_weight == uint(0));
        _;
    }

    modifier ifAfterRevealPhaseSpecial(bytes32 _proposalId) {
      uint256 _start = daoSpecialStorage().readVotingTime(_proposalId);
      require(_start > 0);
      require(now.sub(_start) >= get_uint_config(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL));
      _;
    }

    modifier ifCommitPhaseSpecial(bytes32 _proposalId) {
        requireInPhase(
            daoSpecialStorage().readVotingTime(_proposalId),
            0,
            get_uint_config(CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE)
        );
        _;
    }

    modifier ifRevealPhaseSpecial(bytes32 _proposalId) {
        requireInPhase(
            daoSpecialStorage().readVotingTime(_proposalId),
            get_uint_config(CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE),
            get_uint_config(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL)
        );
        _;
    }

    modifier ifNotContract(address _address) {
        uint size;
        assembly {
            size := extcodesize(_address)
        }
        require(size == 0);
        _;
    }

    modifier ifGlobalRewardsSet(uint256 _quarterIndex) {
        if (_quarterIndex > 1) {
            require(daoRewardsStorage().readDgxDistributionDay(_quarterIndex) > 0);
        }
        _;
    }

    function requireInPhase(uint256 _startingPoint, uint256 _relativePhaseStart, uint256 _relativePhaseEnd) internal {
        require(_startingPoint > 0);
        require(now < _startingPoint.add(_relativePhaseEnd));
        require(now >= _startingPoint.add(_relativePhaseStart));
    }

    function currentQuarterIndex() public returns(uint256 _quarterIndex) {
        _quarterIndex = getQuarterIndex(now);
        //TODO: the QUARTER DURATION must be a fixed config and cannot be changed
    }

    function getQuarterIndex(uint256 _time) internal returns (uint256 _index) {
        _index = ((_time.sub(daoUpgradeStorage().startOfFirstQuarter())).div(get_uint_config(CONFIG_QUARTER_DURATION))).add(1);
        //TODO: the QUARTER DURATION must be a fixed config and cannot be changed
    }

    function timeInQuarter(uint256 _time) internal returns (uint256 _timeInQuarter) {
        _timeInQuarter = (_time.sub(daoUpgradeStorage().startOfFirstQuarter())) % get_uint_config(CONFIG_QUARTER_DURATION);
    }

    function currentTInQuarter() public returns(uint256 _currentT) {
        _currentT = timeInQuarter(now);
    }

    function getTimeLeftInQuarter(uint256 _time) internal returns(uint256 _timeLeftInQuarter) {
        _timeLeftInQuarter = get_uint_config(CONFIG_QUARTER_DURATION).sub(timeInQuarter(_time));
        //TODO: the QUARTER DURATION must be a fixed config and cannot be changed
    }

    function daoListingService()
        internal
        returns (DaoListingService _contract)
    {
        _contract = DaoListingService(get_contract(CONTRACT_SERVICE_DAO_LISTING));
    }

    function daoConfigsStorage()
        internal
        returns (DaoConfigsStorage _contract)
    {
        _contract = DaoConfigsStorage(get_contract(CONTRACT_STORAGE_DAO_CONFIG));
    }

    function daoStakeStorage() internal returns (DaoStakeStorage _contract) {
        _contract = DaoStakeStorage(get_contract(CONTRACT_STORAGE_DAO_STAKE));
    }

    function daoStorage() internal returns (DaoStorage _contract) {
        _contract = DaoStorage(get_contract(CONTRACT_STORAGE_DAO));
    }

    function daoUpgradeStorage() internal returns (DaoUpgradeStorage _contract) {
        _contract = DaoUpgradeStorage(get_contract(CONTRACT_STORAGE_DAO_UPGRADABLE));
    }

    function daoSpecialStorage() internal returns (DaoSpecialStorage _contract) {
        _contract = DaoSpecialStorage(get_contract(CONTRACT_STORAGE_DAO_SPECIAL));
    }

    function daoPointsStorage() internal returns (DaoPointsStorage _contract) {
        _contract = DaoPointsStorage(get_contract(CONTRACT_STORAGE_DAO_POINTS));
    }

    function daoFundingStorage() internal returns (DaoFundingStorage _contract) {
        _contract = DaoFundingStorage(get_contract(CONTRACT_STORAGE_DAO_FUNDING));
    }

    function daoRewardsStorage() internal returns (DaoRewardsStorage _contract) {
        _contract = DaoRewardsStorage(get_contract(CONTRACT_STORAGE_DAO_REWARDS));
    }

    function daoWhitelistingStorage() internal returns (DaoWhitelistingStorage _contract) {
        _contract = DaoWhitelistingStorage(get_contract(CONTRACT_STORAGE_DAO_WHITELISTING));
    }

    function intermediateResultsStorage() internal returns (IntermediateResultsStorage _contract) {
        _contract = IntermediateResultsStorage(get_contract(CONTRACT_STORAGE_INTERMEDIATE_RESULTS));
    }

    function get_uint_config(bytes32 _config_key)
        public
        constant
        returns (uint256 _config_value)
    {
        _config_value = daoConfigsStorage().uintConfigs(_config_key);
    }

    function get_address_config(bytes32 _config_key)
        public
        constant
        returns (address _config_value)
    {
        _config_value = daoConfigsStorage().addressConfigs(_config_key);
    }

    function get_bytes_config(bytes32 _config_key)
        public
        constant
        returns (bytes32 _config_value)
    {
        _config_value = daoConfigsStorage().bytesConfigs(_config_key);
    }

    function isParticipant(address _user)
        public
        constant
        returns (bool _is)
    {
        if (
            (daoRewardsStorage().lastParticipatedQuarter(_user) == currentQuarterIndex()) &&
            (daoStakeStorage().readUserEffectiveDGDStake(_user) >= get_uint_config(CONFIG_MINIMUM_LOCKED_DGD))
        ) {
            _is = true;
        }
    }

    function isModerator(address _user)
        public
        constant
        returns (bool _is)
    {
        if (
            (daoRewardsStorage().lastParticipatedQuarter(_user) == currentQuarterIndex()) &&
            (daoStakeStorage().readUserEffectiveDGDStake(_user) >= get_uint_config(CONFIG_MINIMUM_DGD_FOR_MODERATOR)) &&
            (daoPointsStorage().getReputation(_user) >= get_uint_config(CONFIG_MINIMUM_REPUTATION_FOR_MODERATOR))
        ) {
            _is = true;
        }
    }

    function startOfMilestone(bytes32 _proposalId, uint256 _milestoneIndex)
        internal
        returns (uint256 _milestoneStart)
    {
        if (_milestoneIndex == 0) { // This is the 1st milestone, which starts after voting round 0
            _milestoneStart =
                daoStorage().readProposalVotingTime(_proposalId, 0)
                .add(get_uint_config(CONFIG_VOTING_PHASE_TOTAL));
        } else { // if its the n-th milestone, it starts after voting round n-th
            _milestoneStart =
                daoStorage().readProposalVotingTime(_proposalId, _milestoneIndex)
                .add(get_uint_config(CONFIG_INTERIM_PHASE_TOTAL));
        }
    }

    function getTimelineForNextVote(
        uint256 _index,
        uint256 _votingTime
    )
        internal
        returns (uint256)
    {
        uint256 _timeLeftInQuarter = getTimeLeftInQuarter(_votingTime);
        uint256 _votingDuration = get_uint_config(_index == 0 ? CONFIG_VOTING_PHASE_TOTAL : CONFIG_INTERIM_PHASE_TOTAL);
        if (timeInQuarter(_votingTime) < get_uint_config(CONFIG_LOCKING_PHASE_DURATION)) {
            _votingTime = _votingTime.add(
                get_uint_config(CONFIG_LOCKING_PHASE_DURATION).sub(timeInQuarter(_votingTime)).add(1)
            );
        } else if (_timeLeftInQuarter < _votingDuration.add(get_uint_config(CONFIG_VOTE_CLAIMING_DEADLINE))) {
            _votingTime = _votingTime.add(
                _timeLeftInQuarter.add(get_uint_config(CONFIG_LOCKING_PHASE_DURATION)).add(1)
            );
        }
        return _votingTime;
    }

    function checkNonDigixProposalLimit(bytes32 _proposalId)
        internal
    {
        bool _isDigixProposal;
        (,,,,,,,,,_isDigixProposal) = daoStorage().readProposal(_proposalId);
        if (!_isDigixProposal) {
            require(daoStorage().proposalCountByQuarter(currentQuarterIndex()) < get_uint_config(CONFIG_PROPOSAL_CAP_PER_QUARTER));
        }
    }

    function checkNonDigixFundings(uint256[] _milestonesFundings, uint256 _finalReward)
        internal
    {
        if (!is_founder()) {
            require(MathHelper.sumNumbers(_milestonesFundings).add(_finalReward) <= get_uint_config(CONFIG_MAX_FUNDING_FOR_NON_DIGIX));
            require(_milestonesFundings.length <= get_uint_config(CONFIG_MAX_MILESTONES_FOR_NON_DIGIX));
        }
    }

    function senderCanDoProposerOperations()
        internal
    {
        require(isMainPhase());
        require(isParticipant(msg.sender));
        require(identity_storage().is_kyc_approved(msg.sender));
    }

}
