pragma solidity ^0.4.24;

import "@digix/lite-dgx-contract/contracts/DummyDGX.sol";

contract MockDgx is DummyDGX {
  constructor(address _mockDgxStorage, address _feesAdmin) public DummyDGX(_mockDgxStorage, _feesAdmin) {
  }
}
