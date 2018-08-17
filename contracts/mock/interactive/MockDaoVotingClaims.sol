pragma solidity ^0.4.24;

import "../../interactive/DaoVotingClaims.sol";

contract MockDaoVotingClaims is DaoVotingClaims {

    constructor(address _resolver) public DaoVotingClaims(_resolver) {
    }
}
