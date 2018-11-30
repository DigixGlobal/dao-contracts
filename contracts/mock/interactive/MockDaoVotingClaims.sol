pragma solidity ^0.4.25;

import "../../interactive/DaoVotingClaims.sol";

contract MockDaoVotingClaims is DaoVotingClaims {

    constructor(address _resolver) public DaoVotingClaims(_resolver) {
    }
}
