pragma solidity ^0.4.25;

import "../../storage/DaoConfigsStorage.sol";

contract MockDaoConfigsStorage is DaoConfigsStorage {
    constructor(address _resolver) public DaoConfigsStorage(_resolver) {
      uintConfigs[CONFIG_LOCKING_PHASE_DURATION] = 4 hours;
      uintConfigs[CONFIG_QUARTER_DURATION] = QUARTER_DURATION;
      uintConfigs[CONFIG_VOTING_COMMIT_PHASE] = 10 minutes;
      uintConfigs[CONFIG_VOTING_PHASE_TOTAL] = 20 minutes;
      uintConfigs[CONFIG_INTERIM_COMMIT_PHASE] = 10 minutes;
      uintConfigs[CONFIG_INTERIM_PHASE_TOTAL] = 20 minutes;
      uintConfigs[CONFIG_SPECIAL_PROPOSAL_COMMIT_PHASE] = 10 minutes;
      uintConfigs[CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL] = 20 minutes;
      uintConfigs[CONFIG_DRAFT_VOTING_PHASE] = 10 minutes;
      uintConfigs[CONFIG_VOTE_CLAIMING_DEADLINE] = 10 days;
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
