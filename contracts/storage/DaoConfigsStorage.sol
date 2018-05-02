pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

contract DaoConfigsStorage is ResolverClient, DaoConstants {
  mapping (bytes32 => uint256) public uintConfigs;
  mapping (bytes32 => address) public addressConfigs;
  mapping (bytes32 => bytes32) public bytesConfigs;

  function DaoConfigsStorage(address _resolver)
           public
  {
    require(init(CONTRACT_DAO_CONFIG_STORAGE, _resolver));

    uintConfigs[CONFIG_LOCKING_PHASE_DURATION] = 10 days;
    uintConfigs[CONFIG_QUARTER_DURATION] = 90 days;
    uintConfigs[CONFIG_VOTING_COMMIT_PHASE] = 3 weeks;
    uintConfigs[CONFIG_VOTING_PHASE_TOTAL] = 4 weeks;
    uintConfigs[CONFIG_INTERIM_COMMIT_PHASE] = 7 days;
    uintConfigs[CONFIG_INTERIM_PHASE_TOTAL] = 10 days;

    uintConfigs[CONFIG_QUORUM_FIXED_PORTION_NUMERATOR] = 20;
    uintConfigs[CONFIG_QUORUM_FIXED_PORTION_DENOMINATOR] = 100; // 20%

    uintConfigs[CONFIG_QUORUM_SCALING_FACTOR_NUMERATOR] = 60;
    uintConfigs[CONFIG_QUORUM_SCALING_FACTOR_DENOMINATOR] = 100; // 60%

    uintConfigs[CONFIG_DRAFT_QUOTA_NUMERATOR] = 30;
    uintConfigs[CONFIG_DRAFT_QUOTA_DENOMINATOR] = 100;
    uintConfigs[CONFIG_VOTING_QUOTA_NUMERATOR] = 30;
    uintConfigs[CONFIG_VOTING_QUOTA_DENOMINATOR] = 100;
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
