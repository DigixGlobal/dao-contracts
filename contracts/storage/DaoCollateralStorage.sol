pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./../common/DaoConstants.sol";

contract DaoCollateralStorage is ResolverClient, DaoConstants {
    using SafeMath for uint256;

    uint256 collateralsConfiscated;
    mapping(address => uint256) collateralsLocked;
    mapping(address => uint256) collateralsUnlocked;

    function DaoCollateralStorage(address _resolver) public {
        require(init(CONTRACT_STORAGE_DAO_COLLATERAL, _resolver));
    }

    function lockCollateral(address _user, uint256 _value)
        public
        if_sender_is(CONTRACT_DAO)
    {
        collateralsLocked[_user] = collateralsLocked[_user].add(_value);
    }

    function unlockCollateral(address _user, uint256 _value)
        public
        if_sender_is(CONTRACT_DAO_VOTING_CLAIMS)
    {
        collateralsLocked[_user] = collateralsLocked[_user].sub(_value);
        collateralsUnlocked[_user] = collateralsUnlocked[_user].add(_value);
    }

    function confiscateCollateral(address _user, uint256 _value)
        public
        if_sender_is(CONTRACT_DAO_VOTING_CLAIMS)
    {
        collateralsLocked[_user] = collateralsLocked[_user].sub(_value);
        collateralsConfiscated = collateralsConfiscated.add(_value);
    }

    function collectConfiscatedCollateral(uint256 _value)
        public
        if_sender_is(CONTRACT_DAO)
    {
        collateralsConfiscated = collateralsConfiscated.sub(_value);
    }

    function withdrawCollateral(address _user, uint256 _value)
        public
        if_sender_is(CONTRACT_DAO_FUNDING_MANAGER)
    {
        collateralsUnlocked[_user] = collateralsUnlocked[_user].sub(_value);
    }

    function readLockedCollateral(address _user)
        public
        returns (uint256 _value)
    {
        _value = collateralsLocked[_user];
    }

    function readUnlockedCollateral(address _user)
        public
        returns (uint256 _value)
    {
        _value = collateralsUnlocked[_user];
    }

    function readConfiscatedCollateral()
        public
        returns (uint256 _value)
    {
        _value = collateralsConfiscated;
    }
}
