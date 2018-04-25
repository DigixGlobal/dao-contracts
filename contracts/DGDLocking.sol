pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import "./lib/MathHelper.sol";

contract DGDLocking is ResolverClient {

  mapping (address => uint256) lockedDGDStake;
  mapping (address => uint256) actualLockedDGD;

  function DGDLocking(address _resolver) public {
    require(init(CONTRACT_DGD_LOCKING, _resolver));
  }

  function lockDGD(uint256 _amount) {
    // user will have to approve this contract to receive _amount of DGD first
    require(ERC20(CONTRACT_DGD_TOKEN)).transferFrom(msg.sender, address(this), _amount);

    actualLockedDGD[msg.sender] += _amount;

    // TODO: calculate this properly
    lockedDGDStake += _amount;
  }

  function withdrawDGD(uint256 _amount) {

  }
}
