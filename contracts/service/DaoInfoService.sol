pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./../common/DaoConstants.sol";

contract DaoInfoService is ResolverClient, DaoConstants {
    function DaoInfoService(address _resolver)
      public
    {
      require(init(CONTRACT_DAO_INFO_SERVICE, _resolver));
    }
}
