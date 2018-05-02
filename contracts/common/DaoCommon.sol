pragma solidity ^0.4.19;

import "./../service/DaoInfoService.sol";
import "./../service/DaoListingService.sol";
import "./../common/DaoConstants.sol";
import "./../common/IdentityCommon.sol";
import "./../storage/DaoConfigsStorage.sol";
import "./../storage/DaoStakeStorage.sol";
import "./../storage/DaoStorage.sol";

contract DaoCommon is IdentityCommon {
    modifier if_locking_phase() {
        require((now - daoInfoService().getDaoStartTime()) % get_uint_config(CONFIG_QUARTER_DURATION) < get_uint_config(CONFIG_LOCKING_PHASE_DURATION));
        _;
    }

    modifier if_main_phase() {
        require((now - daoInfoService().getDaoStartTime()) % get_uint_config(CONFIG_QUARTER_DURATION) >= get_uint_config(CONFIG_LOCKING_PHASE_DURATION));
        _;
    }

    modifier if_commit_phase(bytes32 _proposalId) {
        uint256 _start = daoStorage().readProposalVoting(_proposalId);
        require(_start > 0);
        require(now - _start < get_uint_config(CONFIG_VOTING_COMMIT_PHASE));
        _;
    }

    modifier if_reveal_phase(bytes32 _proposalId) {
      uint256 _start = daoStorage().readProposalVoting(_proposalId);
      require(_start > 0);
      require(now - _start < get_uint_config(CONFIG_VOTING_PHASE_TOTAL));
      require(now - _start > get_uint_config(CONFIG_VOTING_COMMIT_PHASE));
      _;
    }

    modifier if_interim_commit_phase(bytes32 _proposalId, uint8 _index) {
        uint256 _start = daoStorage().readProposalInterimVoting(_proposalId, _index);
        require(_start > 0);
        require(now - _start < get_uint_config(CONFIG_INTERIM_COMMIT_PHASE));
        _;
    }

    modifier if_interim_reveal_phase(bytes32 _proposalId, uint8 _index) {
      uint256 _start = daoStorage().readProposalInterimVoting(_proposalId, _index);
      require(_start > 0);
      require(now - _start < get_uint_config(CONFIG_INTERIM_PHASE_TOTAL));
      require(now - _start > get_uint_config(CONFIG_INTERIM_COMMIT_PHASE));
      _;
    }

    modifier if_from_proposer(bytes32 _proposalId) {
        // TODO: implement this function
        /* require(msg.sender == daoStorage().readProposer(_proposalId)); */
        _;
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
