pragma solidity ^0.4.25;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";
import "../lib/DaoStructs.sol";

// this contract will receive DGXs fees from the DGX fees distributors
contract DaoRewardsStorage is ResolverClient, DaoConstants {
    using DaoStructs for DaoStructs.DaoQuarterInfo;

    // DaoQuarterInfo is a struct that stores the quarter specific information
    // regarding totalEffectiveDGDs, DGX distribution day, etc. pls check
    // docs in lib/DaoStructs
    mapping(uint256 => DaoStructs.DaoQuarterInfo) public allQuartersInfo;

    // Mapping that stores the DGX that can be claimed as rewards by
    // an address (a participant of DigixDAO)
    mapping(address => uint256) public claimableDGXs;

    // This stores the total DGX value that has been claimed by participants
    // this can be done by calling the DaoRewardsManager.claimRewards method
    // Note that this value is the only outgoing DGX from DaoRewardsManager contract
    // Note that this value also takes into account the demurrage that has been paid
    // by participants for simply holding their DGXs in the DaoRewardsManager contract
    uint256 public totalDGXsClaimed;

    // The Quarter ID in which the user last participated in
    // To participate means they had locked more than CONFIG_MINIMUM_LOCKED_DGD
    // DGD tokens. In addition, they should not have withdrawn those tokens in the same
    // quarter. Basically, in the main phase of the quarter, if DaoCommon.isParticipant(_user)
    // was true, they were participants. And that quarter was their lastParticipatedQuarter
    mapping (address => uint256) public lastParticipatedQuarter;

    // This mapping is only used to update the lastParticipatedQuarter to the
    // previousLastParticipatedQuarter in case users lock and withdraw DGDs
    // within the same quarter's locking phase
    mapping (address => uint256) public previousLastParticipatedQuarter;

    // This number marks the Quarter in which the rewards were last updated for that user
    // Since the rewards calculation for a specific quarter is only done once that
    // quarter is completed, we need this value to note the last quarter when the rewards were updated
    // We then start adding the rewards for all quarters after that quarter, until the current quarter
    mapping (address => uint256) public lastQuarterThatRewardsWasUpdated;

    // Similar as the lastQuarterThatRewardsWasUpdated, but this is for reputation updates
    // Note that reputation can also be deducted for no participation (not locking DGDs)
    // This value is used to update the reputation based on all quarters from the lastQuarterThatReputationWasUpdated
    // to the current quarter
    mapping (address => uint256) public lastQuarterThatReputationWasUpdated;

    constructor(address _resolver)
           public
    {
        require(init(CONTRACT_STORAGE_DAO_REWARDS, _resolver));
    }

    function updateQuarterInfo(
        uint256 _quarterNumber,
        uint256 _minimalParticipationPoint,
        uint256 _quarterPointScalingFactor,
        uint256 _reputationPointScalingFactor,
        uint256 _totalEffectiveDGDPreviousQuarter,

        uint256 _moderatorMinimalQuarterPoint,
        uint256 _moderatorQuarterPointScalingFactor,
        uint256 _moderatorReputationPointScalingFactor,
        uint256 _totalEffectiveModeratorDGDLastQuarter,

        uint256 _dgxDistributionDay,
        uint256 _dgxRewardsPoolLastQuarter,
        uint256 _sumRewardsFromBeginning
    )
        public
    {
        require(sender_is(CONTRACT_DAO_REWARDS_MANAGER));
        allQuartersInfo[_quarterNumber].minimalParticipationPoint = _minimalParticipationPoint;
        allQuartersInfo[_quarterNumber].quarterPointScalingFactor = _quarterPointScalingFactor;
        allQuartersInfo[_quarterNumber].reputationPointScalingFactor = _reputationPointScalingFactor;
        allQuartersInfo[_quarterNumber].totalEffectiveDGDPreviousQuarter = _totalEffectiveDGDPreviousQuarter;

        allQuartersInfo[_quarterNumber].moderatorMinimalParticipationPoint = _moderatorMinimalQuarterPoint;
        allQuartersInfo[_quarterNumber].moderatorQuarterPointScalingFactor = _moderatorQuarterPointScalingFactor;
        allQuartersInfo[_quarterNumber].moderatorReputationPointScalingFactor = _moderatorReputationPointScalingFactor;
        allQuartersInfo[_quarterNumber].totalEffectiveModeratorDGDLastQuarter = _totalEffectiveModeratorDGDLastQuarter;

        allQuartersInfo[_quarterNumber].dgxDistributionDay = _dgxDistributionDay;
        allQuartersInfo[_quarterNumber].dgxRewardsPoolLastQuarter = _dgxRewardsPoolLastQuarter;
        allQuartersInfo[_quarterNumber].sumRewardsFromBeginning = _sumRewardsFromBeginning;
    }

    function updateClaimableDGX(address _user, uint256 _newClaimableDGX)
        public
    {
        require(sender_is(CONTRACT_DAO_REWARDS_MANAGER));
        claimableDGXs[_user] = _newClaimableDGX;
    }

    function updateLastParticipatedQuarter(address _user, uint256 _lastQuarter)
        public
    {
        require(sender_is(CONTRACT_DAO_STAKE_LOCKING));
        lastParticipatedQuarter[_user] = _lastQuarter;
    }

    function updatePreviousLastParticipatedQuarter(address _user, uint256 _lastQuarter)
        public
    {
        require(sender_is(CONTRACT_DAO_STAKE_LOCKING));
        previousLastParticipatedQuarter[_user] = _lastQuarter;
    }

    function updateLastQuarterThatRewardsWasUpdated(address _user, uint256 _lastQuarter)
        public
    {
        require(sender_is_from([CONTRACT_DAO_REWARDS_MANAGER, CONTRACT_DAO_STAKE_LOCKING, EMPTY_BYTES]));
        lastQuarterThatRewardsWasUpdated[_user] = _lastQuarter;
    }

    function updateLastQuarterThatReputationWasUpdated(address _user, uint256 _lastQuarter)
        public
    {
        require(sender_is_from([CONTRACT_DAO_REWARDS_MANAGER, CONTRACT_DAO_STAKE_LOCKING, EMPTY_BYTES]));
        lastQuarterThatReputationWasUpdated[_user] = _lastQuarter;
    }

    function addToTotalDgxClaimed(uint256 _dgxClaimed)
        public
    {
        require(sender_is(CONTRACT_DAO_REWARDS_MANAGER));
        totalDGXsClaimed = totalDGXsClaimed.add(_dgxClaimed);
    }

    function readQuarterInfo(uint256 _quarterNumber)
        public
        view
        returns (
            uint256 _minimalParticipationPoint,
            uint256 _quarterPointScalingFactor,
            uint256 _reputationPointScalingFactor,
            uint256 _totalEffectiveDGDPreviousQuarter,

            uint256 _moderatorMinimalQuarterPoint,
            uint256 _moderatorQuarterPointScalingFactor,
            uint256 _moderatorReputationPointScalingFactor,
            uint256 _totalEffectiveModeratorDGDLastQuarter,

            uint256 _dgxDistributionDay,
            uint256 _dgxRewardsPoolLastQuarter,
            uint256 _sumRewardsFromBeginning
        )
    {
        _minimalParticipationPoint = allQuartersInfo[_quarterNumber].minimalParticipationPoint;
        _quarterPointScalingFactor = allQuartersInfo[_quarterNumber].quarterPointScalingFactor;
        _reputationPointScalingFactor = allQuartersInfo[_quarterNumber].reputationPointScalingFactor;
        _totalEffectiveDGDPreviousQuarter = allQuartersInfo[_quarterNumber].totalEffectiveDGDPreviousQuarter;
        _moderatorMinimalQuarterPoint = allQuartersInfo[_quarterNumber].moderatorMinimalParticipationPoint;
        _moderatorQuarterPointScalingFactor = allQuartersInfo[_quarterNumber].moderatorQuarterPointScalingFactor;
        _moderatorReputationPointScalingFactor = allQuartersInfo[_quarterNumber].moderatorReputationPointScalingFactor;
        _totalEffectiveModeratorDGDLastQuarter = allQuartersInfo[_quarterNumber].totalEffectiveModeratorDGDLastQuarter;
        _dgxDistributionDay = allQuartersInfo[_quarterNumber].dgxDistributionDay;
        _dgxRewardsPoolLastQuarter = allQuartersInfo[_quarterNumber].dgxRewardsPoolLastQuarter;
        _sumRewardsFromBeginning = allQuartersInfo[_quarterNumber].sumRewardsFromBeginning;
    }

    function readQuarterGeneralInfo(uint256 _quarterNumber)
        public
        view
        returns (
            uint256 _dgxDistributionDay,
            uint256 _dgxRewardsPoolLastQuarter,
            uint256 _sumRewardsFromBeginning
        )
    {
        _dgxDistributionDay = allQuartersInfo[_quarterNumber].dgxDistributionDay;
        _dgxRewardsPoolLastQuarter = allQuartersInfo[_quarterNumber].dgxRewardsPoolLastQuarter;
        _sumRewardsFromBeginning = allQuartersInfo[_quarterNumber].sumRewardsFromBeginning;
    }

    function readQuarterModeratorInfo(uint256 _quarterNumber)
        public
        view
        returns (
            uint256 _moderatorMinimalQuarterPoint,
            uint256 _moderatorQuarterPointScalingFactor,
            uint256 _moderatorReputationPointScalingFactor,
            uint256 _totalEffectiveModeratorDGDLastQuarter
        )
    {
        _moderatorMinimalQuarterPoint = allQuartersInfo[_quarterNumber].moderatorMinimalParticipationPoint;
        _moderatorQuarterPointScalingFactor = allQuartersInfo[_quarterNumber].moderatorQuarterPointScalingFactor;
        _moderatorReputationPointScalingFactor = allQuartersInfo[_quarterNumber].moderatorReputationPointScalingFactor;
        _totalEffectiveModeratorDGDLastQuarter = allQuartersInfo[_quarterNumber].totalEffectiveModeratorDGDLastQuarter;
    }

    function readQuarterParticipantInfo(uint256 _quarterNumber)
        public
        view
        returns (
            uint256 _minimalParticipationPoint,
            uint256 _quarterPointScalingFactor,
            uint256 _reputationPointScalingFactor,
            uint256 _totalEffectiveDGDPreviousQuarter
        )
    {
        _minimalParticipationPoint = allQuartersInfo[_quarterNumber].minimalParticipationPoint;
        _quarterPointScalingFactor = allQuartersInfo[_quarterNumber].quarterPointScalingFactor;
        _reputationPointScalingFactor = allQuartersInfo[_quarterNumber].reputationPointScalingFactor;
        _totalEffectiveDGDPreviousQuarter = allQuartersInfo[_quarterNumber].totalEffectiveDGDPreviousQuarter;
    }

    function readDgxDistributionDay(uint256 _quarterNumber)
        public
        view
        returns (uint256 _distributionDay)
    {
        _distributionDay = allQuartersInfo[_quarterNumber].dgxDistributionDay;
    }

    function readTotalEffectiveDGDLastQuarter(uint256 _quarterNumber)
        public
        view
        returns (uint256 _totalEffectiveDGDPreviousQuarter)
    {
        _totalEffectiveDGDPreviousQuarter = allQuartersInfo[_quarterNumber].totalEffectiveDGDPreviousQuarter;
    }

    function readTotalEffectiveModeratorDGDLastQuarter(uint256 _quarterNumber)
        public
        view
        returns (uint256 _totalEffectiveModeratorDGDLastQuarter)
    {
        _totalEffectiveModeratorDGDLastQuarter = allQuartersInfo[_quarterNumber].totalEffectiveModeratorDGDLastQuarter;
    }

    function readRewardsPoolOfLastQuarter(uint256 _quarterNumber)
        public
        view
        returns (uint256 _rewardsPool)
    {
        _rewardsPool = allQuartersInfo[_quarterNumber].dgxRewardsPoolLastQuarter;
    }
}
