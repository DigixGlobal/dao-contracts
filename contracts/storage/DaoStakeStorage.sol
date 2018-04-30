pragma solidity ^0.4.19;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

contract DaoStakeStorage is ResolverClient, DaoConstants {
    using DoublyLinkedList for DoublyLinkedList.Address;

    mapping (address => uint256) lockedDGDStake;
    mapping (address => uint256) actualLockedDGD;
    mapping (address => uint256) lockedBadge;
    DoublyLinkedList.Address allParticipants;
    DoublyLinkedList.Address allBadgeParticipants;


    function DaoStakeStorage(address _resolver) public {
        require(init(CONTRACT_DAO_STAKE_STORAGE, _resolver));
    }

    function updateUserDGDStake(address _user, uint256 _actualLockedDGD, uint256 _lockedDGDStake)
        if_sender_is(CONTRACT_DAO_STAKE_LOCKING)
        public
    {
        actualLockedDGD[_user] = _actualLockedDGD;
        lockedDGDStake[_user] = _lockedDGDStake;
    }

    function updateUserBadgeStake(address _user, uint256 _lockedBadge)
        if_sender_is(CONTRACT_DAO_STAKE_LOCKING)
        public
    {
        lockedBadge[_user] = _lockedBadge;
    }

    function readUserDGDStake(address _user)
        public
        constant
        returns (
            uint256 _actualLockedDGD,
            uint256 _lockedDGDStake
        )
    {
        _actualLockedDGD = actualLockedDGD[_user];
        _lockedDGDStake = lockedDGDStake[_user];
    }

    function readUserLockedBadge(address _user)
        public
        constant
        returns (uint256 _lockedBadge)
    {
        _lockedBadge = lockedBadge[_user];
    }

    function addParticipant(address _user) public {
        allParticipants.append(_user);
    }

    function removeParticipant(address _user) public {
        allParticipants.remove_item(_user);
    }

    function addBadgeParticipant(address _user) public {
        allBadgeParticipants.append(_user);
    }

    function removeBadgeParticipant(address _user) public {
        allBadgeParticipants.remove_item(_user);
    }

    function isParticipant(address _user)
      public
      constant
      returns (bool _is)
    {
      uint256 _index = allParticipants.find(_user);
      if (_index == 0) {
        _is = false;
      } else {
        _is = true;
      }
    }

    function isBadgeParticipant(address _user)
      public
      constant
      returns (bool _is)
    {
      uint256 _index = allBadgeParticipants.find(_user);
      if (_index == 0) {
        _is = false;
      } else {
        _is = true;
      }
    }
}
