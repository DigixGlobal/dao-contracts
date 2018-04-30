pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

contract ConfigsStorage is ResolverClient, DaoConstants {

  mapping (bytes32 => uint256) public uintConfigs;
  mapping (bytes32 => address) public addressConfigs;
  mapping (bytes32 => bytes32) public bytesConfigs;

  function ConfigsStorage(address _resolver)
           public
  {
    require(init(CONTRACT_CONFIG_STORAGE, _resolver));

    uintConfigs[CONFIG_LOCKING_PHASE_DURATION] = 10 days;
    uintConfigs[CONFIG_QUARTER_DURATION] = 90 days;
  }

  function set_uint_config(bytes32 _config_name, uint256 _new_value)
           if_sender_is(CONTRACT_CONFIG_CONTROLLER)
           public
  {
    uintConfigs[_config_name] = _new_value;
  }

  function set_address_config(bytes32 _config_name, address _new_value)
           if_sender_is(CONTRACT_CONFIG_CONTROLLER)
           public
  {
    addressConfigs[_config_name] = _new_value;
  }

  function set_bytes_config(bytes32 _config_name, bytes32 _new_value)
           if_sender_is(CONTRACT_CONFIG_CONTROLLER)
           public
  {
    bytesConfigs[_config_name] = _new_value;
  }

}