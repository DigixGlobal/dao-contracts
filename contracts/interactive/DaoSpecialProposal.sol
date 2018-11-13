pragma solidity ^0.4.25;

import "./../common/DaoCommon.sol";

contract DaoSpecialProposal is DaoCommon {

    event StartSpecialProposal(bytes32 indexed _specialProposalId);

    constructor(address _resolver) public {
        require(init(CONTRACT_DAO_SPECIAL_PROPOSAL, _resolver));
    }

    /**
    @notice Function to create a Special Proposal (can only be created by the founders)
    @param _doc hash of the IPFS doc of the special proposal details
    @param _uintConfigs Array of the new UINT256 configs
    @param _addressConfigs Array of the new Address configs
    @param _bytesConfigs Array of the new Bytes32 configs
    @return {
      "_success": "true if created special successfully"
    }
    */
    function createSpecialProposal(
        bytes32 _doc,
        uint256[] _uintConfigs,
        address[] _addressConfigs,
        bytes32[] _bytesConfigs
    )
        external
        if_founder()
        returns (bool _success)
    {
        require(isMainPhase());
        address _proposer = msg.sender;
        daoSpecialStorage().addSpecialProposal(
            _doc,
            _proposer,
            _uintConfigs,
            _addressConfigs,
            _bytesConfigs
        );
        _success = true;
    }

    /**
    @notice Function to set start of voting round for special proposal
    @param _proposalId ID of the special proposal
    */
    function startSpecialProposalVoting(
        bytes32 _proposalId
    )
        public
    {
        require(isMainPhase());
        require(daoSpecialStorage().readProposalProposer(_proposalId) == msg.sender);
        require(daoSpecialStorage().readVotingTime(_proposalId) == 0); // voting hasnt started yet
        require(getTimeLeftInQuarter(now) > getUintConfig(CONFIG_SPECIAL_PROPOSAL_PHASE_TOTAL));
        daoSpecialStorage().setVotingTime(_proposalId, now);

        emit StartSpecialProposal(_proposalId);
    }
}
