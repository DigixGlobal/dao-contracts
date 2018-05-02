pragma solidity ^0.4.19;
import "./common/DaoCommon.sol";

contract DaoFundingManager is DaoCommon {

    function DaoFundingManager(address _resolver) public {
      require(init(CONTRACT_DAO_FUNDING_MANAGER, _resolver));
    }

  function claimFunding(uint256 _proposal_id, uint256 _milestone_id)
           public
  {
    //check ....

  }

  function () payable public {}
  // receive ETH from the Crowdsale contract

}
