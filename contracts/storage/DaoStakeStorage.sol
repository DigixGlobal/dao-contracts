pragma solidity ^0.4.19;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "@digix/solidity-collections/contracts/abstract/AddressIteratorStorage.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

contract DaoStakeStorage is ResolverClient, DaoConstants, AddressIteratorStorage {
    using DoublyLinkedList for DoublyLinkedList.Address;

    mapping (address => uint256) lockedDGDStake;
    mapping (address => uint256) actualLockedDGD;
    mapping (address => uint256) lockedBadge;
    uint256 public totalLockedDGDStake;
    uint256 public totalLockedBadges;
    DoublyLinkedList.Address allParticipants;
    DoublyLinkedList.Address allBadgeParticipants;

    function DaoStakeStorage(address _resolver) public {
        require(init(CONTRACT_DAO_STAKE_STORAGE, _resolver));
    }

    function updateTotalLockedDGDStake(uint256 _totalLockedDGDStake)
        if_sender_is(CONTRACT_DAO_STAKE_LOCKING)
        public
    {
        totalLockedDGDStake = _totalLockedDGDStake;
    }

    function updateTotalLockedBadges(uint256 _totalLockedBadges)
        if_sender_is(CONTRACT_DAO_STAKE_LOCKING)
        public
    {
        totalLockedBadges = _totalLockedBadges;
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


    function readFirstBadgeParticipant()
           public
           constant
           returns (address _item)
  {
    _item = read_first_from_addresses(allBadgeParticipants);
  }

  function readLastBadgeParticipant()
           public
           constant
           returns (address _item)
  {
    _item = read_last_from_addresses(allBadgeParticipants);
  }

  function readNextBadgeParticipant(address _current_item)
           public
           constant
           returns (address _item)
  {
    _item = read_next_from_addresses(allBadgeParticipants, _current_item);
  }

  function readPreviousBadgeParticipant(address _current_item)
           public
           constant
           returns (address _item)
  {
    _item = read_previous_from_addresses(allBadgeParticipants, _current_item);
  }

  function readTotalBadgeParticipant()
           public
           constant
           returns (uint256 _total_count)
  {
    _total_count = read_total_addresses(allBadgeParticipants);
  }
}
