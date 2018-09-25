pragma solidity ^0.4.24;

import "./interface/DaoStorageInterface.sol";
import "./interface/DaoSpecialStorageInterface.sol";

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

    function mock_call_readComittedVote(
        address _daoStorageAddress,
        bytes32 _proposalId,
        uint256 _index,
        address _voter
    )
        public
        constant
    {
        bytes32 _bytesValue;
        _bytesValue = DaoStorageInterface(_daoStorageAddress).readComittedVote(
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

    function mock_call_special_readComittedVote(
        address _daoSpecialStorageAddress,
        bytes32 _proposalId,
        address _voter
    )
        public
        constant
    {
        bytes32 _bytesValue;
        _bytesValue = DaoSpecialStorageInterface(_daoSpecialStorageAddress).readComittedVote(
            _proposalId,
            _voter
        );
    }
}
