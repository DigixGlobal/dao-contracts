pragma solidity ^0.4.25;

import "@digix/lite-dgx-contract/contracts/DummyDGXStorage.sol";

contract MockDgxStorage is DummyDGXStorage {
    constructor() public DummyDGXStorage() {
    }
}
