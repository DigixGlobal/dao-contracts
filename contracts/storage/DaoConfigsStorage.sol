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

      uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_NUMERATOR] = 20;
      uintConfigs[CONFIG_DRAFT_QUORUM_FIXED_PORTION_DENOMINATOR] = 100;
      uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_NUMERATOR] = 60;
      uintConfigs[CONFIG_DRAFT_QUORUM_SCALING_FACTOR_DENOMINATOR] = 100;

      uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_NUMERATOR] = 20;
      uintConfigs[CONFIG_VOTING_QUORUM_FIXED_PORTION_DENOMINATOR] = 100;
      uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_NUMERATOR] = 60;
      uintConfigs[CONFIG_VOTING_QUORUM_SCALING_FACTOR_DENOMINATOR] = 100;

      uintConfigs[CONFIG_DRAFT_QUOTA_NUMERATOR] = 30;
      uintConfigs[CONFIG_DRAFT_QUOTA_DENOMINATOR] = 100;
      uintConfigs[CONFIG_VOTING_QUOTA_NUMERATOR] = 30;
      uintConfigs[CONFIG_VOTING_QUOTA_DENOMINATOR] = 100;

      uintConfigs[QUARTER_POINT_DRAFT_VOTE] = 1;
      uintConfigs[QUARTER_POINT_VOTE] = 1;
      uintConfigs[QUARTER_POINT_INTERIM_VOTE] = 1;
      uintConfigs[MINIMUM_QUARTER_POINT] = 3;
      uintConfigs[QUARTER_POINT_CLAIM_RESULT] = 1;

      uintConfigs[QUARTER_POINT_CLAIM_RESULT] = 1;

      uintConfigs[REPUTATION_PER_EXTRA_QP] = 5;
      uintConfigs[BONUS_REPUTATION_NUMERATOR] = 20;
      uintConfigs[BONUS_REPUTATION_DENOMINATOR] = 100;

      uintConfigs[SPECIAL_PROPOSAL_COMMIT_PHASE] = 3 weeks;
      uintConfigs[SPECIAL_PROPOSAL_PHASE_TOTAL] = 4 weeks;

      uintConfigs[CONFIG_SPECIAL_QUOTA_NUMERATOR] = 50;
      uintConfigs[CONFIG_SPECIAL_QUOTA_DENOMINATOR] = 100;

      uintConfigs[CONFIG_MAXIMUM_REPUTATION_DEDUCTION] = 20;
      uintConfigs[CONFIG_PUNISHMENT_FOR_NOT_LOCKING] = 5;
      uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_NUM] = 1; // 1 extra QP gains 1/4 RP
      uintConfigs[CONFIG_REPUTATION_PER_EXTRA_QP_DEN] = 4;
  }

  function set_uint_config(bytes32 _config_name, uint256 _new_value)
      if_sender_is(CONTRACT_DAO)
      public
  {
      uintConfigs[_config_name] = _new_value;
  }

  function set_address_config(bytes32 _config_name, address _new_value)
      if_sender_is(CONTRACT_DAO)
      public
  {
      addressConfigs[_config_name] = _new_value;
  }

  function set_bytes_config(bytes32 _config_name, bytes32 _new_value)
      if_sender_is(CONTRACT_DAO)
      public
  {
      bytesConfigs[_config_name] = _new_value;
  }
}
