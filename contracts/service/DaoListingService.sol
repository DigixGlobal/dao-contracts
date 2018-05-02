pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "@digix/solidity-collections/contracts/abstract/AddressIteratorInteractive.sol";
import "./../storage/DaoStorage.sol";
import "./../storage/DaoStakeStorage.sol";
import "./../common/DaoConstants.sol";

contract DaoListingService is ResolverClient, DaoConstants, AddressIteratorInteractive {
    function DaoListingService(address _resolver) public {
        require(init(CONTRACT_DAO_LISTING_SERVICE, _resolver));
    }

    function daoStakeStorage()
      internal
      constant
      returns (DaoStakeStorage _contract)
    {
      _contract = DaoStakeStorage(get_contract(CONTRACT_DAO_STAKE_STORAGE));
    }

    function listBadgeParticipants(uint256 _count, bool _from_start)
        public
        constant
        returns (address[] _badgeParticipants)
    {
        _badgeParticipants = list_addresses(
            _count,
            daoStakeStorage().readFirstBadgeParticipant,
            daoStakeStorage().readLastBadgeParticipant,
            daoStakeStorage().readNextBadgeParticipant,
            daoStakeStorage().readPreviousBadgeParticipant,
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
