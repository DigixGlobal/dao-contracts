pragma solidity ^0.4.19;

contract DaoConstants {
  uint256 PROPOSAL_STATE_PREPROPOSAL = 1;
  uint256 PROPOSAL_STATE_INITIAL = 2;
  uint256 PROPOSAL_STATE_VETTED = 3;
  uint256 PROPOSAL_STATE_FUNDED = 4;

  bytes32 CONTRACT_STAKE_LOCKING = "c:stake:locking";
  bytes32 CONTRACT_DAO = "c:dao";
  bytes32 CONTRACT_DAO_IDENTITY = "c:dao:identity";
  bytes32 CONTRACT_IDENTITY_STORAGE = "c:dao:identity:storage";
  bytes32 CONTRACT_DAO_REWARDS_MANAGER = "c:dao:rewards:manager";
  bytes32 CONTRACT_DAO_POINTS_STORAGE = "c:dao:points:storage";
  bytes32 CONTRACT_DAO_ROLES = "c:dao:roles";
  bytes32 CONTRACT_CONFIG_CONTROLLER = "c:config:controller";
  bytes32 CONTRACT_ROLE_SERVICE = "s:role";
  bytes32 CONTRACT_DAO_INFO_SERVICE = "s:dao:info";
  bytes32 CONTRACT_DAO_STORAGE = "s:dao:storage";
  bytes32 CONTRACT_CONFIG_STORAGE = "s:dao:config";
  bytes32 CONTRACT_INTERACTIVE_QUARTER_POINT = "i:quarter:point";
  bytes32 CONTRACT_INTERACTIVE_REPUTATION_POINT = "i:reputation:point";
  bytes32 CONTRACT_STORAGE_STAKE = "s:stake";

  bytes32 CONTRACT_DGD_TOKEN = "t:dgd";
  bytes32 CONTRACT_DGX_TOKEN = "t:dgx";

  address ADDRESS_DGD_TOKEN = 0xE0B7927c4aF23765Cb51314A0E0521A9645F0E2A;
  address ADDRESS_DGX_TOKEN = 0x4f3AfEC4E5a3F2A6a1A411DEF7D7dFe50eE057bF;
  // TODO: use correct address
  address ADDRESS_DGD_BADGE = 0x4f3AfEC4E5a3F2A6a1A411DEF7D7dFe50eE057bF;

  uint8 ROLES_ROOT = 1;
  uint8 ROLES_FOUNDERS = 2;
  uint8 ROLES_PRLS = 3;
  uint8 ROLES_KYC_ADMINS = 4;

  bytes32 CONFIG_LOCKING_PHASE_DURATION = "locking_phase_duration";
  bytes32 CONFIG_QUARTER_DURATION = "quarter_duration";
}
