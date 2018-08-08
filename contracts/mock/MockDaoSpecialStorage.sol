pragma solidity ^0.4.24;

import "./../storage/DaoSpecialStorage.sol";

contract MockDaoSpecialStorage is DaoSpecialStorage {

    function MockDaoSpecialStorage(address _resolver) public DaoSpecialStorage(_resolver) {}

    function mock_put_proposal_as(
        bytes32 _specialProposalId,
        address _founder,
        uint256[] _uintConfigs,
        address[] _addressConfigs,
        bytes32[] _bytesConfigs,
        uint256 _startOfVoting
    )
        public
    {
        proposals.append(_specialProposalId);
        proposalsById[_specialProposalId].proposalId = _specialProposalId;
        proposalsById[_specialProposalId].proposer = _founder;
        proposalsById[_specialProposalId].timeCreated = _startOfVoting.sub(1);
        proposalsById[_specialProposalId].uintConfigs = _uintConfigs;
        proposalsById[_specialProposalId].addressConfigs = _addressConfigs;
        proposalsById[_specialProposalId].bytesConfigs = _bytesConfigs;
        proposalsById[_specialProposalId].voting.startTime = _startOfVoting;
    }

    function mock_put_commit_votes(
        bytes32 _specialProposalId,
        address[] _voters,
        bytes32[] _commits,
        uint256 _length
    )
        public
    {
        for (uint256 _i = 0; _i < _length; _i++) {
            proposalsById[_specialProposalId].voting.commits[_voters[_i]] = _commits[_i];
        }
    }

    function mock_put_past_votes(
        bytes32 _specialProposalId,
        address[] _voters,
        bool[] _votes,
        uint256[] _stakes,
        uint256 _length
    )
        public
    {
        for (uint256 _i = 0; _i < _length; _i++) {
            proposalsById[_specialProposalId].voting.revealVote(_voters[_i], _votes[_i], _stakes[_i]);
        }
    }
}
