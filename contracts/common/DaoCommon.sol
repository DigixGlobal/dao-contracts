pragma solidity ^0.4.19;

import "./../service/DaoInfoService.sol";
import "./../service/DaoListingService.sol";
import "./../common/DaoConstants.sol";
import "./../common/IdentityCommon.sol";
import "./../storage/DaoConfigsStorage.sol";
import "./../storage/DaoStakeStorage.sol";
import "./../storage/DaoStorage.sol";
import "./../storage/DaoSpecialStorage.sol";
import "./../storage/DaoPointsStorage.sol";
import "./../storage/DaoFundingStorage.sol";
import "./../storage/DaoRewardsStorage.sol";

contract DaoCommon is IdentityCommon {
    modifier daoIsValid() {
        require(!daoStorage().isReplacedByNewDao());
        _;
    }

    modifier if_locking_phase() {
        require(!daoStorage().isReplacedByNewDao());
        require(currentTInQuarter() < get_uint_config(CONFIG_LOCKING_PHASE_DURATION));
        _;
    }

    modifier if_main_phase() {
        require(!daoStorage().isReplacedByNewDao());
        require(currentTInQuarter() >= get_uint_config(CONFIG_LOCKING_PHASE_DURATION));
        _;
    }

    modifier if_commit_phase(bytes32 _proposalId) {
        uint256 _start = daoStorage().readProposalVotingTime(_proposalId, 0);
        require(_start > 0);
        require(now - _start < get_uint_config(CONFIG_VOTING_COMMIT_PHASE));
        _;
    }

    modifier if_reveal_phase(bytes32 _proposalId) {
      uint256 _start = daoStorage().readProposalVotingTime(_proposalId, 0);
      require(_start > 0);
      require(now - _start < get_uint_config(CONFIG_VOTING_PHASE_TOTAL));
      require(now - _start > get_uint_config(CONFIG_VOTING_COMMIT_PHASE));
      _;
    }

    modifier if_after_reveal_phase(bytes32 _proposalId) {
      uint256 _start = daoStorage().readProposalVotingTime(_proposalId, 0);
      require(_start > 0);
      require(now - _start > get_uint_config(CONFIG_VOTING_PHASE_TOTAL));
      _;
    }

    modifier if_interim_commit_phase(bytes32 _proposalId, uint8 _index) {
        uint256 _start = daoStorage().readProposalVotingTime(_proposalId, _index);
        require(_start > 0);
        require(now - _start < get_uint_config(CONFIG_INTERIM_COMMIT_PHASE));
        _;
    }

    modifier if_interim_reveal_phase(bytes32 _proposalId, uint256 _index) {
      uint256 _start = daoStorage().readProposalVotingTime(_proposalId, _index);
      require(_start > 0);
      require(now - _start < get_uint_config(CONFIG_INTERIM_PHASE_TOTAL));
      require(now - _start > get_uint_config(CONFIG_INTERIM_COMMIT_PHASE));
      _;
    }

    modifier if_after_interim_reveal_phase(bytes32 _proposalId, uint256 _index) {
      uint256 _start = daoStorage().readProposalVotingTime(_proposalId, _index);
      require(_start > 0);
      require(now - _start > get_uint_config(CONFIG_INTERIM_PHASE_TOTAL));
      _;
    }

    modifier if_from_proposer(bytes32 _proposalId) {
        require(msg.sender == daoStorage().readProposalProposer(_proposalId));
        _;
    }

    modifier is_proposal_state(bytes32 _proposalId, uint256 _STATE) {
      require(daoStorage().readProposalState(_proposalId) == _STATE);
      _;
    }

    modifier if_prl_approved(bytes32 _proposalId) {
      require(daoStorage().readProposalPRL(_proposalId) == true);
      _;
    }

    modifier if_participant() {
      require(isParticipant(msg.sender));
      _;
    }

    modifier if_badge_participant() {
      require(isBadgeParticipant(msg.sender));
      _;
    }

    modifier if_dao_member() {
      require(
        isParticipant(msg.sender) ||
        isBadgeParticipant(msg.sender)
      );
      _;
    }

    modifier if_valid_milestones(uint256 a, uint256 b) {
      require(a == b);
      _;
    }

    modifier if_draft_not_claimed(bytes32 _proposalId) {
      require(daoStorage().getDraftClaimer(_proposalId) == EMPTY_ADDRESS);
      _;
    }

    modifier if_not_claimed(bytes32 _proposalId, uint256 _index) {
      require(daoStorage().getClaimer(_proposalId, _index) == EMPTY_ADDRESS);
      _;
    }

    modifier if_not_claimed_special(bytes32 _proposalId) {
      require(daoSpecialStorage().getClaimer(_proposalId) == EMPTY_ADDRESS);
      _;
    }

    modifier has_not_revealed(bytes32 _proposalId, uint256 _index) {
      require(daoStorage().readVote(_proposalId, _index, msg.sender) == uint(0));
      _;
    }

    modifier has_not_revealed_special(bytes32 _proposalId) {
      require(daoSpecialStorage().readVote(_proposalId, msg.sender) == uint(0));
      _;
    }

    modifier if_after_reveal_phase_special(bytes32 _proposalId) {
      uint256 _start = daoSpecialStorage().readVotingTime(_proposalId);
      require(_start > 0);
      require(now - _start > get_uint_config(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL));
      _;
    }

    modifier if_commit_phase_special(bytes32 _proposalId) {
        uint256 _start = daoSpecialStorage().readVotingTime(_proposalId);
        require(_start > 0);
        require(now - _start < get_uint_config(CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE));
        _;
    }

    modifier if_reveal_phase_special(bytes32 _proposalId) {
      uint256 _start = daoSpecialStorage().readVotingTime(_proposalId);
      require(_start > 0);
      require(now - _start < get_uint_config(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL));
      require(now - _start > get_uint_config(CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE));
      _;
    }

    function currentQuarterIndex() internal returns(uint256 _quarterIndex) {
        _quarterIndex = getQuarterIndex(now);
        //TODO: the QUARTER DURATION must be a fixed config and cannot be changed
    }

    function getQuarterIndex(uint256 _time) internal returns (uint256 _index) {
      _index = ((_time - daoStorage().startOfFirstQuarter()) / get_uint_config(CONFIG_QUARTER_DURATION)) + 1;
      //TODO: the QUARTER DURATION must be a fixed config and cannot be changed
    }

    function timeInQuarter(uint256 _time) internal returns (uint256 _timeInQuarter) {
      _timeInQuarter = (_time - daoStorage().startOfFirstQuarter()) % get_uint_config(CONFIG_QUARTER_DURATION);
    }

    function currentTInQuarter() internal returns(uint256 _currentT) {
        _currentT = timeInQuarter(now);
    }

    function getTimeFromNextLockingPhase(uint256 _time) internal returns(uint256 _timeToGo) {
      _timeToGo = get_uint_config(CONFIG_QUARTER_DURATION) - timeInQuarter(_time);
      //TODO: the QUARTER DURATION must be a fixed config and cannot be changed
    }

    function daoInfoService()
        internal
        returns (DaoInfoService _contract)
    {
        _contract = DaoInfoService(get_contract(CONTRACT_SERVICE_DAO_INFO));
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
            (daoStakeStorage().readUserEffectiveDGDStake(_user) >= CONFIG_MINIMUM_LOCKED_DGD)
        ) {
            _is = true;
        }
    }

    function isBadgeParticipant(address _user)
        public
        constant
        returns (bool _is)
    {
        if (
            (daoRewardsStorage().lastParticipatedQuarter(_user) == currentQuarterIndex()) &&
            (daoStakeStorage().readUserLockedBadge(_user) > 0)
        ) {
            _is = true;
        }
    }
}
