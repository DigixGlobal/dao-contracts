pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/ownership/Claimable.sol";
import "./common/DaoCommon.sol";
import "./DaoFundingManager.sol";

contract Dao is DaoCommon, Claimable {

    function Dao(address _resolver) public {
        require(init(CONTRACT_DAO, _resolver));
    }

    function daoFundingManager()
        internal
        returns (DaoFundingManager _contract)
    {
        _contract = DaoFundingManager(get_contract(CONTRACT_DAO_FUNDING_MANAGER));
    }

    function migrateToNewDao(
        address _newDaoFundingManager,
        address _newDaoContract
    )
        public
        onlyOwner()
    {
        daoStorage().updateForDaoMigration(_newDaoFundingManager, _newDaoContract);
        daoFundingManager().moveFundsToNewDao(_newDaoFundingManager);
    }

    function setStartOfFirstQuarter(uint256 _start) public if_founder() {
        daoStorage().setStartOfFirstQuarter(_start);
    }

    function submitPreproposal(
        bytes32 _docIpfsHash,
        uint256[] _milestonesDurations,
        uint256[] _milestonesFundings,
        uint256 _finalReward
    )
        public
        if_main_phase()
        if_participant()
        if_valid_milestones(_milestonesDurations.length, _milestonesFundings.length)
        returns (bool _success)
    {
        address _proposer = msg.sender;
        require(identity_storage().is_kyc_approved(_proposer));
        require(daoStorage().addProposal(_docIpfsHash, _proposer, _milestonesDurations, _milestonesFundings, _finalReward));
        _success = true;
    }

    function modifyProposal(
        bytes32 _proposalId,
        bytes32 _docIpfsHash,
        uint256[] _milestonesDurations,
        uint256[] _milestonesFundings,
        uint256 _finalReward
    )
        public
        if_main_phase()
        if_participant()
        if_valid_milestones(_milestonesDurations.length, _milestonesFundings.length)
        returns (bool _success)
    {
        require(daoStorage().readProposalProposer(_proposalId) == msg.sender);
        uint256 _currentState = daoStorage().readProposalState(_proposalId);
        require(_currentState == PROPOSAL_STATE_PREPROPOSAL ||
          _currentState == PROPOSAL_STATE_INITIAL);
        require(identity_storage().is_kyc_approved(msg.sender));
        require(daoStorage().editProposal(_proposalId, _docIpfsHash, _milestonesDurations, _milestonesFundings, _finalReward));
        daoStorage().updateProposalPRL(_proposalId, false);
        _success = true;
    }

    function endorseProposal(bytes32 _proposalId)
        public
        if_main_phase()
        if_badge_participant()
        returns (bool _success)
    {
        address _endorser = msg.sender;

        // proposal must be a preproposal
        require(daoStorage().readProposalState(_proposalId) == PROPOSAL_STATE_PREPROPOSAL);

        // update storage layer
        require(daoStorage().updateProposalEndorse(_proposalId, _endorser));
        _success = true;
    }

    function updatePRL(bytes32 _proposalId, bool _valid)
        public
        if_prl()
        returns (bool _success)
    {
        daoStorage().updateProposalPRL(_proposalId, _valid);
        _success = true;
    }

    function createSpecialProposal(
      bytes32 _doc,
      uint256[] _uintConfigs,
      address[] _addressConfigs,
      bytes32[] _bytesConfigs
    )
      public
      if_founder()
      if_main_phase()
      returns (bool _success)
    {
      require(getTimeFromNextLockingPhase(now) > get_uint_config(SPECIAL_PROPOSAL_PHASE_TOTAL));
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
}
