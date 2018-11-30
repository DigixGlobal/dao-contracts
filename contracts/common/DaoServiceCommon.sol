pragma solidity ^0.4.25;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "./../common/DaoConstants.sol";
import "./../storage/DaoConfigsStorage.sol";
import "./../storage/DaoStakeStorage.sol";
import "./../storage/DaoStorage.sol";


contract DaoServiceCommon is DaoConstants, ResolverClient {

    function daoConfigsStorage()
        internal
        view
        returns (DaoConfigsStorage _contract)
    {
        _contract = DaoConfigsStorage(get_contract(CONTRACT_STORAGE_DAO_CONFIG));
    }

    function daoStakeStorage()
        internal
        view
        returns (DaoStakeStorage _contract)
    {
        _contract = DaoStakeStorage(get_contract(CONTRACT_STORAGE_DAO_STAKE));
    }

    function daoStorage()
        internal
        view
        returns (DaoStorage _contract)
    {
        _contract = DaoStorage(get_contract(CONTRACT_STORAGE_DAO));
    }
}
