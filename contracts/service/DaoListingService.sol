pragma solidity ^0.4.25;

/* import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol"; */
import "@digix/solidity-collections/contracts/abstract/AddressIteratorInteractive.sol";
import "@digix/solidity-collections/contracts/abstract/BytesIteratorInteractive.sol";
import "@digix/solidity-collections/contracts/abstract/IndexedBytesIteratorInteractive.sol";
import "./../storage/DaoStorage.sol";
import "./../storage/DaoStakeStorage.sol";
import "./../common/DaoWhitelistingCommon.sol";


/**
@title Contract to list various storage states from DigixDAO
@author Digix Holdings
*/
contract DaoListingService is
    AddressIteratorInteractive,
    BytesIteratorInteractive,
    IndexedBytesIteratorInteractive,
    DaoWhitelistingCommon
{

    /**
    @notice Constructor
    @param _resolver address of contract resolver
    */
    constructor(address _resolver) public {
        require(init(CONTRACT_SERVICE_DAO_LISTING, _resolver));
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

    /**
    @notice function to list moderators
    @dev note that this list may include some additional entries that are
         not moderators in the current quarter. This may happen if they
         were moderators in the previous quarter, but have not confirmed
         their participation in the current quarter. For a single address,
         a better way to know if moderator or not is:
         Dao.isModerator(_user)
    @param _count number of addresses to list
    @param _from_start boolean, whether to list from start or end
    @return {
      "_moderators": "list of moderator addresses"
    }
    */
    function listModerators(uint256 _count, bool _from_start)
        public
        view
        returns (address[] _moderators)
    {
        _moderators = list_addresses(
            _count,
            daoStakeStorage().readFirstModerator,
            daoStakeStorage().readLastModerator,
            daoStakeStorage().readNextModerator,
            daoStakeStorage().readPreviousModerator,
            _from_start
        );
    }

    /**
    @notice function to list moderators from a particular moderator
    @dev note that this list may include some additional entries that are
         not moderators in the current quarter. This may happen if they
         were moderators in the previous quarter, but have not confirmed
         their participation in the current quarter. For a single address,
         a better way to know if moderator or not is:
         Dao.isModerator(_user)

         Another note: this function will start listing AFTER the _currentModerator
         For example: we have [address1, address2, address3, address4]. listModeratorsFrom(address1, 2, true) = [address2, address3]
    @param _currentModerator start the list after this moderator address
    @param _count number of addresses to list
    @param _from_start boolean, whether to list from start or end
    @return {
      "_moderators": "list of moderator addresses"
    }
    */
    function listModeratorsFrom(
        address _currentModerator,
        uint256 _count,
        bool _from_start
    )
        public
        view
        returns (address[] _moderators)
    {
        _moderators = list_addresses_from(
            _currentModerator,
            _count,
            daoStakeStorage().readFirstModerator,
            daoStakeStorage().readLastModerator,
            daoStakeStorage().readNextModerator,
            daoStakeStorage().readPreviousModerator,
            _from_start
        );
    }

    /**
    @notice function to list participants
    @dev note that this list may include some additional entries that are
         not participants in the current quarter. This may happen if they
         were participants in the previous quarter, but have not confirmed
         their participation in the current quarter. For a single address,
         a better way to know if participant or not is:
         Dao.isParticipant(_user)
    @param _count number of addresses to list
    @param _from_start boolean, whether to list from start or end
    @return {
      "_participants": "list of participant addresses"
    }
    */
    function listParticipants(uint256 _count, bool _from_start)
        public
        view
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

    /**
    @notice function to list participants from a particular participant
    @dev note that this list may include some additional entries that are
         not participants in the current quarter. This may happen if they
         were participants in the previous quarter, but have not confirmed
         their participation in the current quarter. For a single address,
         a better way to know if participant or not is:
         contracts.dao.isParticipant(_user)

         Another note: this function will start listing AFTER the _currentParticipant
         For example: we have [address1, address2, address3, address4]. listParticipantsFrom(address1, 2, true) = [address2, address3]
    @param _currentParticipant list from AFTER this participant address
    @param _count number of addresses to list
    @param _from_start boolean, whether to list from start or end
    @return {
      "_participants": "list of participant addresses"
    }
    */
    function listParticipantsFrom(
        address _currentParticipant,
        uint256 _count,
        bool _from_start
    )
        public
        view
        returns (address[] _participants)
    {
        _participants = list_addresses_from(
            _currentParticipant,
            _count,
            daoStakeStorage().readFirstParticipant,
            daoStakeStorage().readLastParticipant,
            daoStakeStorage().readNextParticipant,
            daoStakeStorage().readPreviousParticipant,
            _from_start
        );
    }

    /**
    @notice function to list _count no. of proposals
    @param _count number of proposals to list
    @param _from_start boolean value, true if count from start, false if count from end
    @return {
      "_proposals": "the list of proposal IDs"
    }
    */
    function listProposals(
        uint256 _count,
        bool _from_start
    )
        public
        view
        returns (bytes32[] _proposals)
    {
        _proposals = list_bytesarray(
            _count,
            daoStorage().getFirstProposal,
            daoStorage().getLastProposal,
            daoStorage().getNextProposal,
            daoStorage().getPreviousProposal,
            _from_start
        );
    }

    /**
    @notice function to list _count no. of proposals from AFTER _currentProposal
    @param _currentProposal ID of proposal to list proposals from
    @param _count number of proposals to list
    @param _from_start boolean value, true if count forwards, false if count backwards
    @return {
      "_proposals": "the list of proposal IDs"
    }
    */
    function listProposalsFrom(
        bytes32 _currentProposal,
        uint256 _count,
        bool _from_start
    )
        public
        view
        returns (bytes32[] _proposals)
    {
        _proposals = list_bytesarray_from(
            _currentProposal,
            _count,
            daoStorage().getFirstProposal,
            daoStorage().getLastProposal,
            daoStorage().getNextProposal,
            daoStorage().getPreviousProposal,
            _from_start
        );
    }

    /**
    @notice function to list _count no. of proposals in state _stateId
    @param _stateId state of proposal
    @param _count number of proposals to list
    @param _from_start boolean value, true if count from start, false if count from end
    @return {
      "_proposals": "the list of proposal IDs"
    }
    */
    function listProposalsInState(
        bytes32 _stateId,
        uint256 _count,
        bool _from_start
    )
        public
        view
        returns (bytes32[] _proposals)
    {
        require(isWhitelisted(msg.sender));
        _proposals = list_indexed_bytesarray(
            _stateId,
            _count,
            daoStorage().getFirstProposalInState,
            daoStorage().getLastProposalInState,
            daoStorage().getNextProposalInState,
            daoStorage().getPreviousProposalInState,
            _from_start
        );
    }

    /**
    @notice function to list _count no. of proposals in state _stateId from AFTER _currentProposal
    @param _stateId state of proposal
    @param _currentProposal ID of proposal to list proposals from
    @param _count number of proposals to list
    @param _from_start boolean value, true if count forwards, false if count backwards
    @return {
      "_proposals": "the list of proposal IDs"
    }
    */
    function listProposalsInStateFrom(
        bytes32 _stateId,
        bytes32 _currentProposal,
        uint256 _count,
        bool _from_start
    )
        public
        view
        returns (bytes32[] _proposals)
    {
        require(isWhitelisted(msg.sender));
        _proposals = list_indexed_bytesarray_from(
            _stateId,
            _currentProposal,
            _count,
            daoStorage().getFirstProposalInState,
            daoStorage().getLastProposalInState,
            daoStorage().getNextProposalInState,
            daoStorage().getPreviousProposalInState,
            _from_start
        );
    }

    /**
    @notice function to list proposal versions
    @param _proposalId ID of the proposal
    @param _count number of proposal versions to list
    @param _from_start boolean, true to list from start, false to list from end
    @return {
      "_versions": "list of proposal versions"
    }
    */
    function listProposalVersions(
        bytes32 _proposalId,
        uint256 _count,
        bool _from_start
    )
        public
        view
        returns (bytes32[] _versions)
    {
        _versions = list_indexed_bytesarray(
            _proposalId,
            _count,
            daoStorage().getFirstProposalVersion,
            daoStorage().getLastProposalVersion,
            daoStorage().getNextProposalVersion,
            daoStorage().getPreviousProposalVersion,
            _from_start
        );
    }

    /**
    @notice function to list proposal versions from AFTER a particular version
    @param _proposalId ID of the proposal
    @param _currentVersion version to list _count versions from
    @param _count number of proposal versions to list
    @param _from_start boolean, true to list from start, false to list from end
    @return {
      "_versions": "list of proposal versions"
    }
    */
    function listProposalVersionsFrom(
        bytes32 _proposalId,
        bytes32 _currentVersion,
        uint256 _count,
        bool _from_start
    )
        public
        view
        returns (bytes32[] _versions)
    {
        _versions = list_indexed_bytesarray_from(
            _proposalId,
            _currentVersion,
            _count,
            daoStorage().getFirstProposalVersion,
            daoStorage().getLastProposalVersion,
            daoStorage().getNextProposalVersion,
            daoStorage().getPreviousProposalVersion,
            _from_start
        );
    }
}
