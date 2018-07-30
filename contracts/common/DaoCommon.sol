pragma solidity ^0.4.19;

import "./../service/DaoListingService.sol";
import "./../common/DaoConstants.sol";
import "./../common/IdentityCommon.sol";
import "./../storage/DaoConfigsStorage.sol";
import "./../storage/DaoStakeStorage.sol";
import "./../storage/DaoStorage.sol";
import "./../storage/DaoUpgradeStorage.sol";
import "./../storage/DaoSpecialStorage.sol";
import "./../storage/DaoPointsStorage.sol";
import "./../storage/DaoFundingStorage.sol";
import "./../storage/DaoRewardsStorage.sol";
import "./../storage/DaoWhitelistingStorage.sol";
import "./../storage/IntermediateResultsStorage.sol";

contract DaoCommon is IdentityCommon {
    modifier daoIsValid() {
        require(!daoUpgradeStorage().isReplacedByNewDao());
        _;
    }

    modifier if_locking_phase() {
        require(is_locking_phase());
        _;
    }

    function is_locking_phase() returns (bool) {
         return currentTInQuarter() < get_uint_config(CONFIG_LOCKING_PHASE_DURATION);
    }

    modifier if_main_phase() {
        require(!daoUpgradeStorage().isReplacedByNewDao());
        require(currentTInQuarter() >= get_uint_config(CONFIG_LOCKING_PHASE_DURATION));
        _;
    }

    modifier if_after_draft_voting_phase(bytes32 _proposalId) {
        uint256 _start = daoStorage().readProposalDraftVotingTime(_proposalId);
        require(_start > 0);
        require(now > _start);
        require(now.sub(_start) > get_uint_config(CONFIG_DRAFT_VOTING_PHASE));
        _;
    }

    modifier if_commit_phase(bytes32 _proposalId, uint8 _index) {
        require_in_phase(
            daoStorage().readProposalVotingTime(_proposalId, _index),
            0,
            get_uint_config(_index == 0 ? CONFIG_VOTING_COMMIT_PHASE : CONFIG_INTERIM_COMMIT_PHASE)
        );
        _;
    }

    modifier if_reveal_phase(bytes32 _proposalId, uint256 _index) {
      require_in_phase(
          daoStorage().readProposalVotingTime(_proposalId, _index),
          get_uint_config(_index == 0 ? CONFIG_VOTING_COMMIT_PHASE : CONFIG_INTERIM_COMMIT_PHASE),
          get_uint_config(_index == 0 ? CONFIG_VOTING_PHASE_TOTAL : CONFIG_INTERIM_PHASE_TOTAL)
      );
      _;
    }

    modifier if_after_proposal_reveal_phase(bytes32 _proposalId, uint256 _index) {
      uint256 _start = daoStorage().readProposalVotingTime(_proposalId, _index);
      require(_start > 0);
      require(now >= _start.add(get_uint_config(_index == 0 ? CONFIG_VOTING_PHASE_TOTAL : CONFIG_INTERIM_PHASE_TOTAL)));
      _;
    }

    modifier if_draft_voting_phase(bytes32 _proposalId) {
        require_in_phase(
            daoStorage().readProposalDraftVotingTime(_proposalId),
            0,
            get_uint_config(CONFIG_DRAFT_VOTING_PHASE)
        );
        _;
    }

    modifier if_from_proposer(bytes32 _proposalId) {
        require(msg.sender == daoStorage().readProposalProposer(_proposalId));
        _;
    }

    /* modifier if_from_special_proposer(bytes32 _specialProposalId) {
        require(msg.sender == daoSpecialStorage().readProposalProposer(_specialProposalId));
        _;
    } */

    modifier is_proposal_state(bytes32 _proposalId, bytes32 _STATE) {
        bytes32 _currentState;
        (,,,_currentState,,,,,) = daoStorage().readProposal(_proposalId);
        require(_currentState == _STATE);
        _;
    }

    function isProposalPaused(bytes32 _proposalId) public constant returns (bool) {
        bool _isPaused;
        (,,,,,,,,_isPaused) = daoStorage().readProposal(_proposalId);
        return _isPaused;
    }

    modifier valid_withdraw_amount(bytes32 _proposalId, uint256 _index, uint256 _value) {
        require(_value > 0);
        require(_value <= daoFundingStorage().claimableEth(msg.sender));
        uint256 _funding;
        (,,_funding) = daoStorage().readProposalMilestone(_proposalId, _index);
        require(_value <= _funding);
        _;
    }

    modifier if_participant() {
        require(isParticipant(msg.sender));
        _;
    }

    modifier if_moderator() {
        require(isModerator(msg.sender));
        _;
    }

    modifier if_dao_member() {
        require(
            isParticipant(msg.sender) ||
            isModerator(msg.sender)
        );
        _;
    }

    modifier if_editable(bytes32 _proposalId) {
        bytes32 _finalVersion;
        (,,,,,,,_finalVersion,) = daoStorage().readProposal(_proposalId);
        require(_finalVersion == EMPTY_BYTES);
        _;
    }

    modifier if_final_version(bytes32 _proposalId, bytes32 _proposalVersion) {
        bytes32 _finalVersion;
        (,,,,,,,_finalVersion,) = daoStorage().readProposal(_proposalId);
        require(_finalVersion == _proposalVersion);
        _;
    }

    modifier if_valid_milestones(uint256 a, uint256 b) {
        require(a == b);
        _;
    }

    modifier if_funding_possible(uint256[] _fundings) {
        uint256 _total = 0;
        for (uint256 i = 0; i < _fundings.length; i++) {
            _total = _total.add(_fundings[i]);
        }
        require(_total <= daoFundingStorage().ethInDao());
        _;
    }

    modifier if_draft_not_claimed(bytes32 _proposalId) {
        require(daoStorage().isDraftClaimed(_proposalId) == false);
        _;
    }

    modifier if_not_claimed(bytes32 _proposalId, uint256 _index) {
        require(daoStorage().isClaimed(_proposalId, _index) == false);
        _;
    }

    modifier if_not_claimed_special(bytes32 _proposalId) {
        require(daoSpecialStorage().isClaimed(_proposalId) == false);
        _;
    }

    modifier has_not_revealed(bytes32 _proposalId, uint256 _index) {
        uint256 _voteWeight;
        (, _voteWeight) = daoStorage().readVote(_proposalId, _index, msg.sender);
        require(_voteWeight == uint(0));
        _;
    }

    modifier has_not_revealed_special(bytes32 _proposalId) {
        uint256 _weight;
        (,_weight) = daoSpecialStorage().readVote(_proposalId, msg.sender);
        require(_weight == uint(0));
        _;
    }

    modifier if_after_reveal_phase_special(bytes32 _proposalId) {
      uint256 _start = daoSpecialStorage().readVotingTime(_proposalId);
      require(_start > 0);
      require(now.sub(_start) >= get_uint_config(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL));
      _;
    }

    modifier if_commmit_phase_special(bytes32 _proposalId) {
        require_in_phase(
            daoSpecialStorage().readVotingTime(_proposalId),
            0,
            get_uint_config(CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE)
        );
        _;
    }

    modifier if_reveal_phase_special(bytes32 _proposalId) {
        require_in_phase(
            daoSpecialStorage().readVotingTime(_proposalId),
            get_uint_config(CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE),
            get_uint_config(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL)
        );
        _;
    }

    modifier if_not_contract(address _address) {
        uint size;
        assembly {
            size := extcodesize(_address)
        }
        require(size == 0);
        _;
    }

    modifier if_global_rewards_set(uint256 _quarterIndex) {
        if (_quarterIndex > 1) {
            require(daoRewardsStorage().readDgxDistributionDay(_quarterIndex) > 0);
        }
        _;
    }

    function require_in_phase(uint256 _startingPoint, uint256 _relativePhaseStart, uint256 _relativePhaseEnd) {
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
}
