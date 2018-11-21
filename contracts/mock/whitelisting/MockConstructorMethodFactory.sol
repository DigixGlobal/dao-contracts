pragma solidity ^0.4.25;

import "./MockConstructorMethod.sol";

contract MockConstructorMethodFactory {

    function test (address daoStorageAddress) public {
        new MockConstructorMethod(daoStorageAddress);
        // the previous call should have reverted the tnx
    }
}
