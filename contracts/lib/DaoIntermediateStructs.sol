pragma solidity ^0.4.25;

library DaoIntermediateStructs {

    // Struct used in large functions to cut down on variables
    // store the summation of weights "FOR" proposal
    // store the summation of weights "AGAINST" proposal
    struct VotingCount {
        // weight of votes "FOR" the voting round
        uint256 forCount;
        // weight of votes "AGAINST" the voting round
        uint256 againstCount;
    }

    // Struct used in large functions to cut down on variables
    struct Users {
        // List of addresses, participants of DigixDAO
        address[] users;
        // Length of the above list
        uint256 usersLength;
    }
}
