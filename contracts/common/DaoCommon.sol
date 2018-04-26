pragma solidity ^0.4.19;

import "./../service/DaoInfoService.sol";
import "./../common/DaoConstants.sol";
import "./../common/IdentityCommon.sol";
import "./../storage/ConfigsStorage.sol";
import "./../storage/StakeStorage.sol";

contract DaoCommon is IdentityCommon {

  modifier if_locking_phase() {
    require((now - dao_info_service().getDaoStartTime()) % get_uint_config(CONFIG_QUARTER_DURATION) < get_uint_config(CONFIG_LOCKING_PHASE_DURATION));
    _;
  }

  function dao_info_service()
           internal
           returns (DaoInfoService _contract)
  {
    _contract = DaoInfoService(get_contract(CONTRACT_DAO));
  }

  function configs_storage()
           internal
           returns (ConfigsStorage _contract)
  {
    _contract = ConfigsStorage(get_contract(CONTRACT_DAO_CONFIG_STORAGE));
  }

    function stakeStorage() internal returns (StakeStorage _contract) {
        _contract = StakeStorage(get_contract(CONTRACT_DAO_CONFIG_STORAGE));
    }

  function get_uint_config(bytes32 _config_key)
           returns (uint256 _config_value)
  {
    _config_value = configs_storage().uintConfigs(_config_key);
  }

  function get_address_config(bytes32 _config_key)
           returns (address _config_value)
  {
    _config_value = configs_storage().addressConfigs(_config_key);
  }

  function get_bytes_config(bytes32 _config_key)
           returns (bytes32 _config_value)
  {
    _config_value = configs_storage().bytesConfigs(_config_key);
  }

}
