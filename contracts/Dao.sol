pragma solidity ^0.4.19;

import "@digix/solidity-collections/contracts/lib/DoublyLinkedList.sol";
import "./common/DaoCommon.sol";

contract Dao is DaoCommon {
    function Dao(address _resolver) public {
        require(init(CONTRACT_DAO, _resolver));
    }

    function submitPreproposal(
        bytes32 _docIpfsHash,
        uint256[] _milestoneDurations,
        uint256[] _milestonesFundings
    )
        if_main_phase
        public
        returns (bool _success)
    {
        address _proposer = msg.sender;
        require(identity_storage().is_kyc_approved(_proposer));
        /* createProposal(_docIpfsHash, _milestoneDurations, _milestonesFundings); */
        _success = true;
    }

    function endorseProposal(bytes32 _proposalId) if_main_phase {
        address _endorser = msg.sender;
        // endorser must be a Badge
        require(stakeStorage().readUserLockedBadge(_endorser) > 0);

        // proposal must be a preproposal
        require(daoStorage().read_proposal_state(_proposalId) == PROPOSAL_STATE_PREPROPOSAL);

        daoStorage().set_endorser(_proposalId, _endorser);
        daoStorage().set_proposal_state(_proposalId, PROPOSAL_STATE_INITIAL);
    }

    function voteOnDraft(bytes32 _proposalId, bytes32 _version_hash, bool _voteYes, uint256 _nonce) if_main_phase {
        address _badgeHolder = msg.sender;
        uint256 _badgeStake = stakeStorage().readUserLockedBadge(_badgeHolder);
        require(_badgeStake > 0);

        // TODO: this function needs to check (throws if conditions not met)
        // - if the _version_hash is the last version
        // - if _nonce is greater than the last nonce
        daoStorage().addDraftVote(_badgeHolder, _proposalId, _version_hash, _voteYes, _badgeStake, _nonce);
    }

    function claimDraftVotingResult() if_main_phase public {

    }
}
