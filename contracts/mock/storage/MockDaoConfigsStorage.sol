pragma solidity ^0.4.23;

import "../../storage/DaoConfigsStorage.sol";

contract MockDaoConfigsStorage is DaoConfigsStorage {
  function MockDaoConfigsStorage(address _resolver) public DaoConfigsStorage(_resolver) {

  }

  function mock_set_uint_config(bytes32 _config_name, uint256 _new_value)
      public
  {
      uintConfigs[_config_name] = _new_value;
  }

  function mock_set_address_config(bytes32 _config_name, address _new_value)
      public
  {
      addressConfigs[_config_name] = _new_value;
  }

  function mock_set_bytes_config(bytes32 _config_name, bytes32 _new_value)
      public
  {
      bytesConfigs[_config_name] = _new_value;
  }
}
