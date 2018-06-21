pragma solidity ^0.4.19;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "@digix/solidity-collections/contracts/abstract/AddressIteratorStorage.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";

contract DaoStakeStorage is ResolverClient, DaoConstants, AddressIteratorStorage {
    using DoublyLinkedList for DoublyLinkedList.Address;

    mapping (address => uint256) public lockedDGDStake;
    mapping (address => uint256) public actualLockedDGD;
    /* mapping (address => uint256) public lockedBadge; */
    uint256 public totalLockedDGDStake;
    uint256 public totalModeratorLockedDGDStake;
    /* uint256 public totalLockedBadges; */
    DoublyLinkedList.Address allParticipants;
    DoublyLinkedList.Address allModerators;
    mapping (address => bool) public redeemedBadge;

    function DaoStakeStorage(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO_STAKE, _resolver));
    }

    function redeemBadge(address _user)
        if_sender_is(CONTRACT_DAO_STAKE_LOCKING)
        public
    {
        redeemedBadge[_user] = true;
    }

    function updateTotalLockedDGDStake(uint256 _totalLockedDGDStake)
        if_sender_is(CONTRACT_DAO_STAKE_LOCKING)
        public
    {
        totalLockedDGDStake = _totalLockedDGDStake;
    }

    function updateTotalModeratorLockedDGDs(uint256 _totalLockedDGDStake)
        if_sender_is(CONTRACT_DAO_STAKE_LOCKING)
        public
    {
        totalModeratorLockedDGDStake = _totalLockedDGDStake;
    }

    function updateUserDGDStake(address _user, uint256 _actualLockedDGD, uint256 _lockedDGDStake)
        if_sender_is(CONTRACT_DAO_STAKE_LOCKING)
        public
    {
        actualLockedDGD[_user] = _actualLockedDGD;
        lockedDGDStake[_user] = _lockedDGDStake;
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

    function readUserEffectiveDGDStake(address _user)
        public
        constant
        returns (uint256 _stake)
    {
        _stake = lockedDGDStake[_user];
    }

    function addToParticipantList(address _user)
        public
        if_sender_is(CONTRACT_DAO_STAKE_LOCKING)
        returns (bool _success)
    {
        _success = allParticipants.append(_user);
    }

    function removeFromParticipantList(address _user)
        public
        if_sender_is(CONTRACT_DAO_STAKE_LOCKING)
        returns (bool _success)
    {
        _success = allParticipants.remove_item(_user);
    }

    function addToModeratorList(address _user)
        public
        if_sender_is(CONTRACT_DAO_STAKE_LOCKING)
        returns (bool _success)
    {
        _success = allModerators.append(_user);
    }

    function removeFromModeratorList(address _user)
        public
        if_sender_is(CONTRACT_DAO_STAKE_LOCKING)
        returns (bool _success)
    {
        _success = allModerators.remove_item(_user);
    }

    function isInParticipantList(address _user)
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

    function isInModeratorsList(address _user)
        public
        constant
        returns (bool _is)
    {
        uint256 _index = allModerators.find(_user);
        if (_index == 0) {
            _is = false;
        } else {
            _is = true;
        }
    }

    function readFirstModerator()
        public
        constant
        returns (address _item)
    {
        _item = read_first_from_addresses(allModerators);
    }

    function readLastModerator()
        public
        constant
        returns (address _item)
    {
        _item = read_last_from_addresses(allModerators);
    }

    function readNextModerator(address _current_item)
        public
        constant
        returns (address _item)
    {
        _item = read_next_from_addresses(allModerators, _current_item);
    }

    function readPreviousModerator(address _current_item)
        public
        constant
        returns (address _item)
    {
        _item = read_previous_from_addresses(allModerators, _current_item);
    }

    function readTotalModerators()
        public
        constant
        returns (uint256 _total_count)
    {
        _total_count = read_total_addresses(allModerators);
    }

    function readFirstParticipant()
        public
        constant
        returns (address _item)
    {
        _item = read_first_from_addresses(allParticipants);
    }

    function readLastParticipant()
        public
        constant
        returns (address _item)
    {
        _item = read_last_from_addresses(allParticipants);
    }

    function readNextParticipant(address _current_item)
        public
        constant
        returns (address _item)
    {
        _item = read_next_from_addresses(allParticipants, _current_item);
    }

    function readPreviousParticipant(address _current_item)
        public
        constant
        returns (address _item)
    {
        _item = read_previous_from_addresses(allParticipants, _current_item);
    }

    function readTotalParticipant()
        public
        constant
        returns (uint256 _total_count)
    {
        _total_count = read_total_addresses(allParticipants);
    }
}
