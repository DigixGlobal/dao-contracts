pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./../storage/DaoStorage.sol";
import "./../storage/StakeStorage.sol";
import "./../common/DaoConstants.sol";

contract DaoInfoService is ResolverClient, DaoConstants {
    function DaoInfoService(address _resolver)
      public
    {
      require(init(CONTRACT_DAO_INFO_SERVICE, _resolver));
    }

    function dao_storage()
      internal
      constant
      returns (DaoStorage _contract)
    {
      _contract = DaoStorage(get_contract(CONTRACT_DAO));
    }

    function dao_stake_storage()
      internal
      constant
      returns (StakeStorage _contract)
    {
      _contract = StakeStorage(get_contract(CONTRACT_STAKE_STORAGE));
    }

    function getDaoStartTime()
      public
      constant
      returns (uint256 _time)
    {
      _time = dao_storage().startOfFirstQuarter();
    }

    function getCurrentQuarter()
      public
      constant
      returns (uint256 _quarterId)
    {
      _quarterId = (now - dao_storage().startOfFirstQuarter()) / (90 days);
    }

    function isParticipant(address _user)
      public
      constant
      returns (bool _is)
    {
      _is = dao_stake_storage().isParticipant(_user);
    }

    function isBadgeParticipant(address _user)
      public
      constant
      returns (bool _is)
    {
      _is = dao_stake_storage().isBadgeParticipant(_user);
    }
}
