pragma solidity ^0.4.19;

import "./../service/DaoInfoService.sol";
import "./../service/DaoListingService.sol";
import "./../common/DaoConstants.sol";
import "./../common/IdentityCommon.sol";
import "./../storage/DaoConfigsStorage.sol";
import "./../storage/DaoStakeStorage.sol";
import "./../storage/DaoStorage.sol";
import "./../storage/DaoFundingStorage.sol";

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
        uint256 _start = daoStorage().readProposalVotingTime(_proposalId);
        require(_start > 0);
        require(now - _start < get_uint_config(CONFIG_VOTING_COMMIT_PHASE));
        _;
    }

    modifier if_reveal_phase(bytes32 _proposalId) {
      uint256 _start = daoStorage().readProposalVotingTime(_proposalId);
      require(_start > 0);
      require(now - _start < get_uint_config(CONFIG_VOTING_PHASE_TOTAL));
      require(now - _start > get_uint_config(CONFIG_VOTING_COMMIT_PHASE));
      _;
    }

    modifier if_interim_commit_phase(bytes32 _proposalId, uint8 _index) {
        uint256 _start = daoStorage().readProposalInterimVotingTime(_proposalId, _index);
        require(_start > 0);
        require(now - _start < get_uint_config(CONFIG_INTERIM_COMMIT_PHASE));
        _;
    }

    modifier if_interim_reveal_phase(bytes32 _proposalId, uint8 _index) {
      uint256 _start = daoStorage().readProposalInterimVotingTime(_proposalId, _index);
      require(_start > 0);
      require(now - _start < get_uint_config(CONFIG_INTERIM_PHASE_TOTAL));
      require(now - _start > get_uint_config(CONFIG_INTERIM_COMMIT_PHASE));
      _;
    }

    modifier if_from_proposer(bytes32 _proposalId) {
        require(msg.sender == daoStorage().readProposalProposer(_proposalId));
        _;
    }

    function currentQuarterIndex() internal returns(uint256 _quarterIndex) {
        /* _quarterIndex = (now - daoStorage().startOfFirstQuarter()) / QUARTER_DURATION; */
        _quarterIndex = (now - daoStorage().startOfFirstQuarter()) / get_uint_config(CONFIG_QUARTER_DURATION);
        //TODO: the QUARTER DURATION must be a fixed config and cannot be changed
    }

    function currentTInQuarter() internal returns(uint256 _currentT) {
        /* _currentT = (now - daoStorage().startOfFirstQuarter()) % QUARTER_DURATION; */
        _currentT = (now - daoStorage().startOfFirstQuarter()) % get_uint_config(CONFIG_QUARTER_DURATION);
        //TODO: the QUARTER DURATION must be a fixed config and cannot be changed
    }

    function daoInfoService()
        internal
        returns (DaoInfoService _contract)
    {
        _contract = DaoInfoService(get_contract(CONTRACT_DAO_INFO_SERVICE));
    }

    function daoListingService()
        internal
        returns (DaoListingService _contract)
    {
        _contract = DaoListingService(get_contract(CONTRACT_DAO_LISTING_SERVICE));
    }

    function daoConfigsStorage()
        internal
        returns (DaoConfigsStorage _contract)
    {
        _contract = DaoConfigsStorage(get_contract(CONTRACT_DAO_CONFIG_STORAGE));
    }

    function daoStakeStorage() internal returns (DaoStakeStorage _contract) {
        _contract = DaoStakeStorage(get_contract(CONTRACT_DAO_STAKE_STORAGE));
    }

    function daoStorage() internal returns (DaoStorage _contract) {
        _contract = DaoStorage(get_contract(CONTRACT_DAO_STORAGE));
    }

    function daoFundingStorage() internal returns (DaoFundingStorage _contract) {
        _contract = DaoFundingStorage(get_contract(CONTRACT_DAO_FUNDING_STORAGE));
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
}
