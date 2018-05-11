pragma solidity ^0.4.19;

contract DaoConstants {
  uint256 PROPOSAL_STATE_PREPROPOSAL = 1;
  uint256 PROPOSAL_STATE_INITIAL = 2;
  uint256 PROPOSAL_STATE_VETTED = 3;
  uint256 PROPOSAL_STATE_FUNDED = 4;

  bytes32 CONTRACT_DAO_STAKE_LOCKING = "c:stake:locking";
  bytes32 CONTRACT_DAO = "c:dao";
  bytes32 CONTRACT_DAO_IDENTITY = "c:dao:identity";
  bytes32 CONTRACT_IDENTITY_STORAGE = "c:dao:identity:storage";
  bytes32 CONTRACT_DAO_REWARDS_MANAGER = "c:dao:rewards:manager";
  bytes32 CONTRACT_DAO_POINTS_STORAGE = "c:dao:points:storage";
  bytes32 CONTRACT_DAO_ROLES = "c:dao:roles";
  bytes32 CONTRACT_CONFIG_CONTROLLER = "c:config:controller";
  bytes32 CONTRACT_ROLE_SERVICE = "s:role";
  bytes32 CONTRACT_DAO_INFO_SERVICE = "s:dao:info";
  bytes32 CONTRACT_DAO_LISTING_SERVICE = "s:dao:listing";
  bytes32 CONTRACT_DAO_CALCULATOR_SERVICE = "s:dao:calculator";
  bytes32 CONTRACT_DAO_STORAGE = "s:dao:storage";
  bytes32 CONTRACT_DAO_CONFIG_STORAGE = "s:dao:config";
  bytes32 CONTRACT_DAO_STAKE_STORAGE = "s:stake";
  bytes32 CONTRACT_INTERACTIVE_QUARTER_POINT = "i:quarter:point";
  bytes32 CONTRACT_INTERACTIVE_REPUTATION_POINT = "i:reputation:point";
  bytes32 CONTRACT_DAO_FUNDING_MANAGER = "i:dao:fundingmanager";
  bytes32 CONTRACT_DAO_FUNDING_STORAGE = "i:dao:fundingstorage";

  bytes32 CONTRACT_DGD_TOKEN = "t:dgd";
  bytes32 CONTRACT_DGX_TOKEN = "t:dgx";
  bytes32 CONTRACT_BADGE_TOKEN = "t:badge";

  // these are addresses of contracts deployed in the development environment
  // TODO: update with correct addresses while final deployment
  address ADDRESS_DGD_TOKEN = 0x792e9d2f5A2bb29DD1Fb58Bf16B89b61067621fb;
  address ADDRESS_DGD_BADGE = 0x9cC91FaB462C8d055A13CC7e160E879fDfCD13ed;

  address ADDRESS_DGX_TOKEN = 0x4f3AfEC4E5a3F2A6a1A411DEF7D7dFe50eE057bF;

  uint8 ROLES_ROOT = 1;
  uint8 ROLES_FOUNDERS = 2;
  uint8 ROLES_PRLS = 3;
  uint8 ROLES_KYC_ADMINS = 4;

  bytes32 CONFIG_LOCKING_PHASE_DURATION = "locking_phase_duration";
  bytes32 CONFIG_QUARTER_DURATION = "quarter_duration";
  bytes32 CONFIG_VOTING_COMMIT_PHASE = "voting_commit_phase";
  bytes32 CONFIG_VOTING_PHASE_TOTAL = "voting_phase_total";
  bytes32 CONFIG_INTERIM_COMMIT_PHASE = "interim_voting_commit_phase";
  bytes32 CONFIG_INTERIM_PHASE_TOTAL = "interim_voting_phase_total";
  uint256 CONFIG_MINIMUM_LOCKED_DGD = 10 ** 18;

  bytes32 CONFIG_QUORUM_FIXED_PORTION_NUMERATOR = "quorum_fixed_quorum_numerator";
  bytes32 CONFIG_QUORUM_FIXED_PORTION_DENOMINATOR = "quorum_fixed_quorum_denominator";
  bytes32 CONFIG_QUORUM_SCALING_FACTOR_NUMERATOR = "quorum_sfactor_numerator";
  bytes32 CONFIG_QUORUM_SCALING_FACTOR_DENOMINATOR = "quorum_sfactor_denominator";

  bytes32 CONFIG_DRAFT_QUOTA_NUMERATOR = "draft_quota_numerator";
  bytes32 CONFIG_DRAFT_QUOTA_DENOMINATOR = "draft_quota_denominator";
  bytes32 CONFIG_VOTING_QUOTA_NUMERATOR = "voting_quota_numerator";
  bytes32 CONFIG_VOTING_QUOTA_DENOMINATOR = "voting_quota_denominator";

  uint256 QUARTER_DURATION = 90 days;
}
