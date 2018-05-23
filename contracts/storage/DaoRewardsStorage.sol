pragma solidity ^0.4.19;

import "@digix/cacp-contracts-dao/contracts/ResolverClient.sol";
import "../common/DaoConstants.sol";
import "../lib/DaoStructs.sol";

// this contract will receive DGXs fees from the DGX fees distributors
contract DaoRewardsStorage is ResolverClient, DaoConstants {

    using DaoStructs for DaoStructs.DaoQuarterInfo;

    mapping(uint256 => DaoStructs.DaoQuarterInfo) public allQuartersInfo;
    mapping(address => uint256) public claimableDGXs;
    uint256 public totalDGXsClaimed;

    mapping (address => uint256) public lastParticipatedQuarter;
    mapping (address => uint256) public lastQuarterThatRewardsWasUpdated;

    function DaoRewardsStorage(address _resolver)
           public
    {
        require(init(CONTRACT_DAO_REWARDS_STORAGE, _resolver));
    }

    function updateQuarterInfo(
        uint256 _quarterIndex,
        uint256 _minimalParticipationPoint,
        uint256 _quarterPointScalingFactor,
        uint256 _reputationPointScalingFactor,
        uint256 _totalEffectiveDGD,
        uint256 _dgxDistributionDay,
        uint256 _dgxRewardsPool,
        uint256 _sumRewardsFromBeginning
    )
        if_sender_is(CONTRACT_DAO_REWARDS_MANAGER)
        public
    {
        allQuartersInfo[_quarterIndex].minimalParticipationPoint = _minimalParticipationPoint;
        allQuartersInfo[_quarterIndex].quarterPointScalingFactor = _quarterPointScalingFactor;
        allQuartersInfo[_quarterIndex].reputationPointScalingFactor = _reputationPointScalingFactor;
        allQuartersInfo[_quarterIndex].totalEffectiveDGD = _totalEffectiveDGD;
        allQuartersInfo[_quarterIndex].dgxDistributionDay = _dgxDistributionDay;
        allQuartersInfo[_quarterIndex].dgxRewardsPool = _dgxRewardsPool;
        allQuartersInfo[_quarterIndex].sumRewardsFromBeginning = _sumRewardsFromBeginning;
    }

    function updateReputationPointAtQuarter(
        address _user,
        uint256 _quarterIndex,
        uint256 _reputationPoint
    )
        if_sender_is(CONTRACT_DAO_REWARDS_MANAGER)
        public
    {
        allQuartersInfo[_quarterIndex].reputationPoint[_user] = _reputationPoint;
    }

    function updateClaimableDGX(address _user, uint256 _newClaimableDGX)
        if_sender_is(CONTRACT_DAO_REWARDS_MANAGER)
        public
    {
        claimableDGXs[_user] = _newClaimableDGX;
    }

    function updateLastParticipatedQuarter(address _user, uint256 _lastQuarter)
        if_sender_is(CONTRACT_DAO_STAKE_LOCKING)
        public
    {
        lastParticipatedQuarter[_user] = _lastQuarter;
    }

    function updateLastQuarterThatRewardsWasUpdated(address _user, uint256 _lastQuarter)
        if_sender_is(CONTRACT_DAO_REWARDS_MANAGER)
        public
    {
        lastQuarterThatRewardsWasUpdated[_user] = _lastQuarter;
    }

    function readQuarterInfo(uint256 _quarterIndex)
        public
        constant
        returns (
            uint256 _minimalParticipationPoint,
            uint256 _quarterPointScalingFactor,
            uint256 _reputationPointScalingFactor,
            uint256 _totalEffectiveDGD,
            uint256 _dgxDistributionDay,
            uint256 _dgxRewardsPool,
            uint256 _sumRewardsFromBeginning
        )
    {
        _minimalParticipationPoint = allQuartersInfo[_quarterIndex].minimalParticipationPoint;
        _quarterPointScalingFactor = allQuartersInfo[_quarterIndex].quarterPointScalingFactor;
        _reputationPointScalingFactor = allQuartersInfo[_quarterIndex].reputationPointScalingFactor;
        _totalEffectiveDGD = allQuartersInfo[_quarterIndex].totalEffectiveDGD;
        _dgxDistributionDay = allQuartersInfo[_quarterIndex].dgxDistributionDay;
        _dgxRewardsPool = allQuartersInfo[_quarterIndex].dgxRewardsPool;
        _sumRewardsFromBeginning = allQuartersInfo[_quarterIndex].sumRewardsFromBeginning;
    }

    function readReputationPointAtQuarter(address _user, uint256 _quarterIndex)
        public
        constant
        returns (uint256 _reputationPoint)
    {
        _reputationPoint = allQuartersInfo[_quarterIndex].reputationPoint[_user];
    }

}
