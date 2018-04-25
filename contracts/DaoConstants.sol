pragma solidity ^0.4.19;

contract DaoConstants {
  uint256 PROPOSAL_STATE_PREPROPOSAL = 1;

  bytes32 CONTRACT_DGD_LOCKING = "c:dgd:locking";
  bytes32 CONTRACT_DAO = "c:dao";
  bytes32 CONTRACT_DAO_REWARDS_MANAGER = "c:dao:rewards:manager";
  bytes32 CONTRACT_DAO_POINTS_STORAGE = "c:dao:points:storage";
  bytes32 CONTRACT_DAO_ROLES = "c:dao:roles";

  bytes32 CONTRACT_ROLE_SERVICE = "s:role";
  bytes32 CONTRACT_DAO_SERVICE = "s:dao";

  bytes32 CONTRACT_INTERACTIVE_QUARTER_POINTS = "i:quarter:point";
  bytes32 CONTRACT_INTERACTIVE_REPUTATION_POINTS = "i:reputation:point";

  bytes32 CONTRACT_DGD_TOKEN = "t:dgd";
  bytes32 CONTRACT_DGX_TOKEN = "t:dgx";

  address ADDRESS_DGD_TOKEN = 0xE0B7927c4aF23765Cb51314A0E0521A9645F0E2A;
  address ADDRESS_DGX_TOKEN = 0x4f3AfEC4E5a3F2A6a1A411DEF7D7dFe50eE057bF;
}
