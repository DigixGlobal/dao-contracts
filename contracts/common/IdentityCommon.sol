pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./../DaoIdentity.sol";
import "./DaoConstants.sol";

contract IdentityCommon is ResolverClient, DaoConstants {

  modifier if_root() {
    require(dao_identity().getUserRoleId(msg.sender) == ROLES_ROOT);
    _;
  }

  modifier if_founder() {
    require(dao_identity().getUserRoleId(msg.sender) == ROLES_FOUNDERS);
    _;
  }

  modifier if_prl() {
    require(dao_identity().getUserRoleId(msg.sender) == ROLES_PRLS);
    _;
  }

  modifier if_kyc_admin() {
    require(dao_identity().getUserRoleId(msg.sender) == ROLES_KYC_ADMINS);
    _;
  }

  function dao_identity() internal
           returns (DaoIdentity _contract)
  {
    _contract = DaoIdentity(get_contract(CONTRACT_DAO_IDENTITY));
  }
}
