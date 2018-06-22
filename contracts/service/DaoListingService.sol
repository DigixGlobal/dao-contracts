pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "@digix/solidity-collections/contracts/abstract/AddressIteratorInteractive.sol";
import "./../storage/DaoStorage.sol";
import "./../storage/DaoStakeStorage.sol";
import "./../common/DaoConstants.sol";

contract DaoListingService is ResolverClient, DaoConstants, AddressIteratorInteractive {
    function DaoListingService(address _resolver) public {
        require(init(CONTRACT_SERVICE_DAO_LISTING, _resolver));
    }

    function daoStakeStorage()
      internal
      constant
      returns (DaoStakeStorage _contract)
    {
      _contract = DaoStakeStorage(get_contract(CONTRACT_STORAGE_DAO_STAKE));
    }

    function listModerators(uint256 _count, bool _from_start)
        public
        constant
        returns (address[] _badgeParticipants)
    {
        _badgeParticipants = list_addresses(
            _count,
            daoStakeStorage().readFirstModerator,
            daoStakeStorage().readLastModerator,
            daoStakeStorage().readNextModerator,
            daoStakeStorage().readPreviousModerator,
            _from_start
        );
    }

    function listParticipants(uint256 _count, bool _from_start)
        public
        constant
        returns (address[] _participants)
    {
        _participants = list_addresses(
            _count,
            daoStakeStorage().readFirstParticipant,
            daoStakeStorage().readLastParticipant,
            daoStakeStorage().readNextParticipant,
            daoStakeStorage().readPreviousParticipant,
            _from_start
        );
    }
}
