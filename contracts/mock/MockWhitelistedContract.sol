pragma solidity ^0.4.19;

contract DaoStorageInterface {
    function readVotingRoundVotes(bytes32, uint256, address[], bool) public constant returns (address[], uint256);
    function readDraftVote(bytes32, address) public constant returns (bool, uint256);
    function readCommitVote(bytes32, uint256, address) public constant returns (bytes32);
    function readVote(bytes32, uint256, address) public constant returns (bool, uint256);
}

contract DaoSpecialStorageInterface {
    function readCommitVote(bytes32, address) public constant returns (bytes32);
    function readVote(bytes32, address) public constant returns (bool, uint256);
}

contract MockWhitelistedContract {
    bytes32 public name;

    function MockInteractiveContract(bytes32 _name) public {
        name = _name;
    }

    function mock_call_readVotingRoundVotes(
        address _daoStorageAddress,
        bytes32 _proposalId,
        uint256 _index,
        address[] _allUsers
    )
        public
        constant
    {
        uint256 _uintValue;
        (,_uintValue) = DaoStorageInterface(_daoStorageAddress).readVotingRoundVotes(
            _proposalId,
            _index,
            _allUsers,
            true
        );
        (,_uintValue) = DaoStorageInterface(_daoStorageAddress).readVotingRoundVotes(
            _proposalId,
            _index,
            _allUsers,
            false
        );
    }

    function mock_call_readDraftVote(
        address _daoStorageAddress,
        bytes32 _proposalId,
        address _voter
    )
        public
        constant
    {
        uint256 _uintValue;
        (,_uintValue) = DaoStorageInterface(_daoStorageAddress).readDraftVote(
            _proposalId,
            _voter
        );
    }

    function mock_call_readCommitVote(
        address _daoStorageAddress,
        bytes32 _proposalId,
        uint256 _index,
        address _voter
    )
        public
        constant
    {
        bytes32 _bytesValue;
        _bytesValue = DaoStorageInterface(_daoStorageAddress).readCommitVote(
            _proposalId,
            _index,
            _voter
        );
    }

    function mock_call_readVote(
        address _daoStorageAddress,
        bytes32 _proposalId,
        uint256 _index,
        address _voter
    )
        public
        constant
    {
        uint256 _uintValue;
        (,_uintValue) = DaoStorageInterface(_daoStorageAddress).readVote(
            _proposalId,
            _index,
            _voter
        );
    }

    function mock_call_special_readVote(
        address _daoSpecialStorageAddress,
        bytes32 _proposalId,
        address _voter
    )
        public
        constant
    {
        uint256 _uintValue;
        (,_uintValue) = DaoSpecialStorageInterface(_daoSpecialStorageAddress).readVote(
            _proposalId,
            _voter
        );
    }

    function mock_call_special_readCommitVote(
        address _daoSpecialStorageAddress,
        bytes32 _proposalId,
        address _voter
    )
        public
        constant
    {
        bytes32 _bytesValue;
        _bytesValue = DaoSpecialStorageInterface(_daoSpecialStorageAddress).readCommitVote(
            _proposalId,
            _voter
        );
    }
}
