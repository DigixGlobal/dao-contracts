pragma solidity ^0.4.25;

import "../../storage/DaoStorage.sol";
import "../../common/DaoConstants.sol";


contract MockConstructorMethod is DaoConstants {

    // attempt to read a restricted read function from a non-whitelisted contract's constructor
    constructor(address daoStorageAddress) public {
        DaoStorage daoStorage = DaoStorage(daoStorageAddress);
        daoStorage.getFirstProposalInState(PROPOSAL_STATE_PREPROPOSAL);
    }
}
