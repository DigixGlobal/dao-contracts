pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./../storage/DaoStorage.sol";
import "./../storage/DaoStakeStorage.sol";
import "./../common/DaoConstants.sol";

contract DaoInfoService is ResolverClient, DaoConstants {
    function DaoInfoService(address _resolver)
      public
    {
      require(init(CONTRACT_DAO_INFO_SERVICE, _resolver));
    }

    function daoStorage()
      internal
      constant
      returns (DaoStorage _contract)
    {
      _contract = DaoStorage(get_contract(CONTRACT_DAO_STORAGE));
    }

    function daoStakeStorage()
      internal
      constant
      returns (DaoStakeStorage _contract)
    {
      _contract = DaoStakeStorage(get_contract(CONTRACT_DAO_STAKE_STORAGE));
    }

    function getDaoStartTime()
      public
      constant
      returns (uint256 _time)
    {
      _time = daoStorage().startOfFirstQuarter();
    }

    function getCurrentQuarter()
      public
      constant
      returns (uint256 _quarterId)
    {
      _quarterId = (now - daoStorage().startOfFirstQuarter()) / (90 days);
    }

    function isParticipant(address _user)
      public
      constant
      returns (bool _is)
    {
      _is = daoStakeStorage().isParticipant(_user);
    }

    function isBadgeParticipant(address _user)
      public
      constant
      returns (bool _is)
    {
      _is = daoStakeStorage().isBadgeParticipant(_user);
    }
}
